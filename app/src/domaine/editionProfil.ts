import { POSTES, type Atouts } from './joueur';
import { codePostalValide } from './localisation';

/**
 * ÉDITER SA CARTE.
 *
 * Le service `majProfil` existait, et aucun écran ne l'appelait : poste,
 * atouts et code postal étaient figés à l'inscription. C'est aussi ce qui
 * rendait le domicile impossible à corriger à la main.
 *
 * Les bornes viennent des règles Firestore quand elles existent — pseudo de
 * 1 à 24 caractères, différent de l'e-mail — et sont redites ici : un refus
 * de règle arrive après l'envoi et ne dit rien d'utile, un message ici dit
 * quoi corriger avant.
 */

export const PSEUDO_MAX = 24;
export const ATOUT_MIN = 40;
export const ATOUT_MAX = 99;

export interface Edition {
  readonly pseudo: string;
  readonly poste: string;
  readonly atouts: Atouts;
  readonly codePostal: string;
}

export type Probleme = { champ: keyof Edition; message: string };

export function validerEdition(e: Edition, email: string | null): Probleme | null {
  const p = e.pseudo.trim();
  if (p.length < 1) return { champ: 'pseudo', message: 'Choisis un pseudo.' };
  if (p.length > PSEUDO_MAX) return { champ: 'pseudo', message: `${PSEUDO_MAX} caractères au maximum.` };
  // Les règles le refusent : un pseudo égal à l'e-mail l'afficherait dans le
  // classement de tout le monde.
  if (email && p.toLowerCase() === email.trim().toLowerCase()) {
    return { champ: 'pseudo', message: 'Ton pseudo ne peut pas être ton e-mail — il est public.' };
  }
  if (!POSTES.some((x) => x.id === e.poste)) return { champ: 'poste', message: 'Choisis un poste.' };
  if (e.codePostal.trim() && !codePostalValide(e.codePostal)) {
    return { champ: 'codePostal', message: 'Un code postal a cinq chiffres.' };
  }
  return null;
}

export function bornerAtout(v: number): number {
  if (!Number.isFinite(v)) return ATOUT_MIN;
  return Math.min(ATOUT_MAX, Math.max(ATOUT_MIN, Math.round(v)));
}

/**
 * Ce qui a changé, et rien d'autre.
 *
 * Réécrire les champs inchangés ne coûterait rien de visible — mais le
 * profil est écouté en temps réel, et une écriture sans différence relance
 * quand même le rendu de tous les écrans qui le lisent. Et changer le code
 * postal EFFACE l'ancienne position : elle ne correspond plus à rien, et le
 * rattrapage la recalculera.
 */
export function differences(
  avant: Edition,
  apres: Edition,
): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (apres.pseudo.trim() !== avant.pseudo) d.pseudo = apres.pseudo.trim();
  if (apres.poste !== avant.poste) d.posteFavori = apres.poste;
  const atouts = Object.fromEntries(
    (Object.keys(apres.atouts) as (keyof Atouts)[]).map((k) => [k, bornerAtout(apres.atouts[k])]),
  ) as unknown as Atouts;
  if ((Object.keys(atouts) as (keyof Atouts)[]).some((k) => atouts[k] !== avant.atouts[k])) {
    d.atouts = atouts;
  }
  const cp = apres.codePostal.trim();
  if (cp !== avant.codePostal.trim()) {
    d.codePostal = cp || null;
    d.domicileLat = null;
    d.domicileLon = null;
  }
  return d;
}
