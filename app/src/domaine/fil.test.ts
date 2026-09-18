import { describe, it, expect } from 'vitest';
import { rangerFil, compter, type ContexteFil } from './fil';
import type { Match } from './schemas';

const DANS_2H = new Date(Date.now() + 2 * 3600e3);
const MASSY = { lat: 48.726, lon: 2.283 };
const LILLE = { lat: 50.629, lon: 3.057 };

function match(p: Partial<Match> & { lieuCoords?: { lat: number; lon: number } } = {}): Match {
  return {
    id: Math.random().toString(36).slice(2),
    createurUid: 'autre',
    sport: 'foot5',
    statut: 'sondage',
    joueursInscrits: [],
    creneauxProposes: [],
    dateFinale: null,
    lieuFinal: '',
    finVisible: DANS_2H,
    joueursMax: 10,
    ...p,
  } as Match;
}

const ctx = (p: Partial<ContexteFil> = {}): ContexteFil => ({
  uid: 'u1',
  km: 25,
  domicile: MASSY,
  ...p,
});

describe('rangerFil', () => {
  // ===== LE BUG VÉCU : « À caler 2 » au-dessus d'une liste vide =====
  it('le compteur ne compte QUE ce que la liste sait montrer', () => {
    const loin = match({ lieuCoords: LILLE });
    const fil = rangerFil([loin], ctx());
    expect(fil.sondage).toHaveLength(0);
    expect(compter(fil).sondage).toBe(0);
  });

  it('compteurs et liste sortent de la même source — ils ne peuvent pas diverger', () => {
    const fil = rangerFil(
      [match({ lieuCoords: MASSY }), match({ lieuCoords: LILLE }), match({ lieuCoords: MASSY })],
      ctx(),
    );
    expect(compter(fil).sondage).toBe(fil.sondage.length);
  });

  it('garde MES matchs même hors rayon — on ne cache pas un match où je joue', () => {
    const mien = match({ lieuCoords: LILLE, joueursInscrits: ['u1'] });
    expect(rangerFil([mien], ctx()).sondage).toHaveLength(1);
  });

  it('ne masque jamais un match sans coordonnées : on ne cache pas par ignorance', () => {
    expect(rangerFil([match()], ctx()).sondage).toHaveLength(1);
  });

  it('rayon 0 = partout', () => {
    expect(rangerFil([match({ lieuCoords: LILLE })], ctx({ km: 0 })).sondage).toHaveLength(1);
  });

  it("l'historique ignore le rayon — un match joué reste à soi", () => {
    const vieux = match({ statut: 'terminé', lieuCoords: LILLE, joueursInscrits: ['u1'] });
    expect(rangerFil([vieux], ctx()).termine).toHaveLength(1);
  });
});

describe('compter', () => {
  it('compte les places réellement à prendre', () => {
    const fil = rangerFil(
      [
        match({ statut: 'confirmé', joueursMax: 10, joueursInscrits: ['a', 'b'] }),
        match({ statut: 'confirmé', joueursMax: 10, joueursInscrits: Array(10).fill('x') }),
      ],
      ctx(),
    );
    expect(compter(fil).places).toBe(8);
  });

  it('ne descend jamais sous zéro quand un match déborde', () => {
    const fil = rangerFil(
      [match({ statut: 'confirmé', joueursMax: 10, joueursInscrits: Array(14).fill('x') })],
      ctx(),
    );
    expect(compter(fil).places).toBe(0);
  });
});
