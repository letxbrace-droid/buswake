import { describe, it, expect } from 'vitest';
import { vedette, terrainsDansLeRayon } from './accueil';
import { TERRAINS_VERIFIES } from './terrains';
import type { Match } from './schemas';

const MAINTENANT = new Date('2026-09-18T12:00:00Z');
const h = (n: number) => new Date(MAINTENANT.getTime() + n * 3600_000);

const m = (p: Partial<Match> = {}): Match =>
  ({
    id: 'm', createurUid: 'c', sport: 'foot5', statut: 'sondage',
    joueursInscrits: [], creneauxProposes: [], dateFinale: null, lieuFinal: '',
    finVisible: h(48), joueursMax: 10, ...p,
  }) as Match;

describe('vedette', () => {
  it('ne montre rien quand il n’y a rien — elle ne l’invente pas', () => {
    expect(vedette([], 'moi', 0, null, MAINTENANT)).toBeNull();
  });

  it('met en avant MON match, et le plus tôt d’abord', () => {
    const tard = m({ id: 'tard', joueursInscrits: ['moi'], dateFinale: h(48) });
    const tot = m({ id: 'tot', joueursInscrits: ['moi'], dateFinale: h(6) });
    const v = vedette([tard, tot], 'moi', 0, null, MAINTENANT);
    expect(v?.match.id).toBe('tot');
    expect(v?.dedans).toBe(true);
  });

  // Proposer « Je viens » sur un match où l'on est déjà inscrit, c'est
  // promettre une action qui n'existe pas.
  it('dit si je suis déjà dedans', () => {
    const autre = m({ id: 'a', joueursInscrits: ['x'], dateFinale: h(3) });
    expect(vedette([autre], 'moi', 0, null, MAINTENANT)?.dedans).toBe(false);
  });

  it('propose un match rejoignable quand je n’en ai aucun', () => {
    const plein = m({ id: 'plein', joueursMax: 2, joueursInscrits: ['a', 'b'], dateFinale: h(2) });
    const libre = m({ id: 'libre', joueursInscrits: ['a'], dateFinale: h(5) });
    expect(vedette([plein, libre], 'moi', 0, null, MAINTENANT)?.match.id).toBe('libre');
  });

  it('ne remonte pas un match déjà passé', () => {
    const passe = m({ id: 'passe', joueursInscrits: ['moi'], dateFinale: h(-3) });
    expect(vedette([passe], 'moi', 0, null, MAINTENANT)).toBeNull();
  });

  it('ignore un match terminé ou annulé', () => {
    for (const statut of ['terminé', 'annulé'] as const) {
      const fini = m({ statut, joueursInscrits: ['moi'], dateFinale: h(4) });
      expect(vedette([fini], 'moi', 0, null, MAINTENANT)).toBeNull();
    }
  });

  // Les chiffres du héros sont des PROMESSES : ils sortent du document.
  it('compte les inscrits et les places restantes depuis le match', () => {
    const v = vedette(
      [m({ joueursMax: 12, joueursInscrits: ['moi', 'b', 'c'], dateFinale: h(4), lieuFinal: 'LE FIVE Morangis' })],
      'moi', 0, null, MAINTENANT,
    );
    expect(v?.inscrits).toBe(3);
    expect(v?.places).toBe(9);
    expect(v?.lieu).toBe('LE FIVE Morangis');
  });

  it('retombe sur le premier créneau proposé tant que la date n’est pas tranchée', () => {
    const v = vedette(
      [m({ joueursInscrits: ['moi'], creneauxProposes: [{ date: h(9), lieu: 'Morangis', votes: [] }] })],
      'moi', 0, null, MAINTENANT,
    );
    expect(v?.quand?.getTime()).toBe(h(9).getTime());
    expect(v?.lieu).toBe('Morangis');
  });

  it('ne propose pas un match hors de mon rayon', () => {
    const loin = m({ id: 'loin', joueursInscrits: ['x'], dateFinale: h(4), lieuCoords: { lat: 45.76, lon: 4.83 } });
    const paris = { lat: 48.8566, lon: 2.3522 };
    expect(vedette([loin], 'moi', 5, paris, MAINTENANT)).toBeNull();
    expect(vedette([loin], 'moi', 0, paris, MAINTENANT)?.match.id).toBe('loin');
  });
});

describe('terrainsDansLeRayon', () => {
  const massy = { lat: 48.726, lon: 2.283 };

  it('compte ceux du rayon, pas un nombre fixe', () => {
    const a5 = terrainsDansLeRayon(massy, 5);
    const a50 = terrainsDansLeRayon(massy, 50);
    expect(a5).toBeLessThanOrEqual(a50);
    expect(a50).toBeLessThanOrEqual(TERRAINS_VERIFIES.length);
  });

  it('« Partout » les compte tous', () => {
    expect(terrainsDansLeRayon(massy, 0)).toBe(TERRAINS_VERIFIES.length);
    expect(terrainsDansLeRayon(null, 25)).toBe(TERRAINS_VERIFIES.length);
  });

  it('grandit avec le rayon', () => {
    const suite = [5, 10, 25, 50].map((k) => terrainsDansLeRayon(massy, k));
    expect([...suite].sort((a, b) => a - b)).toEqual(suite);
  });
});
