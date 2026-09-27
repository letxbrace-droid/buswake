import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocoderCodePostal } from './localisation';

/**
 * L'API n'est pas joignable depuis l'environnement de développement : ce
 * service n'a JAMAIS parlé à la vraie `geo.api.gouv.fr`. Ces tests éprouvent
 * ce qu'on peut éprouver sans elle — la requête envoyée, et surtout le fait
 * qu'AUCUN échec ne remonte en exception. Un géocodage raté n'est pas une
 * panne, c'est un domicile qu'on n'a pas encore.
 */
afterEach(() => vi.unstubAllGlobals());

const repondre = (corps: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => corps })));

describe('geocoderCodePostal', () => {
  it('interroge l’API des communes avec le code postal', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal('fetch', f);
    await geocoderCodePostal('91130');
    const url = String((f.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('geo.api.gouv.fr/communes');
    expect(url).toContain('codePostal=91130');
    expect(url).toContain('fields=nom,centre');
  });

  it('rend la commune et sa position', async () => {
    repondre([{ nom: 'Ris-Orangis', centre: { coordinates: [2.4145, 48.6517] } }]);
    const l = await geocoderCodePostal('91130');
    expect(l?.libelle).toBe('Ris-Orangis');
    expect(l?.position.lat).toBeCloseTo(48.6517, 3);
  });

  // Aucune requête pour un code manifestement faux : c'est une requête de
  // moins, et une réponse vide de moins à interpréter.
  it('n’interroge pas le réseau pour un code invalide', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await geocoderCodePostal('123')).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('rend null — sans lever — sur une erreur HTTP', async () => {
    repondre({}, false);
    await expect(geocoderCodePostal('91130')).resolves.toBeNull();
  });

  it('rend null — sans lever — hors ligne', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(geocoderCodePostal('91130')).resolves.toBeNull();
  });

  it('rend null — sans lever — sur une réponse qui n’est pas du JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { throw new SyntaxError('x'); } })));
    await expect(geocoderCodePostal('91130')).resolves.toBeNull();
  });

  it('rend null pour un code postal que personne n’habite', async () => {
    repondre([]);
    expect(await geocoderCodePostal('99999'.replace('9', '0'))).toBeNull();
  });
});
