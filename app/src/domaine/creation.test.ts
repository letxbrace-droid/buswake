import { describe, it, expect } from 'vitest';
import { creneauxSuggeres, etatCreation, terrainsProches } from './creation';

describe('creneauxSuggeres', () => {
  it('propose cinq créneaux, tous dans le futur', () => {
    const maintenant = new Date('2026-09-15T12:00:00');
    const c = creneauxSuggeres(maintenant);
    expect(c).toHaveLength(5);
    for (const x of c) expect(x.date.getTime()).toBeGreaterThan(maintenant.getTime());
  });

  it('les rend dans l’ordre chronologique', () => {
    const c = creneauxSuggeres(new Date('2026-09-15T12:00:00'));
    for (let i = 1; i < c.length; i++) {
      expect(c[i].date.getTime()).toBeGreaterThan(c[i - 1].date.getTime());
    }
  });

  // Proposer un créneau révolu fait perdre un aller-retour à tout le monde.
  it('saute au vendredi suivant quand le vendredi 19h est déjà passé', () => {
    // 2026-09-18 est un vendredi ; à 21h, le créneau de 19h est passé.
    const vendrediSoir = new Date('2026-09-18T21:00:00');
    const c = creneauxSuggeres(vendrediSoir);
    const vendredis = c.filter((x) => x.date.getDay() === 5);
    for (const v of vendredis) expect(v.date.getTime()).toBeGreaterThan(vendrediSoir.getTime());
  });

  it('nomme le jour en toutes lettres — « ven. 18 » se lit moins vite', () => {
    const c = creneauxSuggeres(new Date('2026-09-15T12:00:00'));
    expect(c.some((x) => /vendredi|samedi|dimanche|mercredi/.test(x.libelle))).toBe(true);
  });
});

describe('terrainsProches', () => {
  const MASSY = { lat: 48.726, lon: 2.283 };

  it('rend les plus proches d’abord', () => {
    const t = terrainsProches(MASSY, 3);
    expect(t).toHaveLength(3);
    for (let i = 1; i < t.length; i++) {
      expect(t[i].km!).toBeGreaterThanOrEqual(t[i - 1].km!);
    }
  });

  it('tient sans domicile connu, sans inventer de classement', () => {
    const t = terrainsProches(null, 3);
    expect(t).toHaveLength(3);
    expect(t.every((x) => x.km === null)).toBe(true);
  });
});

describe('etatCreation', () => {
  it('dit ce qui manque, en clair', () => {
    expect(etatCreation(null, []).manque).toMatch(/terrain/);
    expect(etatCreation('Le Five', []).manque).toMatch(/créneau/);
    expect(etatCreation('Le Five', [1]).pret).toBe(true);
  });

  // La borne reflète exactement la règle Firestore.
  it('refuse plus de dix créneaux, comme la règle serveur', () => {
    expect(etatCreation('Le Five', Array(11).fill(1)).pret).toBe(false);
  });
});
