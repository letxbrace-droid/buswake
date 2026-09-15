import type { Match } from './schemas';

/** FIN DE MATCH.
 *
 *  Ce que le client écrit : le score, l'homme du match, et les présences.
 *  Ce qu'il n'écrit PAS : l'XP, les séries, les badges, les statistiques.
 *  La Cloud Function `gainsFinDeMatch` les calcule à partir de `attendance` et
 *  `hommeDuMatchUid` qu'on vient d'écrire sur le match — c'est pour ça que le
 *  créateur n'a plus à distribuer l'XP des autres, et qu'il n'en a plus le
 *  droit : les règles Firestore refusent ces champs à tous les clients. */

export const SCORE_MAX = 99;

export interface Presences {
  [uid: string]: boolean;
}

export interface Resultat {
  readonly scoreA: number;
  readonly scoreB: number;
  readonly hommeDuMatchUid: string | null;
  readonly attendance: Presences;
}

/** Un champ vide donne NaN avec parseInt, et NaN partait tel quel dans le
 *  score enregistré. On borne ET on nettoie. */
export function lireScore(saisie: string | number | null | undefined): number {
  const n = typeof saisie === 'number' ? saisie : parseInt(String(saisie ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(SCORE_MAX, Math.floor(n));
}

export function presencesParDefaut(inscrits: readonly string[]): Presences {
  // Présent par défaut : on demande de signaler les ABSENTS, pas de cocher
  // dix présents. Le cas courant doit être le moins coûteux.
  return Object.fromEntries(inscrits.map((u) => [u, true]));
}

export function basculerPresence(p: Presences, uid: string): Presences {
  return { ...p, [uid]: p[uid] === false };
}

export function bilanPresences(inscrits: readonly string[], p: Presences) {
  const presents = inscrits.filter((u) => p[u] !== false);
  return { presents, absents: inscrits.filter((u) => p[u] === false) };
}

export interface Validation {
  readonly ok: boolean;
  readonly probleme?: string;
}

/** On refuse deux fins de match qui n'ont pas de sens.
 *
 *  1. L'homme du match doit avoir JOUÉ. Élire quelqu'un qu'on vient de
 *     marquer absent lui donnerait 200 XP pour être resté chez lui — et la
 *     Cloud Function les attribuerait sans discuter, puisqu'elle fait
 *     confiance au champ.
 *  2. Un match sans aucun présent n'est pas un match terminé, c'est un match
 *     annulé. Le dire évite de distribuer de l'XP de participation à
 *     personne et de fausser les séries de tout le monde.
 */
export function validerResultat(
  inscrits: readonly string[],
  r: Pick<Resultat, 'hommeDuMatchUid' | 'attendance'>,
): Validation {
  const { presents } = bilanPresences(inscrits, r.attendance);

  if (presents.length === 0) {
    return { ok: false, probleme: 'Personne n’était présent : annule le match plutôt que de le terminer.' };
  }

  if (r.hommeDuMatchUid && !presents.includes(r.hommeDuMatchUid)) {
    return { ok: false, probleme: 'L’homme du match doit avoir joué.' };
  }

  return { ok: true };
}

export function peutTerminer(m: Pick<Match, 'statut'>): boolean {
  // Seul un match confirmé se termine. Terminer un sondage sauterait l'étape
  // où les joueurs se sont engagés.
  return m.statut === 'confirmé';
}
