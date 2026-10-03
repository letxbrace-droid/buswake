import { describe, it, expect } from 'vitest';
import { lieuSaisi, lireAdresses, problemeLieu } from './lieu';

const ban = {
  type: 'FeatureCollection',
  features: [
    { geometry: { type: 'Point', coordinates: [2.3176, 48.7069] },
      properties: { label: '81 Avenue Ferdinand de Lesseps 91420 Morangis', type: 'housenumber' } },
    { geometry: { type: 'Point', coordinates: [2.31, 48.70] },
      properties: { label: 'Avenue Ferdinand de Lesseps 91420 Morangis', type: 'street' } },
    { geometry: { type: 'Point', coordinates: [2.31, 48.70] },
      properties: { label: '81 Avenue Ferdinand de Lesseps 91420 Morangis', type: 'housenumber' } },
    { geometry: { coordinates: ['x', 1] }, properties: { label: 'Cassé' } },
    { geometry: { coordinates: [2, 48] }, properties: {} },
  ],
};

describe('suggestions d’adresse', () => {
  it('lit [lon, lat] dans le bon ordre', () => {
    const [a] = lireAdresses(ban);
    expect(a.lat).toBeCloseTo(48.7069);
    expect(a.lon).toBeCloseTo(2.3176);
  });
  it('dit si l’adresse va jusqu’au numéro', () => {
    const r = lireAdresses(ban);
    expect(r[0].precise).toBe(true);
    expect(r[1].precise).toBe(false);
  });
  it('écarte doublons, coordonnées cassées et éléments sans libellé', () => {
    expect(lireAdresses(ban)).toHaveLength(2);
  });
  it('une réponse illisible ne fait pas tomber l’écran', () => {
    expect(lireAdresses(null)).toEqual([]);
    expect(lireAdresses({ features: 'non' })).toEqual([]);
  });
});

describe('lieu saisi', () => {
  it('exige un nom et une adresse', () => {
    expect(problemeLieu({ nom: '', adresse: '81 av. de Lesseps' })).toMatch(/nom/);
    expect(problemeLieu({ nom: 'Five', adresse: '' })).toMatch(/adresse/);
    expect(problemeLieu({ nom: 'Five Massy', adresse: '3 rue X, Massy' })).toBeNull();
  });
  it('garde les coordonnées de la suggestion choisie', () => {
    const [a] = lireAdresses(ban);
    const l = lieuSaisi(' Five  Morangis ', a.libelle, a);
    expect(l).toMatchObject({ nom: 'Five Morangis', lat: a.lat, verifie: false });
  });
  it('les oublie si l’adresse a été retouchée après le choix', () => {
    const [a] = lireAdresses(ban);
    const l = lieuSaisi('Five', a.libelle + ' bis', a);
    expect(l.lat).toBeNull();
  });
});
