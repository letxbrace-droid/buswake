/**
 * LE KOLEKTIF PULSE — le geste signature de la marque.
 *
 * `DESIGN.md` : « Une place prise = un point plein ; deux places prises côte
 * à côte = un segment qui s'allume entre elles. » Et la raison, qui n'est pas
 * décorative : une barre à 70 % dit « 70 % » ; sept points posés disent
 * « sept personnes sont là ». C'est la même donnée et ce n'est pas le même
 * récit.
 *
 * Il avait REMPLACÉ la barre de remplissage partout où elle existait en v1.
 * La v2 était repartie sur une barre — donc sur le récit qu'on avait
 * délibérément quitté.
 *
 * La géométrie vit ici pour être éprouvée sans navigateur : c'est la règle
 * du projet, et une chaîne qui s'allume au mauvais endroit ne se voit pas
 * dans une capture.
 */

export const UNITE = 10;
/** Au-delà, la chaîne devient illisible — et aucun format de foot n'y va. */
export const MAX_POINTS = 40;

export interface Point {
  readonly cx: number;
  readonly r: number;
  readonly pris: boolean;
  /** Rang du point, porté dans le markup par `--i` : le décalage de
   *  l'animation est UNE règle CSS au lieu de quarante. */
  readonly i: number;
}

export interface Segment {
  readonly x1: number;
  readonly x2: number;
  readonly allume: boolean;
  readonly i: number;
}

export interface Pulse {
  readonly points: readonly Point[];
  readonly segments: readonly Segment[];
  readonly largeur: number;
  readonly pris: number;
  readonly total: number;
}

export function construirePulse(n: number, total: number): Pulse {
  const N = Math.max(1, Math.min(MAX_POINTS, Math.trunc(total) || 0));
  const k = Math.max(0, Math.min(N, Math.trunc(n) || 0));

  const points: Point[] = [];
  for (let i = 0; i < N; i++) {
    const pris = i < k;
    points.push({ cx: i * UNITE + 5, r: pris ? 3.1 : 2.1, pris, i });
  }

  const segments: Segment[] = [];
  for (let i = 0; i < N - 1; i++) {
    // UN SEGMENT NE S'ALLUME QUE SI SES DEUX EXTRÉMITÉS SONT PRISES. C'est
    // ce qui fait un groupe et non une jauge : le lien existe entre deux
    // personnes présentes, pas entre une présente et une absente.
    segments.push({ x1: i * UNITE + 5, x2: i * UNITE + 15, allume: i + 1 < k, i });
  }

  return { points, segments, largeur: N * UNITE, pris: k, total: N };
}
