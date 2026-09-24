import { bilanEquipe, effectifEquipe, etatEquipe, type Equipe } from './equipe';
import { classerEquipes } from './classement';

/**
 * MON CLUB.
 *
 * L'onglet de la maquette montre UN club — le mien — là où l'écran Équipes
 * montrait la liste de tous. Ce n'est pas le même écran : l'un sert à
 * chercher où s'insérer, l'autre à tenir son groupe.
 *
 * Ce qui n'y est PAS, et pourquoi. La maquette a un onglet « Matchs » du
 * club. Aucun champ ne relie un match à une équipe : `matchs` porte des
 * `joueursInscrits`, pas d'`equipeId`. Afficher là les matchs de mes
 * coéquipiers serait une approximation présentée comme un fait — et le jour
 * où deux membres jouent séparément, l'écran ment. L'onglet n'existe donc
 * pas tant que le lien n'existe pas.
 */

export interface Membre {
  readonly uid: string;
  readonly pseudo: string;
  readonly poste: string;
  readonly capitaine: boolean;
  /** Moyenne des notes reçues, ou `null` si le joueur n'a jamais été noté.
   *  `null` et `0` ne sont pas la même chose : l'un dit « on ne sait pas »,
   *  l'autre « il joue très mal ». */
  readonly note: number | null;
  readonly xp: number;
}

/** La moyenne, quand elle existe. */
export function noteMoyenne(somme: number, nombre: number): number | null {
  if (!nombre || nombre <= 0) return null;
  const n = somme / nombre;
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

/**
 * Mon club parmi ceux qu'on a lus.
 *
 * Le capitanat d'abord : si je suis capitaine quelque part, c'est CE
 * club-là — c'est celui dont je réponds. Sinon le premier où je suis membre.
 */
export function monClub(equipes: readonly Equipe[], uid: string | null): Equipe | null {
  if (!uid) return null;
  return (
    equipes.find((e) => e.capitaineUid === uid) ??
    equipes.find((e) => (e.membres ?? []).includes(uid)) ??
    null
  );
}

export interface FicheMembre {
  readonly uid: string;
  readonly pseudo: string;
  readonly posteFavori?: string;
  readonly noteSum?: number;
  readonly noteCount?: number;
  readonly xp?: number;
}

/**
 * Les membres, le capitaine en tête puis par note décroissante.
 *
 * Les joueurs jamais notés passent APRÈS les notés, sans être mélangés à
 * ceux qui ont une mauvaise note : n'avoir pas encore été noté n'est pas un
 * mauvais classement, c'est une absence d'information.
 */
export function membresDuClub(
  club: Equipe,
  fiches: Record<string, FicheMembre>,
): Membre[] {
  return (club.membres ?? [])
    .map((uid) => {
      const f = fiches[uid];
      return {
        uid,
        pseudo: f?.pseudo ?? 'Joueur',
        poste: f?.posteFavori ?? '',
        capitaine: club.capitaineUid === uid,
        note: noteMoyenne(f?.noteSum ?? 0, f?.noteCount ?? 0),
        xp: f?.xp ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.capitaine !== b.capitaine) return a.capitaine ? -1 : 1;
      if ((a.note === null) !== (b.note === null)) return a.note === null ? 1 : -1;
      return (b.note ?? 0) - (a.note ?? 0) || b.xp - a.xp;
    });
}

export interface BilanClub {
  readonly v: number;
  readonly n: number;
  readonly d: number;
  readonly serie: number;
  readonly joues: number;
  readonly points: number;
  /** `null` tant qu'aucun match n'a été joué : « 0 % de victoires » sur zéro
   *  match est un chiffre faux, pas un chiffre bas. */
  readonly pourcentVictoires: number | null;
  readonly butsPour: number;
  readonly butsContre: number;
  readonly place: number | null;
  readonly surTotal: number;
  readonly manque: number;
  readonly effectif: number;
}

export function bilanDuClub(club: Equipe, toutes: readonly Equipe[]): BilanClub {
  const b = bilanEquipe(club);
  const joues = b.v + b.n + b.d;
  const rang = classerEquipes(toutes).findIndex((e) => e.id === club.id);
  const etat = etatEquipe(club);
  return {
    ...b,
    joues,
    points: b.v * 3 + b.n,
    pourcentVictoires: joues > 0 ? Math.round((b.v / joues) * 100) : null,
    butsPour: club.stats?.butsPour ?? 0,
    butsContre: club.stats?.butsContre ?? 0,
    place: rang >= 0 ? rang + 1 : null,
    surTotal: toutes.length,
    manque: etat.manque,
    effectif: effectifEquipe(club),
  };
}
