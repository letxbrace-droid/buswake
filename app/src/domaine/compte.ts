import { z } from 'zod';
import { MDP_MIN } from './auth';

/** Un compte Google n'a pas de mot de passe chez nous : il se gère dans le
 *  compte Google. Proposer le formulaire quand même donnerait un échec
 *  incompréhensible — et c'est une frustration que l'app peut éviter en
 *  regardant simplement quels fournisseurs sont rattachés au compte. */
export function gereSonMotDePasse(fournisseurs: readonly string[]): boolean {
  return fournisseurs.includes('password');
}

export function estCompteGooglePur(fournisseurs: readonly string[]): boolean {
  return fournisseurs.length === 1 && fournisseurs[0] === 'google.com';
}

export const ChangementMdpSchema = z
  .object({
    actuel: z.string().min(1, 'Ton mot de passe actuel'),
    nouveau: z.string().min(MDP_MIN, `${MDP_MIN} caractères minimum`),
    confirmation: z.string().min(1, 'Répète le nouveau mot de passe'),
  })
  .refine((v) => v.nouveau === v.confirmation, {
    message: 'Les deux ne correspondent pas',
    path: ['confirmation'],
  })
  // Changer pour le même mot de passe réussit côté Firebase sans rien faire :
  // l'utilisateur croit avoir changé quelque chose. Autant le dire.
  .refine((v) => v.nouveau !== v.actuel, {
    message: 'Le nouveau est identique à l’ancien',
    path: ['nouveau'],
  });
export type ChangementMdp = z.infer<typeof ChangementMdpSchema>;

/** L'ORDRE DE SUPPRESSION D'UN COMPTE, et pourquoi il compte.
 *
 *  Il faut supprimer le document Firestore AVANT le compte d'authentification :
 *  une fois déconnecté, les règles refusent l'écriture, et le document
 *  resterait orphelin dans la base avec l'XP et le pseudo de quelqu'un qui a
 *  demandé à disparaître.
 *
 *  Mais il faut aussi ne rien supprimer TANT QU'ON N'EST PAS SÛR de pouvoir
 *  aller au bout. La v1 supprimait le document puis tentait `deleteUser` :
 *  si celui-ci réclamait une reconnexion récente et que la ré-authentification
 *  échouait, le compte survivait avec son profil déjà effacé — un joueur
 *  connecté sans profil, sans XP et sans moyen de revenir en arrière.
 *
 *  D'où ces trois étapes, dans cet ordre :
 *    1. se ré-authentifier si nécessaire — c'est la seule étape qui peut
 *       échouer sur une action de l'utilisateur, et elle ne détruit rien ;
 *    2. supprimer le document, tant qu'on en a encore le droit ;
 *    3. supprimer le compte d'authentification.
 */
export const ETAPES_SUPPRESSION = ['reauthentifier', 'document', 'compte'] as const;
export type EtapeSuppression = (typeof ETAPES_SUPPRESSION)[number];
