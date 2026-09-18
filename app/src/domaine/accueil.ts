import { estTitulaire, matchVivant, maxJoueurs, versDate } from './match';
import { dansLeRayon, haversine, type Position } from './rayon';
import { TERRAINS_VERIFIES } from './terrains';
import type { Match } from './schemas';

/**
 * L'ACCUEIL, calculé — il ne l'était pas.
 *
 * Cet écran affichait « Jeudi 18h30 · Le Five Massy · 8 inscrits sur 10 »
 * écrit en dur, et « 3 terrains à moins de 10 km » écrit en dur aussi. Sur
 * un vrai compte, le match du jour était ailleurs, à une autre heure, avec
 * un autre nombre d'inscrits — et le rayon réglé sur 5 km.
 *
 * C'est exactement ce que la règle 1 du produit interdit : un compteur
 * affiché est une promesse. Un chiffre que rien ne calcule n'est pas un
 * chiffre, c'est une illustration — et placée là, elle se lit comme une
 * information.
 */

export interface Vedette {
  readonly match: Match;
  readonly quand: Date | null;
  readonly lieu: string;
  readonly inscrits: number;
  readonly places: number;
  /** Suis-je déjà dedans ? C'est ce qui décide du bouton : « Voir le
   *  match » ou « Je viens ». Proposer de rejoindre un match où l'on est
   *  déjà inscrit, c'est promettre une action qui n'existe pas. */
  readonly dedans: boolean;
}

function quandDe(m: Match): Date | null {
  return versDate(m.dateFinale) ?? versDate((m.creneauxProposes ?? []).find((c) => c.date)?.date) ?? null;
}

function lieuDe(m: Match): string {
  return m.lieuFinal || (m.creneauxProposes ?? []).find((c) => c.lieu)?.lieu || '';
}

/**
 * Le match à mettre en avant.
 *
 * D'abord LE MIEN : celui où je suis inscrit et qui arrive le plus tôt. À
 * défaut, le plus proche dans le temps parmi ceux que je peux encore
 * rejoindre, dans mon rayon. À défaut, rien — et « rien » se dit, il ne
 * s'invente pas.
 */
export function vedette(
  matchs: readonly Match[],
  uid: string | null,
  km: number,
  domicile: Position | null,
  maintenant: Date = new Date(),
): Vedette | null {
  const utiles = matchs.filter((m) => matchVivant(m));

  const fiche = (m: Match): Vedette => {
    const inscrits = (m.joueursInscrits ?? []).length;
    return {
      match: m,
      quand: quandDe(m),
      lieu: lieuDe(m),
      inscrits,
      places: Math.max(0, maxJoueurs(m) - inscrits),
      dedans: !!uid && estTitulaire(m, uid),
    };
  };

  const aVenir = (m: Match) => {
    const d = quandDe(m);
    return !d || d.getTime() >= maintenant.getTime();
  };
  const tri = (a: Match, b: Match) =>
    (quandDe(a)?.getTime() ?? Infinity) - (quandDe(b)?.getTime() ?? Infinity);

  const miens = uid ? utiles.filter((m) => estTitulaire(m, uid) && aVenir(m)) : [];
  if (miens.length) return fiche([...miens].sort(tri)[0]);

  const joignables = utiles
    .filter((m) => aVenir(m))
    .filter((m) => !uid || !estTitulaire(m, uid))
    .filter((m) => (m.joueursInscrits ?? []).length < maxJoueurs(m))
    .filter((m) => dansLeRayon(m, uid, km, domicile));
  if (joignables.length) return fiche([...joignables].sort(tri)[0]);

  return null;
}

/** Combien de terrains dans MON rayon — pas un nombre fixe. `0` (« Partout »)
 *  les compte tous, comme partout ailleurs dans l'app. */
export function terrainsDansLeRayon(domicile: Position | null, km: number): number {
  if (!domicile || !km) return TERRAINS_VERIFIES.length;
  return TERRAINS_VERIFIES.filter((t) => haversine(domicile, { lat: t.lat, lon: t.lon }) <= km).length;
}
