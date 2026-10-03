import { lireAdresses, type Adresse } from '../domaine/lieu';

/**
 * Suggestions d'adresse pendant la saisie.
 *
 * La Géoplateforme de l'IGN sert la base adresse nationale : officielle,
 * gratuite, sans clé, et elle reconnaît une adresse française jusqu'au
 * numéro. Elle a pris le relais de `api-adresse.data.gouv.fr`, même format.
 *
 * Aucune exception ne remonte : sans réseau, le champ reste un champ texte
 * et l'organisateur tape son adresse lui-même — le match se crée quand même,
 * simplement sans coordonnées.
 */
export async function chercherAdresses(
  q: string,
  pres?: { lat: number; lon: number } | null,
  signal?: AbortSignal,
): Promise<Adresse[]> {
  const terme = q.trim();
  if (terme.length < 4) return [];
  const params = new URLSearchParams({ q: terme, limit: '5', index: 'address' });
  // Le domicile sert à classer : « rue de la Gare » existe dans mille villes.
  if (pres) {
    params.set('lat', String(pres.lat));
    params.set('lon', String(pres.lon));
  }
  try {
    const r = await fetch(`https://data.geopf.fr/geocodage/search?${params}`, {
      signal: signal ?? AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    return lireAdresses(await r.json());
  } catch {
    return [];
  }
}
