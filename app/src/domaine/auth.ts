import { z } from 'zod';

/** Messages d'erreur Firebase, en français.
 *
 *  Un code brut comme `auth/invalid-credential` ne dit rien à personne et
 *  fait croire à une panne. Chaque message ici dit ce qui s'est passé ET ce
 *  qu'il faut faire. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Cet email n’a pas l’air valide.',
  'auth/user-not-found': 'Aucun compte avec cet email.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/email-already-in-use': 'Cet email a déjà un compte — connecte-toi.',
  'auth/weak-password': 'Mot de passe trop court : 6 caractères minimum.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Problème réseau. Vérifie ta connexion.',
  'auth/popup-blocked': 'Ton navigateur a bloqué la fenêtre Google. Autorise les popups pour ce site.',
  'auth/popup-closed-by-user': 'Fenêtre Google fermée avant la fin.',
  'auth/unauthorized-domain':
    'Ce domaine n’est pas autorisé côté Firebase (Authentication → Settings → Domaines autorisés).',
};

export function messageErreur(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  // On ne montre JAMAIS un code brut : il inquiète sans informer.
  return 'Quelque chose s’est mal passé. Réessaie.';
}

export const ConnexionSchema = z.object({
  email: z.string().trim().min(1, 'Ton email').email('Cet email n’a pas l’air valide'),
  motDePasse: z.string().min(1, 'Ton mot de passe'),
});
export type Connexion = z.infer<typeof ConnexionSchema>;

export const MDP_MIN = 6;

export const InscriptionSchema = z
  .object({
    pseudo: z
      .string()
      .trim()
      .min(2, 'Au moins 2 caractères')
      .max(20, '20 caractères maximum')
      // Le pseudo s'affiche partout : sur les cartes, le classement, le chat.
      // On refuse ce qui casserait une mise en page ou ressemblerait à du code.
      .regex(/^[\p{L}\p{N} '’_-]+$/u, 'Lettres, chiffres, espaces et tirets seulement'),
    email: z.string().trim().min(1, 'Ton email').email('Cet email n’a pas l’air valide'),
    motDePasse: z.string().min(MDP_MIN, `${MDP_MIN} caractères minimum`),
    codePostal: z
      .string()
      .trim()
      .regex(/^\d{5}$/, 'Cinq chiffres')
      .optional()
      .or(z.literal('')),
  })
  // Un pseudo identique au mot de passe le rend public : il s'affiche sur
  // chaque carte de match.
  .refine((v) => v.pseudo.toLowerCase() !== v.motDePasse.toLowerCase(), {
    message: 'Ton pseudo ne doit pas être ton mot de passe',
    path: ['motDePasse'],
  });
export type Inscription = z.infer<typeof InscriptionSchema>;

/** Le profil créé à l'inscription. Volontairement MINIMAL : la carte joueur
 *  (poste, atouts, club) se complète après, depuis l'écran Profil. Demander
 *  douze champs avant d'avoir montré quoi que ce soit fait fuir.
 *
 *  Aucun champ de jeu n'est initialisé ici à une valeur que le client
 *  choisirait : xp et badges partent à zéro et ne sont plus jamais touchés
 *  par le client — les règles Firestore les lui refusent ensuite. */
export function profilInitial(email: string, pseudo: string, codePostal?: string) {
  return {
    email,
    pseudo,
    posteFavori: 'milieu',
    atouts: { vitesse: 70, dribble: 70, frappe: 70, defense: 70, physique: 70 },
    codePostal: codePostal || null,
    xp: 0,
    badges: [] as string[],
    stats: { matchsJoues: 0, victoires: 0, hommeDuMatch: 0 },
    profilComplet: false,
  };
}
