import { describe, it, expect } from 'vitest';
import {
  destinationItineraire, estAdresseUtilisable, libelleAdresse, lienItineraire,
} from './itineraire';
import { TERRAINS_VERIFIES } from './terrains';

const MASSY = { n: 'Le Five Massy', adr: '12 Rue du Stade, 91300 Massy', lat: 48.72, lon: 2.28 };
const SANS_ADRESSE = { n: 'City stade', v: 'Palaiseau', cp: '91120', lat: 48.71, lon: 2.24 };
const RIEN = { n: 'Terrain inconnu', v: 'Palaiseau' };

describe('estAdresseUtilisable', () => {
  // « Palaiseau » tout seul était traité comme une adresse en v1 : le GPS
  // visait le centre-ville, et l'avertissement « position approximative »
  // disparaissait parce qu'on croyait avoir une adresse.
  it('exige un numéro de rue', () => {
    expect(estAdresseUtilisable('12 Rue du Stade, 91300 Massy')).toBe(true);
    expect(estAdresseUtilisable('Palaiseau')).toBe(false);
    expect(estAdresseUtilisable('Rue du Stade')).toBe(false);
    expect(estAdresseUtilisable('')).toBe(false);
    expect(estAdresseUtilisable(undefined)).toBe(false);
  });

  it('accepte un numéro composé, comme 9-11', () => {
    expect(estAdresseUtilisable('9-11 Cour du Fermoir, 75013 Paris')).toBe(true);
  });
});

describe('destinationItineraire', () => {
  it('est EXACTE quand il y a une vraie adresse', () => {
    expect(destinationItineraire(MASSY).exact).toBe(true);
  });

  it('n’est PAS exacte avec des coordonnées seules — on ne ment pas au joueur', () => {
    const d = destinationItineraire(SANS_ADRESSE);
    expect(d.exact).toBe(false);
    expect(d.ll).toEqual({ lat: 48.71, lon: 2.24 });
  });

  it('tient sans coordonnées ni adresse', () => {
    const d = destinationItineraire(RIEN);
    expect(d.exact).toBe(false);
    expect(d.ll).toBeNull();
    expect(d.q).toContain('Palaiseau');
  });
});

describe('lienItineraire', () => {
  // Il y a plusieurs « Le Five » en Île-de-France : une recherche textuelle
  // peut tomber sur un homonyme, des coordonnées jamais.
  it('privilégie les coordonnées, même avec une adresse exacte', () => {
    expect(lienItineraire(MASSY, 'waze')).toContain('ll=48.72,2.28');
    expect(lienItineraire(MASSY, 'google')).toContain('destination=48.72,2.28');
    expect(lienItineraire(MASSY, 'apple')).toContain('daddr=48.72,2.28');
  });

  it('retombe sur une recherche textuelle sans coordonnées', () => {
    for (const a of ['waze', 'google', 'apple'] as const) {
      const lien = lienItineraire(RIEN, a);
      expect(lien).toContain('Palaiseau');
      expect(lien).not.toContain('undefined');
    }
  });

  it('encode ce qui doit l’être — une adresse contient des espaces et des virgules', () => {
    const lien = lienItineraire({ n: 'A B', v: 'Saint-Ouen sur Seine' }, 'google');
    expect(lien).not.toMatch(/ /);
  });

  it('demande bien un ITINÉRAIRE et pas une simple position', () => {
    expect(lienItineraire(MASSY, 'waze')).toContain('navigate=yes');
    expect(lienItineraire(MASSY, 'google')).toContain('/dir/');
    expect(lienItineraire(MASSY, 'apple')).toContain('daddr=');
  });
});

describe('libelleAdresse', () => {
  it('montre l’adresse entière quand elle est exacte — c’est elle qu’on recopie', () => {
    expect(libelleAdresse(MASSY)).toEqual({ texte: MASSY.adr, approximatif: false });
  });

  it('signale l’approximation au lieu de la maquiller', () => {
    const l = libelleAdresse(SANS_ADRESSE);
    expect(l.approximatif).toBe(true);
    expect(l.texte).toBe('Palaiseau 91120');
  });
});

describe('TERRAINS_VERIFIES', () => {
  // La règle de fond : un terrain inventé envoie un joueur nulle part un
  // jeudi soir. Chaque entrée doit être contrôlable et exactement localisée.
  it('porte 23 lieux', () => {
    expect(TERRAINS_VERIFIES).toHaveLength(23);
  });

  it('chaque lieu a une adresse EXACTE, des coordonnées et une source', () => {
    for (const t of TERRAINS_VERIFIES) {
      expect(estAdresseUtilisable(t.adr), `${t.n} — adresse`).toBe(true);
      expect(typeof t.lat === 'number' && typeof t.lon === 'number', `${t.n} — coords`).toBe(true);
      expect(t.url.startsWith('https://'), `${t.n} — source`).toBe(true);
    }
  });

  it('tous les lieux sont en France métropolitaine', () => {
    for (const t of TERRAINS_VERIFIES) {
      expect(t.lat, t.n).toBeGreaterThan(41);
      expect(t.lat, t.n).toBeLessThan(52);
      expect(t.lon, t.n).toBeGreaterThan(-5);
      expect(t.lon, t.n).toBeLessThan(10);
    }
  });

  it('le code postal du lieu figure dans son adresse', () => {
    for (const t of TERRAINS_VERIFIES) {
      expect(t.adr, t.n).toContain(t.cp);
    }
  });

  it('aucun doublon de nom', () => {
    const noms = TERRAINS_VERIFIES.map((t) => t.n);
    expect(new Set(noms).size).toBe(noms.length);
  });
});
