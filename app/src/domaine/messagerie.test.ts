import { describe, it, expect } from 'vitest';
import { mesFils } from './messagerie';
import type { Match } from './schemas';

const MAINTENANT = new Date('2026-09-24T12:00:00Z');
const h = (n: number) => new Date(MAINTENANT.getTime() + n * 3600_000);

const m = (p: Partial<Match> = {}): Match =>
  ({
    id: 'm', createurUid: 'c', sport: 'foot5', statut: 'confirmé',
    joueursInscrits: [], creneauxProposes: [], dateFinale: null, lieuFinal: '',
    finVisible: null, joueursMax: 10, ...p,
  }) as Match;

describe('mesFils', () => {
  it('ne montre que les matchs où je joue', () => {
    const mien = m({ id: 'a', joueursInscrits: ['moi'], dateFinale: h(3) });
    const autre = m({ id: 'b', joueursInscrits: ['x'], dateFinale: h(3) });
    expect(mesFils([mien, autre], 'moi', MAINTENANT).map((f) => f.matchId)).toEqual(['a']);
  });

  it('ne montre rien à un visiteur déconnecté', () => {
    expect(mesFils([m({ joueursInscrits: ['moi'] })], null, MAINTENANT)).toEqual([]);
  });

  // Un fil fermé ne sert plus qu'à relire. Le mettre au-dessus d'une
  // conversation en cours ferait rater l'organisation du match de ce soir.
  it('met les fils ouverts en premier', () => {
    const ferme = m({ id: 'ferme', joueursInscrits: ['moi'], dateFinale: h(-72) });
    const ouvert = m({ id: 'ouvert', joueursInscrits: ['moi'], dateFinale: h(-100) });
    // `ouvert` est plus ancien mais n'a pas d'heure passée de 24 h… on force :
    const fils = mesFils([ferme, m({ id: 'ouvert', joueursInscrits: ['moi'], dateFinale: h(5) })], 'moi', MAINTENANT);
    expect(fils[0].matchId).toBe('ouvert');
    expect(fils[0].ouvert).toBe(true);
    expect(ouvert).toBeDefined();
  });

  it('classe les fils ouverts du plus récent au plus ancien', () => {
    const fils = mesFils(
      [
        m({ id: 'tard', joueursInscrits: ['moi'], dateFinale: h(10) }),
        m({ id: 'tot', joueursInscrits: ['moi'], dateFinale: h(2) }),
      ],
      'moi', MAINTENANT,
    );
    expect(fils.map((f) => f.matchId)).toEqual(['tard', 'tot']);
  });

  it('nomme le fil par son lieu, et retombe sur le créneau proposé', () => {
    expect(mesFils([m({ joueursInscrits: ['moi'], lieuFinal: 'LE FIVE Massy' })], 'moi', MAINTENANT)[0].titre)
      .toBe('LE FIVE Massy');
    expect(
      mesFils([m({ joueursInscrits: ['moi'], creneauxProposes: [{ date: h(2), lieu: 'Morangis', votes: [] }] })], 'moi', MAINTENANT)[0].titre,
    ).toBe('Morangis');
    expect(mesFils([m({ joueursInscrits: ['moi'] })], 'moi', MAINTENANT)[0].titre).toBe('Match');
  });

  // Le chat ferme 24 h après le coup d'envoi : un fil qui survit au match
  // devient un groupe que personne ne quitte.
  it('dit si le fil est encore ouvert', () => {
    expect(mesFils([m({ joueursInscrits: ['moi'], dateFinale: h(-3) })], 'moi', MAINTENANT)[0].ouvert).toBe(true);
    expect(mesFils([m({ joueursInscrits: ['moi'], dateFinale: h(-30) })], 'moi', MAINTENANT)[0].ouvert).toBe(false);
  });
});
