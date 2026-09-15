import { describe, it, expect } from 'vitest';
import {
  banc, CAMPS_PAR_DEFAUT, etatComposition, placer, repartirAlternativement, retirer,
} from './composition';

const SIX = ['a', 'b', 'c', 'd', 'e', 'f'];
const vides = () => CAMPS_PAR_DEFAUT.map((c) => ({ ...c, joueurs: [] as string[] }));

describe('placer', () => {
  it('retire le joueur de l’autre camp — sinon il joue des deux côtés', () => {
    let c = placer(vides(), 'a', 0);
    c = placer(c, 'a', 1);
    expect(c[0].joueurs).toEqual([]);
    expect(c[1].joueurs).toEqual(['a']);
  });

  it('est idempotent dans le même camp', () => {
    let c = placer(vides(), 'a', 0);
    c = placer(c, 'a', 0);
    expect(c[0].joueurs).toEqual(['a']);
  });
});

describe('banc', () => {
  it('contient tout ce qui n’est pas encore placé', () => {
    const c = placer(placer(vides(), 'a', 0), 'b', 1);
    expect(banc(SIX, c)).toEqual(['c', 'd', 'e', 'f']);
  });

  it('se vide quand tout le monde est placé', () => {
    const c = repartirAlternativement(SIX, vides());
    expect(banc(SIX, c)).toEqual([]);
  });
});

describe('repartirAlternativement', () => {
  it('répartit à parts égales', () => {
    const c = repartirAlternativement(SIX, vides());
    expect(c[0].joueurs).toHaveLength(3);
    expect(c[1].joueurs).toHaveLength(3);
  });

  it('rattrape un camp déjà rempli à la main plutôt que de creuser l’écart', () => {
    const depart = placer(placer(vides(), 'a', 0), 'b', 0);
    const c = repartirAlternativement(SIX, depart);
    expect(Math.abs(c[0].joueurs.length - c[1].joueurs.length)).toBeLessThanOrEqual(1);
  });

  it('ne déplace pas ceux qui sont déjà placés', () => {
    const depart = placer(vides(), 'f', 1);
    const c = repartirAlternativement(SIX, depart);
    expect(c[1].joueurs).toContain('f');
  });

  it('laisse un écart de 1 sur un effectif impair', () => {
    const c = repartirAlternativement(['a', 'b', 'c'], vides());
    expect(etatComposition(['a', 'b', 'c'], c).ecart).toBe(1);
  });
});

describe('retirer', () => {
  it('renvoie le joueur sur le banc', () => {
    const c = retirer(placer(vides(), 'a', 0), 'a');
    expect(banc(SIX, c)).toContain('a');
  });
});
