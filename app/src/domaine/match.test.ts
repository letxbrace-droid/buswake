import { describe, it, expect } from 'vitest';
import { peutCreerUnMatch, titulaires, maxJoueurs, versDate } from './match';
import type { Match } from './schemas';

const DANS_2H = new Date(Date.now() + 2 * 3600e3);
const IL_Y_A_3_SEMAINES = new Date(Date.now() - 21 * 24 * 3600e3);

function match(p: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    createurUid: 'u1',
    sport: 'foot5',
    statut: 'sondage',
    joueursInscrits: [],
    creneauxProposes: [],
    dateFinale: null,
    lieuFinal: '',
    finVisible: DANS_2H,
    joueursMax: 10,
    duree: 60,
    niveau: 'tous',
    message: '',
    ...p,
  };
}

describe('peutCreerUnMatch', () => {
  it('laisse créer quand on ne joue nulle part', () => {
    expect(peutCreerUnMatch('u1', []).peut).toBe(true);
  });

  it('bloque quand on est titulaire d’un match vivant et à venir', () => {
    const r = peutCreerUnMatch('u1', [match({ joueursInscrits: ['u1'] })]);
    expect(r.peut).toBe(false);
    expect(r.bloquePar?.id).toBe('m1');
  });

  // ===== LE BUG VÉCU EN PRODUCTION =====
  // « Quand je veux créer un match ça me dit que je joue déjà dans un match
  //   alors que non. » Un match de trois semaines resté en 'sondage' parce
  //   que personne ne l'avait clos bloquait ses inscrits à vie.
  it('ne bloque PAS sur un match périmé resté ouvert', () => {
    const vieux = match({ joueursInscrits: ['u1'], finVisible: IL_Y_A_3_SEMAINES });
    expect(peutCreerUnMatch('u1', [vieux]).peut).toBe(true);
  });

  it('ne bloque PAS un remplaçant — seuls les titulaires occupent une place', () => {
    const complet = match({
      joueursMax: 10,
      joueursInscrits: [...Array.from({ length: 10 }, (_, i) => `t${i}`), 'u1'],
    });
    expect(peutCreerUnMatch('u1', [complet]).peut).toBe(true);
  });

  it('ne bloque PAS sur un match terminé ou annulé', () => {
    expect(peutCreerUnMatch('u1', [match({ joueursInscrits: ['u1'], statut: 'terminé' })]).peut).toBe(true);
    expect(peutCreerUnMatch('u1', [match({ joueursInscrits: ['u1'], statut: 'annulé' })]).peut).toBe(true);
  });

  it('ne bloque PAS sur un document sans finVisible — un match sans horizon n’enferme personne', () => {
    expect(peutCreerUnMatch('u1', [match({ joueursInscrits: ['u1'], finVisible: null })]).peut).toBe(true);
  });

  it('dit OÙ et QUAND : une porte fermée doit avoir une poignée', () => {
    const m = match({ joueursInscrits: ['u1'], creneauxProposes: [{ date: DANS_2H, lieu: 'Le Five Massy', votes: [] }] });
    expect(peutCreerUnMatch('u1', [m]).bloquePar?.ou).toBe('Le Five Massy');
  });
});

describe('titulaires', () => {
  it('coupe à joueursMax, pas à un 10 codé en dur', () => {
    const m = match({ joueursMax: 4, joueursInscrits: ['a', 'b', 'c', 'd', 'e'] });
    expect(titulaires(m)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('retombe sur 10 quand joueursMax est aberrant', () => {
    expect(maxJoueurs({ joueursMax: 999 as number })).toBe(10);
  });
});

describe('versDate', () => {
  it('lit les trois formes rencontrées : Date, Timestamp, nombre', () => {
    const d = new Date('2026-09-15T18:00:00Z');
    expect(versDate(d)).toEqual(d);
    expect(versDate({ seconds: Math.floor(d.getTime() / 1000) })?.getTime()).toBe(d.getTime());
    expect(versDate(d.getTime())?.getTime()).toBe(d.getTime());
  });

  it('ne jette jamais sur une saleté', () => {
    expect(versDate(undefined)).toBeNull();
    expect(versDate('pas une date')).toBeNull();
  });
});
