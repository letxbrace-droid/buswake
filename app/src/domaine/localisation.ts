import type { Position } from './rayon';

/**
 * LE DOMICILE — d'où se mesure le rayon de recherche.
 *
 * La v2 demandait le code postal à l'inscription et ne s'en servait jamais :
 * aucune ligne n'écrivait `domicileLat`. Tout nouvel inscrit voyait donc ses
 * distances, son rayon et « terrains autour de toi » calculés depuis le point
 * de repli — Massy. Un joueur de Paris 17 lisait des distances fausses
 * partout, sans aucun moyen de le savoir ni de le corriger.
 *
 * LA POSITION STOCKÉE EST PUBLIQUE, et c'est ce qui décide de sa précision.
 * La collection `users` est lisible par tout joueur connecté (c'est ce qui
 * fait marcher le classement). Le centre d'une COMMUNE ne dit rien de
 * personne ; une position GPS exacte publierait l'adresse de chacun. Toute
 * position issue de la géolocalisation est donc ramenée à une grille d'environ
 * deux kilomètres avant d'être écrite. Le plus petit rayon proposé est de
 * cinq : deux kilomètres de flou n'y changent rien.
 */

export function codePostalValide(cp: string): boolean {
  // Métropole, Corse (2A/2B s'écrivent 20xxx dans les codes postaux) et
  // outre-mer (97x, 98x). Cinq chiffres, pas un de plus.
  return /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/.test((cp ?? '').trim());
}

/** Une réponse de geo.api.gouv.fr/communes, telle qu'elle arrive. */
export interface CommuneApi {
  readonly nom?: unknown;
  readonly centre?: { readonly coordinates?: unknown };
}

export interface Localite {
  readonly position: Position;
  /** « Ris-Orangis », ou « Villebon-sur-Yvette et 1 autre » : on dit où l'on
   *  a placé le joueur, pour qu'il puisse voir si c'est faux. */
  readonly libelle: string;
}

/**
 * Les territoires français, chacun dans SA boîte.
 *
 * Une première version tenait l'outre-mer dans une seule grande boîte
 * (latitude −22 à 17, longitude −62 à 56). Elle couvrait l'océan Indien —
 * exactement là où tombe une coordonnée métropolitaine lue à l'envers
 * (latitude 2, longitude 48). La garde censée détecter l'inversion la
 * laissait donc passer. Le test l'a montré.
 */
const TERRITOIRES: readonly [number, number, number, number][] = [
  // [latMin, latMax, lonMin, lonMax]
  [41.3, 51.2, -5.3, 9.7], // métropole et Corse
  [15.8, 18.2, -63.2, -60.7], // Guadeloupe, Martinique, Saint-Martin, Saint-Barthélemy
  [14.3, 14.95, -61.3, -60.75], // Martinique (au sud du bloc précédent)
  [2.0, 6.0, -54.7, -51.5], // Guyane
  [-21.5, -20.8, 55.1, 56.0], // La Réunion
  [-13.1, -12.5, 44.9, 45.4], // Mayotte
  [46.7, 47.2, -56.5, -56.0], // Saint-Pierre-et-Miquelon
  [-23.0, -19.5, 163.0, 168.5], // Nouvelle-Calédonie
  [-28.0, -7.0, -155.0, -134.0], // Polynésie française
  [-14.4, -13.1, -178.3, -176.0], // Wallis-et-Futuna
];

/** Une coordonnée hors de tout territoire est une erreur de lecture —
 *  typiquement l'ordre [longitude, latitude] pris à l'envers. */
function plausible(p: Position): boolean {
  return TERRITOIRES.some(
    ([a, b, c, d]) => p.lat >= a && p.lat <= b && p.lon >= c && p.lon <= d,
  );
}

/**
 * Lit la réponse de l'API des communes.
 *
 * DEUX PIÈGES, tous deux silencieux :
 *  — GeoJSON range les coordonnées en [LONGITUDE, latitude]. Les lire dans
 *    l'autre ordre place Ris-Orangis dans l'océan Indien, sans erreur ;
 *  — un code postal couvre souvent plusieurs communes. On prend leur centre
 *    commun : à l'échelle d'un rayon de cinq kilomètres, c'est juste, et ça
 *    évite de demander au joueur de choisir entre trois villages.
 */
export function lireCommunes(reponse: unknown): Localite | null {
  if (!Array.isArray(reponse)) return null;

  const points: { nom: string; p: Position }[] = [];
  for (const c of reponse as CommuneApi[]) {
    const co = c?.centre?.coordinates;
    if (!Array.isArray(co) || co.length < 2) continue;
    const [lon, lat] = co.map(Number);
    const p = { lat, lon };
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !plausible(p)) continue;
    points.push({ nom: typeof c.nom === 'string' ? c.nom : '', p });
  }
  if (!points.length) return null;

  const lat = points.reduce((t, x) => t + x.p.lat, 0) / points.length;
  const lon = points.reduce((t, x) => t + x.p.lon, 0) / points.length;
  const noms = points.map((x) => x.nom).filter(Boolean);
  const libelle =
    noms.length <= 1
      ? noms[0] ?? ''
      : `${noms[0]} et ${noms.length - 1} autre${noms.length > 2 ? 's' : ''}`;

  return { position: arrondirA(lat, lon, 4), libelle };
}

/** Pas de la grille de confidentialité, en degrés : ~2,2 km en latitude. */
export const GRILLE_POSITION = 0.02;

function arrondirA(lat: number, lon: number, decimales: number): Position {
  const k = 10 ** decimales;
  return { lat: Math.round(lat * k) / k, lon: Math.round(lon * k) / k };
}

/**
 * Ramène une position GPS sur la grille publique.
 *
 * Une position précise à dix mètres, stockée dans un document que tout
 * joueur connecté peut lire, est une adresse. Ramenée à deux kilomètres,
 * c'est un quartier.
 */
export function flouter(p: Position): Position {
  const g = GRILLE_POSITION;
  const snap = (v: number) => Math.round(Math.round(v / g) * g * 1e4) / 1e4;
  return { lat: snap(p.lat), lon: snap(p.lon) };
}

/**
 * Faut-il (re)calculer le domicile ?
 *
 * Oui si le profil a un code postal valide et pas de position — c'est le cas
 * de TOUS les comptes créés par la v2 jusqu'ici. C'est ce qui permet de les
 * rattraper sans rien leur demander.
 */
export function domicileAManquer(p: {
  codePostal?: string | null;
  domicileLat?: number | null;
  domicileLon?: number | null;
}): boolean {
  return codePostalValide(p.codePostal ?? '') && (p.domicileLat == null || p.domicileLon == null);
}
