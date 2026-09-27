import { describe, it, expect } from 'vitest';
import sourceFonctions from '../../../functions/index.js?raw';
import {
  avertissementEffectif, coupDEnvoi, EXPLICATION_REFUS, GARDE, presentsMin,
  terminableMaintenant,
} from './garde';

describe('garde-fous : le client prévient avec les seuils du serveur', () => {
  // Le serveur décide, l'écran prévient. S'ils divergent, l'écran promet un
  // match qui paie et le serveur refuse — ou l'inverse.
  it('seuils identiques à ceux de functions/index.js', () => {
    const m = sourceFonctions.match(/const GARDE = (\{[^}]*\})/);
    expect(m, 'GARDE introuvable dans functions/index.js').not.toBeNull();
    const serveur = JSON.parse(m![1].replace(/(\w+):/g, '"$1":'));
    expect(serveur).toEqual({ ...GARDE });
  });

  it('chaque raison de refus du serveur a son explication', () => {
    const raisons = [...sourceFonctions.matchAll(/return '(\w+)';/g)].map((r) => r[1]);
    expect(raisons.length).toBeGreaterThan(0);
    for (const r of raisons) expect(EXPLICATION_REFUS).toHaveProperty(r);
  });
});

describe('coup d’envoi', () => {
  it('est l’instant écrit par la confirmation, heure comprise', () => {
    const d = new Date('2026-07-10T19:30:00Z');
    expect(coupDEnvoi({ dateFinale: d })).toEqual(d);
    expect(coupDEnvoi({ dateFinale: { seconds: d.getTime() / 1000 } })).toEqual(d);
  });
  it('sans date confirmée : inconnu', () => {
    expect(coupDEnvoi({ dateFinale: null })).toBeNull();
  });
});

describe('terminer maintenant ?', () => {
  const m = { statut: 'confirmé' as const, dateFinale: new Date('2026-07-10T18:00:00Z') };
  it('non, avant le coup d’envoi — et on dit pourquoi', () => {
    const r = terminableMaintenant(m, new Date('2026-07-10T17:59:00Z'));
    expect(r.peut).toBe(false);
    expect(!r.peut && r.pourquoi).toMatch(/coup d’envoi/);
  });
  it('oui, une fois le coup d’envoi passé', () => {
    expect(terminableMaintenant(m, new Date('2026-07-10T18:00:00Z')).peut).toBe(true);
  });
  it('non, sans date confirmée', () => {
    expect(terminableMaintenant({ ...m, dateFinale: null }, new Date('2027-01-01')).peut).toBe(false);
  });
  it('non, pour un sondage', () => {
    expect(terminableMaintenant({ ...m, statut: 'sondage' }, new Date('2027-01-01')).peut).toBe(false);
  });
});

describe('effectif minimum', () => {
  it('quatre pour un match à dix', () => {
    expect(presentsMin({ joueursMax: 10 })).toBe(4);
  });
  it('jamais plus que l’effectif du match', () => {
    expect(presentsMin({ joueursMax: 2 })).toBe(2);
  });
  it('prévient sous le seuil, se tait au-dessus', () => {
    expect(avertissementEffectif({ joueursMax: 10 }, 3)).toMatch(/ni XP ni statistiques/);
    expect(avertissementEffectif({ joueursMax: 10 }, 4)).toBeNull();
  });
});
