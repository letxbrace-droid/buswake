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

export const UtilisateurSchema = z.object({
  uid: z.string(),
  pseudo: z.string().default('Joueur'),
  xp: z.number().catch(0),
  badges: z.array(z.string()).default([]),
  codePostal: z.string().default(''),
  domicileLat: z.number().nullish(),
  domicileLon: z.number().nullish(),
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
  const r = MatchSchema.safeParse({ ...(data as object), id });
  return r.success ? r.data : null;
}
