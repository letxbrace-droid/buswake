import { describe, it, expect } from 'vitest';
import {
  basculerPresence, bilanPresences, lireScore, peutTerminer, presencesParDefaut,
  SCORE_MAX, validerResultat, ajusterCompteur, totalCompteur, MAX_PAR_JOUEUR,
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
    const v = validerResultat(DIX, { scoreA: 0, scoreB: 0, hommeDuMatchUid: 'u3', attendance: p });
    expect(v.ok).toBe(false);
    expect(v.probleme).toMatch(/avoir joué/);
  });

  it('accepte un homme du match présent', () => {
    const p = presencesParDefaut(DIX);
    expect(validerResultat(DIX, { scoreA: 0, scoreB: 0, hommeDuMatchUid: 'u3', attendance: p }).ok).toBe(true);
  });

  it('accepte l’absence d’homme du match — ce n’est pas obligatoire', () => {
    expect(validerResultat(DIX, { scoreA: 0, scoreB: 0, hommeDuMatchUid: null, attendance: presencesParDefaut(DIX) }).ok)
      .toBe(true);
  });

  it('refuse un match où personne n’était là : c’est une annulation, pas une fin', () => {
    const vide = Object.fromEntries(DIX.map((u) => [u, false]));
    const v = validerResultat(DIX, { scoreA: 0, scoreB: 0, hommeDuMatchUid: null, attendance: vide });
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

describe('buts et passes', () => {
  const inscrits = ['a', 'b', 'c'];
  const tous = presencesParDefaut(inscrits);
  const base = { hommeDuMatchUid: null, attendance: tous, scoreA: 3, scoreB: 2 };

  describe('ajusterCompteur', () => {
    it('monte et descend', () => {
      let c = ajusterCompteur({}, 'a', 1);
      expect(c).toEqual({ a: 1 });
      c = ajusterCompteur(c, 'a', 2);
      expect(c).toEqual({ a: 3 });
    });

    // Une table pleine de zéros partirait telle quelle dans Firestore, pour
    // ne rien dire — dix entrées à 0 sur chaque match terminé.
    it('ne laisse pas de zéro derrière', () => {
      expect(ajusterCompteur({ a: 1 }, 'a', -1)).toEqual({});
      expect(ajusterCompteur({ a: 1, b: 2 }, 'a', -5)).toEqual({ b: 2 });
    });

    it('plafonne : neuf buts est une soirée, quarante une faute de frappe', () => {
      expect(ajusterCompteur({ a: MAX_PAR_JOUEUR }, 'a', 5)).toEqual({ a: MAX_PAR_JOUEUR });
    });
  });

  describe('totalCompteur', () => {
    it('additionne, et encaisse une valeur absurde', () => {
      expect(totalCompteur({ a: 2, b: 3 })).toBe(5);
      expect(totalCompteur({})).toBe(0);
      expect(totalCompteur({ a: Number.NaN as number })).toBe(0);
    });
  });

  describe('validerResultat', () => {
    // La seule incohérence qu'on REFUSE : elle ne peut venir que d'une
    // erreur de saisie, et elle gonflerait les statistiques de quelqu'un.
    it('refuse plus de buts attribués que marqués au score', () => {
      const v = validerResultat(inscrits, { ...base, buts: { a: 4, b: 2 }, passes: {} });
      expect(v.ok).toBe(false);
      expect(v.probleme).toContain('6 buts attribués pour 5');
    });

    // « Je ne sais plus qui a marqué le troisième » est le cas normal.
    // Exiger l'exhaustivité ferait renoncer à saisir quoi que ce soit.
    it('tolère qu’il en manque', () => {
      expect(validerResultat(inscrits, { ...base, buts: { a: 2 }, passes: {} }).ok).toBe(true);
      expect(validerResultat(inscrits, { ...base, buts: {}, passes: {} }).ok).toBe(true);
    });

    it('accepte le compte exact', () => {
      expect(validerResultat(inscrits, { ...base, buts: { a: 3, b: 2 }, passes: {} }).ok).toBe(true);
    });

    it('refuse plus de passes décisives que de buts', () => {
      const v = validerResultat(inscrits, { ...base, buts: {}, passes: { a: 6 } });
      expect(v.ok).toBe(false);
      expect(v.probleme).toContain('passes décisives');
    });

    // Un absent ne peut pas avoir marqué : c'est soit la présence, soit le
    // but qui est faux, et dans les deux cas il faut le corriger.
    it('refuse un but attribué à quelqu’un marqué absent', () => {
      const sansC = { ...tous, c: false };
      const v = validerResultat(inscrits, { ...base, attendance: sansC, buts: { c: 1 }, passes: {} });
      expect(v.ok).toBe(false);
      expect(v.probleme).toContain('absent');
    });

    it('marche sans buts ni passes du tout — ils sont facultatifs', () => {
      expect(validerResultat(inscrits, base).ok).toBe(true);
    });
  });
});
