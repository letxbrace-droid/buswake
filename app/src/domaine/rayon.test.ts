import { describe, it, expect } from 'vitest';
import {
  RAYONS, RAYON_DEFAUT, libelleRayon, haversine, positionDuMatch,
  distanceMatchKm, dansLeRayon, libelleDistance,
} from './rayon';
import type { Match } from './schemas';

const PARIS = { lat: 48.8566, lon: 2.3522 };
const LYON = { lat: 45.764, lon: 4.8357 };

const m = (p: Record<string, unknown> = {}): Match =>
  ({
    id: 'm', createurUid: 'c', sport: 'foot5', statut: 'confirmé',
    joueursInscrits: [], creneauxProposes: [], dateFinale: null, lieuFinal: '',
    finVisible: null, joueursMax: 10, ...p,
  }) as unknown as Match;

describe('haversine', () => {
  // Paris–Lyon à vol d'oiseau. Une formule de distance qui se trompe d'un
  // facteur (degrés/radians, rayon en mètres) reste plausible à l'œil :
  // seule une distance connue le montre.
  //
  // La valeur n'est pas recopiée de la sortie du code — elle est vérifiée
  // par une formule DIFFÉRENTE, la loi des cosinus sphérique, qui donne
  // 391,499 km sur les mêmes coordonnées et avec le même rayon terrestre.
  it('mesure une distance connue', () => {
    expect(haversine(PARIS, LYON)).toBeCloseTo(391.5, 1);
  });

  it('est nulle sur place et symétrique', () => {
    expect(haversine(PARIS, PARIS)).toBe(0);
    expect(haversine(PARIS, LYON)).toBeCloseTo(haversine(LYON, PARIS), 9);
  });
});

describe('positionDuMatch', () => {
  it('préfère les coordonnées finales', () => {
    const match = m({ lieuCoords: PARIS, creneauxProposes: [{ lat: LYON.lat, lon: LYON.lon }] });
    expect(positionDuMatch(match)).toEqual(PARIS);
  });

  it('retombe sur le premier créneau qui en porte', () => {
    const match = m({ creneauxProposes: [{ lieu: 'sans coords' }, { lat: LYON.lat, lon: LYON.lon }] });
    expect(positionDuMatch(match)).toEqual({ lat: LYON.lat, lon: LYON.lon });
  });

  it('rend null quand rien n’est localisé', () => {
    expect(positionDuMatch(m())).toBeNull();
    expect(distanceMatchKm(m(), PARIS)).toBeNull();
    expect(distanceMatchKm(m({ lieuCoords: LYON }), null)).toBeNull();
  });
});

describe('dansLeRayon', () => {
  const loin = m({ lieuCoords: LYON });

  it('garde toujours un match où je suis inscrit, même hors rayon', () => {
    expect(dansLeRayon(loin, 'moi', 5, PARIS)).toBe(false);
    expect(dansLeRayon(m({ lieuCoords: LYON, joueursInscrits: ['moi'] }), 'moi', 5, PARIS)).toBe(true);
    expect(dansLeRayon(m({ lieuCoords: LYON, createurUid: 'moi' }), 'moi', 5, PARIS)).toBe(true);
  });

  // On ne cache pas par ignorance : un match sans coordonnées se montre et
  // le joueur juge. L'inverse ferait disparaître des matchs sans que
  // personne ne comprenne pourquoi.
  it('ne masque jamais un match non localisé', () => {
    expect(dansLeRayon(m(), 'moi', 5, PARIS)).toBe(true);
    expect(dansLeRayon(loin, 'moi', 25, null)).toBe(true);
  });

  it('« partout » (0) ne filtre rien', () => {
    expect(dansLeRayon(loin, 'moi', 0, PARIS)).toBe(true);
    expect(RAYONS).toContain(0);
  });

  it('compare bien à la borne, incluse', () => {
    const proche = m({ lieuCoords: { lat: 48.9, lon: 2.3522 } });   // ~4,8 km
    expect(dansLeRayon(proche, 'moi', 5, PARIS)).toBe(true);
    expect(dansLeRayon(proche, 'moi', 4, PARIS)).toBe(false);
  });

  it('marche sans utilisateur connecté', () => {
    expect(dansLeRayon(loin, null, 5, PARIS)).toBe(false);
    expect(dansLeRayon(loin, null, 0, PARIS)).toBe(true);
  });
});

describe('libellés', () => {
  it('nomme le rayon', () => {
    expect(libelleRayon(0)).toBe('Partout');
    expect(libelleRayon(25)).toBe('25 km');
    expect(RAYONS).toContain(RAYON_DEFAUT);
  });

  // La décimale ne sert qu'au proche : « 23,4 km » est une fausse précision.
  it('n’affiche la décimale que sous 10 km, avec une virgule', () => {
    expect(libelleDistance(8.42)).toBe('8,4 km');
    expect(libelleDistance(23.4)).toBe('23 km');
    expect(libelleDistance(null)).toBe('');
  });
});
