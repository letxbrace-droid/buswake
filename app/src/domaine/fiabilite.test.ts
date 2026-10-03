import { describe, it, expect } from 'vitest';
import { fiabilite, libelleFiabilite } from './fiabilite';

const J = (n: number) => Array(n).fill('J');

describe('fiabilité', () => {
  it('ne juge pas un nouveau', () => {
    expect(fiabilite(['J', 'L']).statut).toBe('nouveau');
    expect(fiabilite(undefined).statut).toBe('nouveau');
  });
  it('fiable à 90 % et plus', () => {
    expect(fiabilite([...J(9), 'D']).statut).toBe('fiable');
  });
  it('lapin sous 70 %', () => {
    expect(fiabilite([...J(6), 'D', 'D', 'D', 'L']).statut).toBe('lapin');
  });
  it('lapin dès deux lapins récents, même à 80 %', () => {
    expect(fiabilite([...J(8), 'L', 'L']).statut).toBe('lapin');
  });
  it('neutre entre les deux', () => {
    expect(fiabilite([...J(8), 'D', 'L']).statut).toBe('neutre');
  });
  it('on se rachète : seuls les 10 derniers comptent', () => {
    expect(fiabilite(['L', 'L', 'L', ...J(10)]).statut).toBe('fiable');
  });
  it('ignore une valeur inconnue', () => {
    expect(fiabilite(['J', 'J', 'J', 'X']).matchs).toBe(3);
  });
  it('dit les lapins en clair', () => {
    expect(libelleFiabilite(fiabilite([...J(8), 'L', 'L']))).toMatch(/2 lapins récents · 80 %/);
  });
});
