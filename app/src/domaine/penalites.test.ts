import { describe, it, expect } from 'vitest';
import sourceFonctions from '../../../functions/index.js?raw';
import { apercuDesistement, PENALITE, penaliteDesistement } from './penalites';

describe('barème de fiabilité', () => {
  it('identique à celui du serveur', () => {
    const m = sourceFonctions.match(/const PENALITE = (\{[^}]*\})/);
    expect(m, 'PENALITE introuvable dans functions/index.js').not.toBeNull();
    expect(JSON.parse(m![1].replace(/(\w+):/g, '"$1":'))).toEqual({ ...PENALITE });
  });
  it('même calcul que le serveur', () => {
    const corps = sourceFonctions.match(/function penaliteDesistement\(heuresAvant, remplace\) \{([\s\S]*?)\n\}/);
    expect(corps).not.toBeNull();
    const serveur = new Function('PENALITE', 'heuresAvant', 'remplace', corps![1]);
    for (const h of [100, 48, 47.9, 30, 24, 23.9, 2, -1]) {
      for (const r of [false, true]) expect(penaliteDesistement(h, r)).toBe(serveur(PENALITE, h, r));
    }
  });
});

describe('aperçu avant de se désister', () => {
  const dans = (h: number) => new Date(Date.now() + h * 3600000);
  it('gratuit à plus de 48 h', () => {
    expect(apercuDesistement({ statut: 'confirmé', dateFinale: dans(72), waitlist: [] })?.xp).toBe(0);
  });
  it('−25 à moins de 24 h, −12 si le banc te remplace', () => {
    const a = apercuDesistement({ statut: 'confirmé', dateFinale: dans(5), waitlist: ['r'] });
    expect(a).toMatchObject({ xp: -25, xpSiRemplace: -12, tardif: true, remplacantPret: true });
  });
  it('rien tant que la date n’est pas fixée', () => {
    expect(apercuDesistement({ statut: 'sondage', dateFinale: null, waitlist: [] })).toBeNull();
  });
});
