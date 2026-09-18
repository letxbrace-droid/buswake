import { describe, it, expect } from 'vitest';
import { construirePulse, MAX_POINTS, UNITE } from './pulse';

describe('construirePulse', () => {
  it('pose un point par place, et allume ceux qui sont pris', () => {
    const p = construirePulse(3, 10);
    expect(p.points).toHaveLength(10);
    expect(p.points.filter((x) => x.pris)).toHaveLength(3);
    expect(p.points.slice(0, 3).every((x) => x.pris)).toBe(true);
    expect(p.points.slice(3).every((x) => !x.pris)).toBe(true);
  });

  // C'est ce qui fait un GROUPE et non une jauge : le lien existe entre deux
  // personnes présentes, pas entre une présente et une absente.
  it('n’allume un segment que si ses DEUX extrémités sont prises', () => {
    const p = construirePulse(3, 10);
    expect(p.segments).toHaveLength(9);
    // Points 0,1,2 pris → segments 0-1 et 1-2 allumés, pas 2-3.
    expect(p.segments.map((s) => s.allume).slice(0, 4)).toEqual([true, true, false, false]);
  });

  it('n’allume aucun segment quand une seule place est prise', () => {
    expect(construirePulse(1, 12).segments.every((s) => !s.allume)).toBe(true);
  });

  it('allume tout quand le groupe est au complet', () => {
    const p = construirePulse(10, 10);
    expect(p.points.every((x) => x.pris)).toBe(true);
    expect(p.segments.every((s) => s.allume)).toBe(true);
  });

  it('un point pris est plus gros qu’un point libre', () => {
    const p = construirePulse(1, 3);
    expect(p.points[0].r).toBeGreaterThan(p.points[1].r);
  });

  it('porte le rang de chaque point — c’est lui qui décale l’animation', () => {
    const p = construirePulse(4, 6);
    expect(p.points.map((x) => x.i)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(p.segments.map((x) => x.i)).toEqual([0, 1, 2, 3, 4]);
  });

  it('mesure la largeur sur la grille', () => {
    expect(construirePulse(0, 12).largeur).toBe(12 * UNITE);
  });

  // Les bornes ne sont pas du zèle : `joueursInscrits` vient de la base, et
  // un document ancien peut porter n'importe quoi.
  it('encaisse des valeurs absurdes sans rien casser', () => {
    expect(construirePulse(-5, 10).pris).toBe(0);
    expect(construirePulse(99, 10).pris).toBe(10);
    expect(construirePulse(3, 0).total).toBe(1);
    expect(construirePulse(3, 9999).total).toBe(MAX_POINTS);
    expect(construirePulse(Number.NaN, Number.NaN).total).toBe(1);
  });
});
