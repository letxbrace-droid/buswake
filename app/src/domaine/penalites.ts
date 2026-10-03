import { coupDEnvoi } from './garde';
import type { Match } from './schemas';

/** LE BARÈME DE FIABILITÉ — miroir de `PENALITE` dans functions/index.js.
 *
 *  C'est le serveur qui applique ; l'écran PRÉVIENT, avec les mêmes chiffres,
 *  avant le geste qui coûte. Un test lit le serveur et échoue si les deux
 *  divergent. Principe : rendre d'abord (retirer son vote rend ses +10),
 *  punir seulement ce qui gêne le groupe — un désistement tardif. */
export const PENALITE = { desist48: -10, desist24: -25, suppression: -20, parJour: 3 } as const;

/** Même calcul que le serveur, arrondi compris (Math.round, en faveur du
 *  joueur sur les demi-points). */
export function penaliteDesistement(heuresAvant: number, remplace: boolean): number {
  let p = 0;
  if (heuresAvant < 24) p = PENALITE.desist24;
  else if (heuresAvant < 48) p = PENALITE.desist48;
  return remplace ? Math.round(p / 2) : p;
}

export interface ApercuDesistement {
  /** XP perdus si personne ne prend la place (0 = gratuit). */
  readonly xp: number;
  /** XP perdus si un remplaçant du banc entre à sa place. */
  readonly xpSiRemplace: number;
  /** Moins de 24 h : compte aussi dans la fiabilité. */
  readonly tardif: boolean;
  /** Le banc compte quelqu'un qui entrera automatiquement. */
  readonly remplacantPret: boolean;
}

/** Ce que coûterait de se désister MAINTENANT — `null` si rien ne s'applique
 *  (pas encore de date, ou match qui n'est plus vivant). */
export function apercuDesistement(
  m: Pick<Match, 'statut' | 'dateFinale' | 'waitlist'>,
  maintenant: Date = new Date(),
): ApercuDesistement | null {
  if (m.statut !== 'sondage' && m.statut !== 'confirmé') return null;
  const coup = coupDEnvoi(m);
  if (!coup) return null;
  const heures = (coup.getTime() - maintenant.getTime()) / 3600000;
  const remplacantPret = (m.waitlist ?? []).length > 0;
  return {
    xp: penaliteDesistement(heures, false),
    xpSiRemplace: penaliteDesistement(heures, true),
    tardif: heures < 24,
    remplacantPret,
  };
}
