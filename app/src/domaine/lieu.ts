import type { Position } from './rayon';
import type { TerrainVerifie } from './terrains';

/** LE LIEU D'UN MATCH.
 *
 *  Deux origines : un terrain de la liste vérifiée, ou un lieu saisi par
 *  l'organisateur — son five habituel, le gymnase du quartier, un indoor
 *  que la liste ne connaît pas. Proposer seulement les trois terrains les
 *  plus proches revenait à interdire de jouer ailleurs.
 *
 *  Un lieu saisi n'est pas « vérifié » et l'écran ne le dit jamais : il porte
 *  l'adresse que l'organisateur a choisie, rien de plus. */
export interface LieuChoisi {
  readonly nom: string;
  /** Adresse complète, avec numéro de rue si possible. */
  readonly adresse: string;
  readonly lat: number | null;
  readonly lon: number | null;
  readonly verifie: boolean;
}

export const NOM_LIEU_MAX = 60;
export const ADRESSE_MAX = 160;

export function depuisTerrain(t: TerrainVerifie): LieuChoisi {
  return { nom: t.n, adresse: t.adr, lat: t.lat, lon: t.lon, verifie: true };
}

/** Une suggestion du géocodeur : l'adresse telle qu'il l'a reconnue. */
export interface Adresse extends Position {
  readonly libelle: string;
  /** Vrai si l'adresse va jusqu'au numéro de rue — un GPS y mène à la porte. */
  readonly precise: boolean;
}

/** Lit la réponse GeoJSON de la Géoplateforme (base adresse nationale).
 *
 *  Ne fait confiance à rien : un élément sans libellé ou sans coordonnées
 *  plausibles est écarté. Les coordonnées GeoJSON sont en [lon, lat] — les
 *  inverser enverrait le terrain dans l'océan Indien. */
export function lireAdresses(json: unknown): Adresse[] {
  const features = (json as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];
  const vues = new Set<string>();
  const out: Adresse[] = [];
  for (const f of features) {
    const p = (f as { properties?: Record<string, unknown> })?.properties ?? {};
    const c = (f as { geometry?: { coordinates?: unknown } })?.geometry?.coordinates;
    const libelle = typeof p.label === 'string' ? p.label.trim() : '';
    if (!libelle || !Array.isArray(c) || c.length < 2) continue;
    const [lon, lat] = c.map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    if (vues.has(libelle)) continue;
    vues.add(libelle);
    out.push({ libelle: libelle.slice(0, ADRESSE_MAX), lat, lon, precise: p.type === 'housenumber' });
  }
  return out;
}

/** Ce qui manque pour qu'un lieu saisi soit utilisable — `null` s'il l'est. */
export function problemeLieu(l: { nom: string; adresse: string }): string | null {
  const nom = l.nom.trim();
  const adresse = l.adresse.trim();
  if (nom.length < 2) return 'Donne un nom au lieu (ex. « Five Massy »)';
  if (nom.length > NOM_LIEU_MAX) return `${NOM_LIEU_MAX} caractères au maximum pour le nom`;
  if (adresse.length < 5) return 'Indique l’adresse du terrain';
  if (adresse.length > ADRESSE_MAX) return `${ADRESSE_MAX} caractères au maximum pour l’adresse`;
  return null;
}

/** Le lieu saisi, nettoyé, prêt à rejoindre le brouillon. */
export function lieuSaisi(nom: string, adresse: string, choisie: Adresse | null): LieuChoisi {
  const a = adresse.trim();
  // Les coordonnées ne valent que pour l'adresse dont elles viennent : si le
  // joueur a retouché le texte après avoir choisi une suggestion, elles ne
  // désignent plus forcément le même endroit.
  const ok = choisie && choisie.libelle === a;
  return {
    nom: nom.trim().replace(/\s+/g, ' '),
    adresse: a.replace(/\s+/g, ' '),
    lat: ok ? choisie.lat : null,
    lon: ok ? choisie.lon : null,
    verifie: false,
  };
}
