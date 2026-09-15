import { z } from 'zod';

/** Schémas Zod des entités Firestore.
 *
 *  Ils ne remplacent PAS les règles de sécurité : Firestore reste la seule
 *  frontière de confiance. Ils servent à deux choses —
 *    1. valider ce qu'on écrit AVANT de partir en réseau (messages d'erreur
 *       utiles, plutôt qu'un refus opaque de la règle) ;
 *    2. ne jamais faire confiance à ce qu'on lit : un document écrit par une
 *       version plus ancienne de l'app peut manquer d'un champ.
 *
 *  Pour la lecture, les schémas sont TOLÉRANTS (champs optionnels, valeurs
 *  par défaut). Pour l'écriture, ils sont STRICTS. Un document illisible doit
 *  disparaître de la liste, jamais faire tomber l'écran.
 */

const horodatage = z.union([z.date(), z.object({ seconds: z.number() }).passthrough()]);

export const StatutMatch = z.enum(['sondage', 'confirmé', 'terminé', 'annulé']);
export type StatutMatch = z.infer<typeof StatutMatch>;

export const CreneauSchema = z.object({
  date: horodatage.nullish(),
  lieu: z.string().default(''),
  votes: z.array(z.string()).default([]),
});

export const MatchSchema = z.object({
  id: z.string(),
  createur: z.string().default(''),
  sport: z.string().default('foot5'),
  statut: StatutMatch.catch('sondage'),
  joueursInscrits: z.array(z.string()).default([]),
  creneauxProposes: z.array(CreneauSchema).default([]),
  dateFinale: horodatage.nullish(),
  lieuFinal: z.string().default(''),
  finVisible: horodatage.nullish(),
  joueursMax: z.number().int().min(2).max(40).catch(10),
});
export type Match = z.infer<typeof MatchSchema>;

export const AtoutsSchema = z.object({
  vitesse: z.number().catch(70),
  dribble: z.number().catch(70),
  frappe: z.number().catch(70),
  defense: z.number().catch(70),
  physique: z.number().catch(70),
});

export const UtilisateurSchema = z.object({
  uid: z.string(),
  pseudo: z.string().default('Joueur'),
  xp: z.number().catch(0),
  badges: z.array(z.string()).default([]),
  codePostal: z.string().nullish().transform((v) => v ?? ''),
  domicileLat: z.number().nullish(),
  domicileLon: z.number().nullish(),
  // Carte joueur. Tous facultatifs : le profil se complète APRÈS
  // l'inscription, depuis l'écran Profil, et un document créé hier peut ne
  // rien en porter.
  posteFavori: z.string().default('milieu'),
  club: z.string().optional(),
  atouts: AtoutsSchema.partial().default({}),
  profilComplet: z.boolean().default(false),
  // Écrites par les Cloud Functions, jamais par le client.
  stats: z
    .object({
      matchsJoues: z.number().catch(0),
      victoires: z.number().catch(0),
      hommeDuMatch: z.number().catch(0),
      presences: z.number().catch(0),
      lapins: z.number().catch(0),
    })
    .partial()
    .default({}),
  streak: z.number().catch(0),
});
export type Utilisateur = z.infer<typeof UtilisateurSchema>;

/** Création d'un match — schéma STRICT, appliqué avant toute écriture.
 *  La borne à 10 créneaux reflète la règle Firestore (creneauxProposes.size()
 *  <= 10) : la refuser ici donne un message clair au lieu d'un rejet serveur. */
export const CreerMatchSchema = z.object({
  sport: z.string().min(1),
  joueursMax: z.number().int().min(2).max(40),
  creneauxProposes: z
    .array(
      z.object({
        date: z.date(),
        lieu: z.string().min(1, 'Indique un lieu'),
      }),
    )
    .min(1, 'Propose au moins un créneau')
    .max(10, 'Dix créneaux au maximum'),
});
export type CreerMatch = z.infer<typeof CreerMatchSchema>;

/** Lit un document Firestore sans jamais jeter : renvoie null s'il est
 *  inexploitable, pour que l'appelant le filtre hors de la liste. */
export function lireMatch(id: string, data: unknown): Match | null {
  // On refuse explicitement ce qui n'est pas un objet. Sans cette borne,
  // étaler `null` donne {} et le schéma le remplit de valeurs par défaut :
  // un document vide devenait un match complet, qui apparaissait dans la
  // liste comme un match fantôme. Idem pour une chaîne, qui s'étale en
  // {0:'p',1:'a',…}.
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const r = MatchSchema.safeParse({ ...data, id });
  return r.success ? r.data : null;
}
