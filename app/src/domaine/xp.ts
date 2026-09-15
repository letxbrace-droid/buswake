/** XP et rangs — lecture seule côté client.
 *
 *  RÈGLE ABSOLUE : le client n'écrit JAMAIS d'XP. Ce barème est le reflet de
 *  celui des Cloud Functions (functions/index.js), qui fait autorité et qui
 *  seul écrit dans Firestore. Les règles Firestore interdisent au client de
 *  toucher aux champs de jeu (xp, badges, stats, streak…) — c'est ce qui
 *  ferme le trou de farming : gagner de l'XP puis annuler la rendait
 *  définitivement acquise tant que le calcul vivait dans le navigateur.
 *
 *  Toute modification ici doit être faite EN MÊME TEMPS que dans les
 *  functions, sinon l'interface annonce un gain qui n'arrivera pas.
 */
export const XP = {
  participer: 100,
  voter: 10,
  creer: 50,
  hdm: 200,
  noter: 10,
  motm: 15,
  /** Malus de lapin : poser un lapin coûte. C'est le seul gain négatif. */
  lapin: -15,
} as const;

export type MotifXP = keyof typeof XP;

export interface Rang {
  readonly min: number;
  readonly label: string;
  readonly couleur: string;
}

/** Six rangs. Les seuils doublent à peu près : la progression doit ralentir,
 *  sinon « Légende » ne veut plus rien dire au bout de trois mois. */
export const RANGS: readonly Rang[] = [
  { min: 0, label: 'Recrue', couleur: '#A07B5B' },
  { min: 200, label: 'Stagiaire', couleur: '#B8C0CC' },
  { min: 500, label: 'Titulaire', couleur: '#3BA2FF' },
  { min: 1000, label: 'Cadre', couleur: '#5DD62C' },
  { min: 2000, label: 'Capitaine', couleur: '#FFC83D' },
  { min: 4000, label: 'Légende', couleur: '#FF4D6D' },
] as const;

export function rangDe(xp: number): Rang {
  const n = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let trouve = RANGS[0];
  for (const r of RANGS) if (n >= r.min) trouve = r;
  return trouve;
}

export interface Progression {
  readonly rang: Rang;
  readonly suivant: Rang | null;
  /** XP restants avant le rang suivant ; 0 au rang maximal. */
  readonly restant: number;
  /** Avancement dans le palier courant, de 0 à 1. */
  readonly fraction: number;
}

export function progressionDe(xp: number): Progression {
  const n = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const rang = rangDe(n);
  const i = RANGS.indexOf(rang);
  const suivant = i < RANGS.length - 1 ? RANGS[i + 1] : null;
  if (!suivant) return { rang, suivant: null, restant: 0, fraction: 1 };
  const etendue = suivant.min - rang.min;
  return {
    rang,
    suivant,
    restant: suivant.min - n,
    fraction: etendue > 0 ? (n - rang.min) / etendue : 1,
  };
}
