import { flouter, lireCommunes, codePostalValide, type Localite } from '../domaine/localisation';

/**
 * Où habite ce code postal ?
 *
 * `geo.api.gouv.fr` et non Nominatim, qu'employait la v1 : la recherche par
 * code postal de Nominatim est peu fiable en France — elle rend souvent
 * rien, ou un point sans rapport. L'API des communes est la source
 * officielle, gratuite, sans clé, et répond commune par commune.
 *
 * Aucune exception ne remonte : un géocodage raté n'est pas une panne, c'est
 * un domicile qu'on n'a pas encore. L'appelant garde le repli.
 */
export async function geocoderCodePostal(cp: string): Promise<Localite | null> {
  const code = cp.trim();
  if (!codePostalValide(code)) return null;
  try {
    const r = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(code)}&fields=nom,centre&format=json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return null;
    return lireCommunes(await r.json());
  } catch {
    return null;
  }
}

export type EtatPosition =
  | { ok: true; lat: number; lon: number }
  | { ok: false; raison: 'refus' | 'indisponible' | 'delai' };

/**
 * La position de l'appareil, ramenée sur la grille publique.
 *
 * `enableHighAccuracy: false` : on va de toute façon flouter à deux
 * kilomètres, le GPS précis ne servirait qu'à vider la batterie et à faire
 * attendre.
 */
export function maPosition(): Promise<EtatPosition> {
  return new Promise((ok) => {
    if (!('geolocation' in navigator)) {
      ok({ ok: false, raison: 'indisponible' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ ok: true, ...flouter({ lat: p.coords.latitude, lon: p.coords.longitude }) }),
      (e) => ok({ ok: false, raison: e.code === e.PERMISSION_DENIED ? 'refus' : e.code === e.TIMEOUT ? 'delai' : 'indisponible' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  });
}
