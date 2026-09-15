import { describe, it, expect } from 'vitest';
import { noteGlobale, tierDe, posteDe, initiales, ATOUT_DEFAUT } from './joueur';

describe('noteGlobale', () => {
  it('moyenne les cinq atouts', () => {
    expect(noteGlobale({ vitesse: 90, dribble: 80, frappe: 70, defense: 60, physique: 50 })).toBe(70);
  });

  it('complète les atouts manquants plutôt que de rendre NaN', () => {
    expect(noteGlobale({ vitesse: 90 })).toBe(Math.round((90 + ATOUT_DEFAUT * 4) / 5));
    expect(noteGlobale(null)).toBe(ATOUT_DEFAUT);
    expect(noteGlobale(undefined)).toBe(ATOUT_DEFAUT);
  });
});

describe('tierDe', () => {
  it('applique les seuils de la v1, bornes comprises', () => {
    expect(tierDe(85).label).toBe('OR');
    expect(tierDe(84).label).toBe('ARGENT');
    expect(tierDe(75).label).toBe('ARGENT');
    expect(tierDe(74).label).toBe('BRONZE');
    expect(tierDe(0).label).toBe('BRONZE');
  });

  it('atteint 4.5:1 sur le fond de sa carte — le chiffre doit rester lisible', () => {
    const lum = (hex: string) => {
      const h = hex.replace('#', '');
      const v = [0, 2, 4].map((i) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    // Le point le plus clair du dégradé de chaque tier, celui qui contraste
    // le moins avec l'encre de la médaille.
    const clairs = { or: '#4A3B00', argent: '#2C343A', bronze: '#3D2410' };
    for (const note of [90, 80, 60]) {
      const t = tierDe(note);
      const a = lum(t.couleur);
      const b = lum(clairs[t.cle]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      expect(ratio, `${t.label}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('posteDe', () => {
  it('retombe sur milieu pour un poste inconnu ou absent', () => {
    expect(posteDe('attaquant').abbr).toBe('ATT');
    expect(posteDe('inexistant').abbr).toBe('MIL');
    expect(posteDe(undefined).abbr).toBe('MIL');
  });
});

describe('initiales', () => {
  it('prend deux mots au plus', () => {
    expect(initiales('Sam Bouzid')).toBe('SB');
    expect(initiales('Sam')).toBe('S');
  });
});
