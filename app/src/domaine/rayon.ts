import type { Match } from './schemas';

/** Rayon de découverte, en km. 0 = partout.
 *  C'est un confort de LECTURE, pas un réglage de compte : il vit dans le
 *  localStorage du téléphone, jamais dans Firestore. */
export const RAYONS = [5, 10, 25, 50, 0] as const;
export type Rayon = (typeof RAYONS)[number];

export const RAYON_DEFAUT: Rayon = 25;

export function libelleRayon(km: number): string {
  return km === 0 ? 'Partout' : `${km} km`;
}

export interface Position {
  readonly lat: number;
  readonly lon: number;
}

/** Distance à vol d'oiseau, en km. */
export function haversine(a: Position, b: Position): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Le match suffit : `lieuCoords` et `createurUid` sont déclarés dans le
 *  schéma. Cette interface les AJOUTAIT en option précisément parce qu'ils
 *  n'y étaient pas — et comme Zod supprime ce qu'il ne déclare pas, ils
 *  n'arrivaient jamais. Le type disait « peut-être présent », la réalité
 *  disait « jamais ». */
type MatchLocalise = Match;

/** Position d'un match : ses coordonnées finales, sinon celles du premier
 *  créneau qui en porte. */
export function positionDuMatch(m: MatchLocalise): Position | null {
  if (m.lieuCoords?.lat != null && m.lieuCoords?.lon != null) return m.lieuCoords;
  const c = (m.creneauxProposes ?? []).find((x) => x.lat != null && x.lon != null);
  return c?.lat != null && c?.lon != null ? { lat: c.lat, lon: c.lon } : null;
}

/** Distance du match au domicile — null si l'une des deux positions manque. */
export function distanceMatchKm(m: MatchLocalise, domicile: Position | null): number | null {
  const p = positionDuMatch(m);
  if (!domicile || !p) return null;
  return haversine(domicile, p);
}

/**
 * Garde-t-on ce match dans le fil ?
 *
 *   - les miens TOUJOURS, quel que soit le rayon : on ne cache pas à
 *     quelqu'un un match où il est inscrit ;
 *   - un match SANS coordonnées n'est jamais masqué — on ne cache pas par
 *     ignorance, on montre et on laisse juger.
 */
export function dansLeRayon(
  m: MatchLocalise,
  uid: string | null,
  km: number,
  domicile: Position | null,
): boolean {
  if (uid && (m.joueursInscrits ?? []).includes(uid)) return true;
  if (uid && m.createurUid === uid) return true;
  if (!km) return true;
  const d = distanceMatchKm(m, domicile);
  return d == null || d <= km;
}

/** « 8,4 km » sous 10 km, « 23 km » au-delà : la précision décimale ne sert
 *  qu'au proche. */
export function libelleDistance(d: number | null): string {
  if (d == null) return '';
  return d < 10 ? `${d.toFixed(1).replace('.', ',')} km` : `${Math.round(d)} km`;
}
