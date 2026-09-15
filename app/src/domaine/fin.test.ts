import { describe, it, expect } from 'vitest';
import {
  basculerPresence, bilanPresences, lireScore, peutTerminer, presencesParDefaut,
  SCORE_MAX, validerResultat,
} from './fin';

const DIX = Array.from({ length: 10 }, (_, i) => `u${i}`);

describe('lireScore', () => {
  it('ne laisse jamais passer NaN — un champ vide partait tel quel dans le score', () => {
    expect(lireScore('')).toBe(0);
    expect(lireScore(null)).toBe(0);
    expect(lireScore('abc')).toBe(0);
  });

  it('borne à 0 et à 99', () => {
    expect(lireScore(-5)).toBe(0);
    expect(lireScore(500)).toBe(SCORE_MAX);
    expect(lireScore('7')).toBe(7);
  });

  it('refuse les décimaux : on ne marque pas 2,5 buts', () => {
    expect(lireScore(2.9)).toBe(2);
  });
});

describe('présences', () => {
  it('sont à PRÉSENT par défaut — on signale les absents, on ne coche pas dix présents', () => {
    const p = presencesParDefaut(DIX);
    expect(bilanPresences(DIX, p).presents).toHaveLength(10);
  });

  it('basculent dans les deux sens', () => {
    let p = presencesParDefaut(DIX);
    p = basculerPresence(p, 'u3');
    expect(bilanPresences(DIX, p).absents).toEqual(['u3']);
    p = basculerPresence(p, 'u3');
    expect(bilanPresences(DIX, p).absents).toEqual([]);
  });
});

describe('validerResultat', () => {
  // Sans cette règle, élire un absent lui donnerait 200 XP pour être resté
  // chez lui — et la Cloud Function les attribuerait sans discuter.
  it('refuse un homme du match absent', () => {
    const p = basculerPresence(presencesParDefaut(DIX), 'u3');
    const v = validerResultat(DIX, { hommeDuMatchUid: 'u3', attendance: p });
    expect(v.ok).toBe(false);
    expect(v.probleme).toMatch(/avoir joué/);
  });

  it('accepte un homme du match présent', () => {
    const p = presencesParDefaut(DIX);
    expect(validerResultat(DIX, { hommeDuMatchUid: 'u3', attendance: p }).ok).toBe(true);
  });

  it('accepte l’absence d’homme du match — ce n’est pas obligatoire', () => {
    expect(validerResultat(DIX, { hommeDuMatchUid: null, attendance: presencesParDefaut(DIX) }).ok)
      .toBe(true);
  });

  it('refuse un match où personne n’était là : c’est une annulation, pas une fin', () => {
    const vide = Object.fromEntries(DIX.map((u) => [u, false]));
    const v = validerResultat(DIX, { hommeDuMatchUid: null, attendance: vide });
    expect(v.ok).toBe(false);
    expect(v.probleme).toMatch(/annule/);
  });
});

describe('peutTerminer', () => {
  it('n’accepte qu’un match confirmé — terminer un sondage sauterait l’engagement', () => {
    expect(peutTerminer({ statut: 'confirmé' })).toBe(true);
    expect(peutTerminer({ statut: 'sondage' })).toBe(false);
    expect(peutTerminer({ statut: 'terminé' })).toBe(false);
  });
});
