import { peutTerminer } from './fin';
import { maxJoueurs, versDate } from './match';
import type { Match } from './schemas';

/** GARDE-FOUS DE FIN DE MATCH — le miroir de ceux du serveur.
 *
 *  C'est `gainsFinDeMatch` (functions/index.js) qui décide si un match paie :
 *  il refuse un match terminé avant son coup d'envoi, un match antidaté, un
 *  match joué à trop peu, et plafonne les gains d'un joueur sur 24 h. Le
 *  client ne décide rien ; il PRÉVIENT, avec les mêmes seuils, pour que le
 *  créateur ne termine pas un match qui ne rapportera rien sans le savoir.
 *
 *  Ces constantes sont recopiées du serveur. Un test (`garde.test.ts`) lit
 *  `functions/index.js` et échoue si les deux divergent. */
export const GARDE = { presentsMin: 4, parJour: 3 } as const;

/** Pourquoi le serveur a refusé de payer — écrit par lui dans `_xp.refus`. */
export type RefusXp = 'date' | 'avance' | 'antidate' | 'effectif';

export const EXPLICATION_REFUS: Record<RefusXp, string> = {
  date: 'le match n’avait pas de date confirmée',
  avance: 'il a été terminé avant son coup d’envoi',
  antidate: 'il a été créé après la date où il était censé se jouer',
  effectif: 'il y avait trop peu de présents',
};

export function presentsMin(m: Pick<Match, 'joueursMax'>): number {
  return Math.min(maxJoueurs(m), GARDE.presentsMin);
}

/** Le coup d'envoi du match confirmé, ou `null` s'il n'est pas connu.
 *
 *  `confirmer()` écrit dans `dateFinale` l'INSTANT du créneau retenu — jour
 *  et heure. Le serveur le lit tel quel (`matchWhen`, branche Timestamp) :
 *  « avant le coup d'envoi » veut donc dire la même chose des deux côtés. */
export function coupDEnvoi(m: Pick<Match, 'dateFinale'>): Date | null {
  return versDate(m.dateFinale);
}

export type Terminable =
  | { readonly peut: true }
  | { readonly peut: false; readonly pourquoi: string };

/** Le créateur peut-il terminer ce match MAINTENANT ?
 *
 *  Terminer trop tôt n'est pas une simple erreur : le serveur marque le match
 *  comme clos, refuse de payer, et ne repaiera pas quand l'heure sera venue.
 *  Le bouton reste donc fermé jusqu'au coup d'envoi — en disant pourquoi. */
export function terminableMaintenant(
  m: Pick<Match, 'statut' | 'dateFinale'>,
  maintenant: Date = new Date(),
): Terminable {
  if (!peutTerminer(m)) return { peut: false, pourquoi: 'Seul un match confirmé se termine.' };
  const coup = coupDEnvoi(m);
  if (!coup) return { peut: false, pourquoi: 'Le match n’a pas de date confirmée.' };
  if (maintenant.getTime() < coup.getTime()) {
    return { peut: false, pourquoi: 'Tu pourras saisir le score une fois le coup d’envoi passé.' };
  }
  return { peut: true };
}

/** L'avertissement à montrer AVANT de valider, si le match ne paiera pas
 *  faute de monde. On n'interdit pas : un match à trois s'est peut-être
 *  vraiment joué, et son score mérite d'être gardé. On dit ce que ça coûte. */
export function avertissementEffectif(
  m: Pick<Match, 'joueursMax'>,
  presents: number,
): string | null {
  const min = presentsMin(m);
  if (presents >= min) return null;
  return `${presents} présent${presents > 1 ? 's' : ''} sur ${min} minimum : le score sera gardé, mais ce match ne rapportera ni XP ni statistiques.`;
}
