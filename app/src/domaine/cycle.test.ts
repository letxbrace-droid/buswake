import { describe, it, expect } from 'vitest';
import {
  aVote, basculerVote, creneauGagnant, finVisibleApres, peutConfirmer,
  placeEnRejoignant, quitter, rejoindre, VISIBLE_APRES_MS,
} from './cycle';
import type { Match } from './schemas';

const H = (n: number) => new Date(Date.now() + n * 3600e3);

function match(p: Partial<Match> & { waitlist?: string[] } = {}): Match {
  return {
    id: 'm', createur: 'c', sport: 'foot5', statut: 'sondage',
    joueursInscrits: [], creneauxProposes: [], dateFinale: null, lieuFinal: '',
    finVisible: H(48), joueursMax: 10, ...p,
  } as Match;
}

describe('vote', () => {
  it('est un interrupteur : voter deux fois retire le vote', () => {
    let v = basculerVote({}, '0', 'u1');
    expect(aVote(v, '0', 'u1')).toBe(true);
    v = basculerVote(v, '0', 'u1');
    expect(aVote(v, '0', 'u1')).toBe(false);
  });

  it('n’efface pas les votes des autres', () => {
    const v = basculerVote(basculerVote({}, '0', 'a'), '0', 'b');
    expect(v['0']).toEqual(['a', 'b']);
  });
});

describe('creneauGagnant', () => {
  const m = match({
    creneauxProposes: [
      { date: H(72), lieu: 'A', votes: [] },
      { date: H(24), lieu: 'B', votes: [] },
    ],
  });

  it('désigne le plus voté', () => {
    expect(creneauGagnant(m, { '0': ['a', 'b'], '1': ['c'] })?.index).toBe(0);
  });

  it('à égalité, le plus TÔT gagne — il laisse moins de temps au match de se déliter', () => {
    expect(creneauGagnant(m, { '0': ['a'], '1': ['b'] })?.index).toBe(1);
  });

  it('ne désigne personne quand personne n’a voté', () => {
    expect(creneauGagnant(m, {})).toBeNull();
  });
});

describe('rejoindre', () => {
  it('met sur le banc plutôt que de refuser — un « complet » sec fait partir le joueur', () => {
    const plein = match({ joueursInscrits: Array.from({ length: 10 }, (_, i) => `t${i}`) });
    expect(placeEnRejoignant(plein, 'u1')).toBe('banc');
    expect(rejoindre(plein, 'u1').waitlist).toEqual(['u1']);
  });

  it('entre comme titulaire tant qu’il reste de la place', () => {
    const r = rejoindre(match({ joueursInscrits: ['a'] }), 'u1');
    expect(r.joueursInscrits).toEqual(['a', 'u1']);
  });

  it('sort du banc en entrant sur le terrain', () => {
    const r = rejoindre(match({ joueursInscrits: ['a'], waitlist: ['u1'] }), 'u1');
    expect(r.joueursInscrits).toContain('u1');
    expect(r.waitlist).not.toContain('u1');
  });

  it('est idempotent : rejoindre deux fois ne duplique pas', () => {
    const une = rejoindre(match({ joueursInscrits: ['u1'] }), 'u1');
    expect(une.joueursInscrits).toEqual(['u1']);
  });
});

describe('quitter', () => {
  // LA règle subtile : sans elle, un match tombe à 9 alors que quelqu'un
  // attendait d'entrer, et personne ne s'en aperçoit avant le coup d'envoi.
  it('promeut LE PREMIER du banc quand un titulaire part', () => {
    const m = match({ joueursInscrits: ['a', 'u1', 'c'], waitlist: ['r1', 'r2'] });
    const r = quitter(m, 'u1');
    expect(r.promu).toBe('r1');
    expect(r.joueursInscrits).toEqual(['a', 'c', 'r1']);
    expect(r.waitlist).toEqual(['r2']);
  });

  it('ne promeut personne quand le banc est vide', () => {
    const r = quitter(match({ joueursInscrits: ['a', 'u1'] }), 'u1');
    expect(r.promu).toBeNull();
    expect(r.joueursInscrits).toEqual(['a']);
  });

  it('quitter le banc ne touche pas aux titulaires', () => {
    const r = quitter(match({ joueursInscrits: ['a'], waitlist: ['u1', 'r2'] }), 'u1');
    expect(r.joueursInscrits).toEqual(['a']);
    expect(r.waitlist).toEqual(['r2']);
    expect(r.promu).toBeNull();
  });

  it('l’effectif ne change pas quand un titulaire part et qu’un remplaçant entre', () => {
    const m = match({ joueursInscrits: ['a', 'b', 'u1'], waitlist: ['r1'] });
    expect(quitter(m, 'u1').joueursInscrits).toHaveLength(m.joueursInscrits.length);
  });
});

describe('peutConfirmer', () => {
  it('refuse un match incomplet — confirmer à huit, c’est promettre un match qui n’aura pas lieu', () => {
    const c = peutConfirmer(match({ joueursInscrits: ['a', 'b'] }));
    expect(c.peut).toBe(false);
    expect(c.manque).toBe(8);
  });

  it('accepte dès que l’effectif est atteint', () => {
    expect(peutConfirmer(match({ joueursInscrits: Array(10).fill('x') })).peut).toBe(true);
  });

  it('suit joueursMax et pas un 10 codé en dur', () => {
    const c = peutConfirmer(match({ joueursMax: 6, joueursInscrits: Array(6).fill('x') }));
    expect(c.peut).toBe(true);
    expect(c.requis).toBe(6);
  });
});

describe('finVisibleApres', () => {
  it('garde le match 24 h après le coup d’envoi, le temps d’y saisir le score', () => {
    const d = new Date('2026-09-17T18:30:00Z');
    expect(finVisibleApres(d).getTime() - d.getTime()).toBe(VISIBLE_APRES_MS);
  });
});
