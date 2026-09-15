import { bilanEquipe, type Equipe } from './equipe';
import { rangDe, type Rang } from './xp';

/** PORTÉE DU CLASSEMENT — ce qui n'y est PAS, et pourquoi.
 *
 *  « Cette semaine » et « par sport » n'existent pas ici. L'XP est un total
 *  sans dimension temporelle (aucun historique d'événements n'est conservé),
 *  et un joueur n'a pas de sport — seulement des matchs joués. Proposer ces
 *  filtres aurait voulu dire INVENTER un classement : montrer un chiffre
 *  qu'aucune donnée ne soutient. */

export interface JoueurClasse {
  readonly id: string;
  readonly pseudo: string;
  readonly xp: number;
  readonly streak?: number;
  readonly stats?: { hommeDuMatch?: number };
}

export function classerJoueurs(joueurs: readonly JoueurClasse[]): JoueurClasse[] {
  // À XP égal, l'ordre alphabétique : il est stable, donc le classement ne
  // saute pas d'un chargement à l'autre.
  return [...joueurs].sort((a, b) => b.xp - a.xp || a.pseudo.localeCompare(b.pseudo, 'fr'));
}

/** Points d'équipe : 3 par victoire, 1 par nul. Le barème du football, parce
 *  qu'il est connu de tout le monde et n'a pas besoin d'être expliqué. */
export function pointsEquipe(e: Equipe): number {
  const b = bilanEquipe(e);
  return b.v * 3 + b.n;
}

/** La différence de buts départage — c'est elle qui rend un match serré
 *  différent d'une correction. */
export function diffButs(e: Equipe): number {
  return (e.stats?.butsPour ?? 0) - (e.stats?.butsContre ?? 0);
}

export function classerEquipes(equipes: readonly Equipe[]): Equipe[] {
  return [...equipes].sort(
    (a, b) =>
      pointsEquipe(b) - pointsEquipe(a) ||
      diffButs(b) - diffButs(a) ||
      a.nom.localeCompare(b.nom, 'fr'),
  );
}

/** Un « Top X % » sur trois joueurs ne veut rien dire. En dessous de ce
 *  seuil, on ne l'affiche pas — mieux vaut rien qu'un chiffre creux. */
export const SEUIL_TOP_POURCENT = 8;

export interface MaPlace {
  readonly position: number;
  readonly rang: Rang;
  /** XP à gagner pour passer devant celui du dessus. Null si je suis premier. */
  readonly pourDepasser: { readonly xp: number; readonly pseudo: string } | null;
  /** Avancement entre celui du dessous et celui du dessus, de 0 à 1. */
  readonly fraction: number;
  /** Null tant qu'on n'a pas assez de monde pour que ça veuille dire quelque chose. */
  readonly topPourcent: number | null;
}

export function maPlace(uid: string, classes: readonly JoueurClasse[]): MaPlace | null {
  const i = classes.findIndex((u) => u.id === uid);
  if (i < 0) return null;

  const moi = classes[i];
  const dessus = i > 0 ? classes[i - 1] : null;
  const dessous = classes[i + 1] ?? null;

  const bas = dessous?.xp ?? 0;
  const haut = dessus?.xp ?? moi.xp;

  return {
    position: i + 1,
    rang: rangDe(moi.xp),
    // +1 : égaliser ne suffit pas à dépasser.
    pourDepasser: dessus ? { xp: dessus.xp - moi.xp + 1, pseudo: dessus.pseudo } : null,
    fraction: haut > bas ? Math.min(1, Math.max(0.06, (moi.xp - bas) / (haut - bas))) : 1,
    topPourcent:
      classes.length >= SEUIL_TOP_POURCENT
        ? Math.max(1, Math.round(((i + 1) / classes.length) * 100))
        : null,
  };
}

/** Ordre VISUEL du podium : 2 — 1 — 3. Le premier au centre et plus haut,
 *  c'est la forme qu'on reconnaît sans avoir à lire les chiffres. */
export function ordrePodium<T>(trois: readonly T[]): (T | null)[] {
  return [trois[1] ?? null, trois[0] ?? null, trois[2] ?? null];
}
