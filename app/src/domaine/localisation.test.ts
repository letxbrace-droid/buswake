import { describe, it, expect } from 'vitest';
import {
  codePostalValide, domicileAManquer, flouter, GRILLE_POSITION, lireCommunes,
} from './localisation';

describe('codePostalValide', () => {
  it('accepte la métropole, la Corse et l’outre-mer', () => {
    for (const cp of ['91130', '75017', '01000', '20000', '97400', '98800']) {
      expect(codePostalValide(cp), cp).toBe(true);
    }
  });

  it('refuse ce qui n’en est pas un', () => {
    for (const cp of ['', '9113', '911300', '00100', '99000', 'abcde', '91 130']) {
      expect(codePostalValide(cp), cp).toBe(false);
    }
  });

  it('tolère les espaces autour', () => {
    expect(codePostalValide(' 91130 ')).toBe(true);
  });
});

describe('lireCommunes', () => {
  // Réponse réelle de geo.api.gouv.fr/communes?codePostal=91130 (forme).
  const RIS = [{ nom: 'Ris-Orangis', centre: { type: 'Point', coordinates: [2.4145, 48.6517] } }];

  // GeoJSON range les coordonnées en [LONGITUDE, latitude]. Les lire dans
  // l'autre ordre place Ris-Orangis dans l'océan Indien — sans erreur.
  it('lit les coordonnées dans l’ordre GeoJSON : longitude d’abord', () => {
    const l = lireCommunes(RIS)!;
    expect(l.position.lat).toBeCloseTo(48.6517, 4);
    expect(l.position.lon).toBeCloseTo(2.4145, 4);
    expect(l.libelle).toBe('Ris-Orangis');
  });

  it('refuse une coordonnée hors de France — le signe d’un ordre inversé', () => {
    // Même commune, coordonnées permutées : 48° de longitude, c'est l'Iran.
    const inverse = [{ nom: 'Ris-Orangis', centre: { coordinates: [48.6517, 2.4145] } }];
    expect(lireCommunes(inverse)).toBeNull();
  });

  // Un code postal couvre souvent plusieurs communes. On prend leur centre
  // commun, et on dit qu'il y en a plusieurs.
  it('fait la moyenne quand le code couvre plusieurs communes', () => {
    const l = lireCommunes([
      { nom: 'A', centre: { coordinates: [2.0, 48.0] } },
      { nom: 'B', centre: { coordinates: [2.2, 48.2] } },
      { nom: 'C', centre: { coordinates: [2.4, 48.4] } },
    ])!;
    expect(l.position.lat).toBeCloseTo(48.2, 4);
    expect(l.position.lon).toBeCloseTo(2.2, 4);
    expect(l.libelle).toBe('A et 2 autres');
  });

  it('accorde « autre » au singulier', () => {
    const l = lireCommunes([
      { nom: 'A', centre: { coordinates: [2.0, 48.0] } },
      { nom: 'B', centre: { coordinates: [2.2, 48.2] } },
    ])!;
    expect(l.libelle).toBe('A et 1 autre');
  });

  it('marche en outre-mer', () => {
    const cas: [string, number, number][] = [
      ['Saint-Denis (Réunion)', 55.45, -20.88],
      ['Pointe-à-Pitre', -61.53, 16.24],
      ['Fort-de-France', -61.07, 14.6],
      ['Cayenne', -52.33, 4.93],
      ['Mamoudzou', 45.23, -12.78],
      ['Nouméa', 166.45, -22.27],
      ['Papeete', -149.57, -17.54],
    ];
    for (const [nom, lon, lat] of cas) {
      expect(lireCommunes([{ nom, centre: { coordinates: [lon, lat] } }]), nom).not.toBeNull();
    }
  });

  // Toute la métropole, lue à l'envers, doit être rejetée — pas seulement
  // Ris-Orangis. C'est ce que la première version ratait.
  it('rejette n’importe quelle ville de métropole lue à l’envers', () => {
    const villes: [number, number][] = [
      [2.35, 48.86], [5.37, 43.3], [-1.55, 47.22], [7.75, 48.58], [9.45, 42.7], [-4.49, 48.39],
    ];
    for (const [lon, lat] of villes) {
      expect(lireCommunes([{ nom: 'x', centre: { coordinates: [lon, lat] } }]), `${lat},${lon}`).not.toBeNull();
      expect(lireCommunes([{ nom: 'x', centre: { coordinates: [lat, lon] } }]), `inversé ${lat},${lon}`).toBeNull();
    }
  });

  // La réponse vient du réseau : elle peut être vide, tronquée, ou autre
  // chose qu'un tableau. Rien de tout ça ne doit écrire une position.
  it('rend null sur une réponse vide ou malformée', () => {
    for (const r of [[], null, undefined, {}, 'erreur', [{}], [{ centre: {} }],
      [{ centre: { coordinates: ['a', 'b'] } }], [{ centre: { coordinates: [2] } }]]) {
      expect(lireCommunes(r), JSON.stringify(r)).toBeNull();
    }
  });

  it('ignore une commune illisible au milieu des autres', () => {
    const l = lireCommunes([{ nom: 'Casse', centre: {} }, ...RIS])!;
    expect(l.libelle).toBe('Ris-Orangis');
  });
});

describe('flouter', () => {
  /**
   * La collection `users` est lisible par tout joueur connecté. Une position
   * précise à dix mètres y serait une adresse ; ramenée à deux kilomètres,
   * c'est un quartier.
   */
  it('ramène une position GPS sur une grille d’environ deux kilomètres', () => {
    const chezMoi = { lat: 48.65234, lon: 2.41876 };
    const f = flouter(chezMoi);
    expect(Math.abs(f.lat - chezMoi.lat)).toBeLessThanOrEqual(GRILLE_POSITION / 2 + 1e-9);
    expect(Math.abs(f.lon - chezMoi.lon)).toBeLessThanOrEqual(GRILLE_POSITION / 2 + 1e-9);
  });

  it('confond deux voisins de palier — c’est tout l’intérêt', () => {
    expect(flouter({ lat: 48.6523, lon: 2.4188 })).toEqual(flouter({ lat: 48.6531, lon: 2.4181 }));
  });

  it('ne laisse pas traîner de décimales flottantes', () => {
    const f = flouter({ lat: 48.6523, lon: 2.4188 });
    expect(String(f.lat).length).toBeLessThanOrEqual(7);
    expect(String(f.lon).length).toBeLessThanOrEqual(7);
  });
});

describe('domicileAManquer', () => {
  // C'est le cas de TOUS les comptes créés par la v2 jusqu'ici : code postal
  // saisi à l'inscription, position jamais écrite.
  it('repère un compte avec code postal et sans position', () => {
    expect(domicileAManquer({ codePostal: '91130' })).toBe(true);
    expect(domicileAManquer({ codePostal: '91130', domicileLat: null, domicileLon: null })).toBe(true);
  });

  it('laisse tranquille un compte déjà placé', () => {
    expect(domicileAManquer({ codePostal: '91130', domicileLat: 48.6, domicileLon: 2.4 })).toBe(false);
  });

  it('ne tente rien sans code postal exploitable', () => {
    expect(domicileAManquer({ codePostal: '' })).toBe(false);
    expect(domicileAManquer({ codePostal: null })).toBe(false);
    expect(domicileAManquer({ codePostal: '123' })).toBe(false);
  });
});
