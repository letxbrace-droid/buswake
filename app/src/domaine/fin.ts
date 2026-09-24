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

/** Buts ou passes décisives, par joueur. Un joueur absent de la table en a
 *  zéro — on ne stocke pas des zéros pour dix personnes. */
export interface Compteurs {
  [uid: string]: number;
}

export interface Resultat {
  readonly scoreA: number;
  readonly scoreB: number;
  readonly hommeDuMatchUid: string | null;
  readonly attendance: Presences;
  readonly buts: Compteurs;
  readonly passes: Compteurs;
}

/** Plafond par joueur. Neuf buts dans un match à cinq, c'est déjà une
 *  soirée ; au-delà c'est une faute de frappe. */
export const MAX_PAR_JOUEUR = 20;

export function lireCompteur(v: unknown): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_PAR_JOUEUR, Math.floor(n));
}

/** Incrémente sans laisser de zéro derrière : une table pleine de zéros
 *  serait écrite telle quelle dans Firestore, pour ne rien dire. */
export function ajusterCompteur(c: Compteurs, uid: string, delta: number): Compteurs {
  const n = lireCompteur((c[uid] ?? 0) + delta);
  const suite = { ...c };
  if (n <= 0) delete suite[uid];
  else suite[uid] = n;
  return suite;
}

export function totalCompteur(c: Compteurs): number {
  return Object.values(c).reduce((t, n) => t + (Number.isFinite(n) ? n : 0), 0);
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
  r: Pick<Resultat, 'hommeDuMatchUid' | 'attendance' | 'scoreA' | 'scoreB'> &
    Partial<Pick<Resultat, 'buts' | 'passes'>>,
): Validation {
  const { presents } = bilanPresences(inscrits, r.attendance);

  if (presents.length === 0) {
    return { ok: false, probleme: 'Personne n’était présent : annule le match plutôt que de le terminer.' };
  }

  if (r.hommeDuMatchUid && !presents.includes(r.hommeDuMatchUid)) {
    return { ok: false, probleme: 'L’homme du match doit avoir joué.' };
  }

  // On ne peut pas avoir marqué plus de buts qu'il n'y en a eu. C'est la
  // seule incohérence qu'on REFUSE : elle ne peut venir que d'une erreur de
  // saisie, et elle partirait gonfler les statistiques de quelqu'un.
  const marques = totalCompteur(r.buts ?? {});
  const total = lireScore(r.scoreA) + lireScore(r.scoreB);
  if (marques > total) {
    return {
      ok: false,
      probleme: `${marques} buts attribués pour ${total} marqué${total > 1 ? 's' : ''} au score.`,
    };
  }

  // L'inverse est TOLÉRÉ : « je ne sais plus qui a marqué le troisième » est
  // le cas normal un jeudi soir. Exiger l'exhaustivité ferait renoncer à
  // saisir quoi que ce soit — et une donnée partielle vaut mieux qu'aucune.

  // Une passe décisive suppose un but. Plus de passes que de buts au score
  // est la même faute de frappe, vue de l'autre côté.
  const passes = totalCompteur(r.passes ?? {});
  if (passes > total) {
    return {
      ok: false,
      probleme: `${passes} passes décisives pour ${total} but${total > 1 ? 's' : ''} marqué${total > 1 ? 's' : ''}.`,
    };
  }

  // Un absent ne peut ni marquer ni faire une passe.
  const fantome = [...Object.keys(r.buts ?? {}), ...Object.keys(r.passes ?? {})]
    .find((u) => !presents.includes(u));
  if (fantome) {
    return { ok: false, probleme: 'Un joueur marqué absent a des buts ou des passes.' };
  }

  return { ok: true };
}

export function peutTerminer(m: Pick<Match, 'statut'>): boolean {
  // Seul un match confirmé se termine. Terminer un sondage sauterait l'étape
  // où les joueurs se sont engagés.
  return m.statut === 'confirmé';
}
