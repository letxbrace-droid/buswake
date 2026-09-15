import { describe, it, expect } from 'vitest';
import {
  COULEURS_EQUIPE, couleurEquipe, effectifEquipe, encreBlason, etatEquipe, initialesEquipe,
} from './equipe';

describe('etatEquipe', () => {
  it('sépare les états par LE MANQUE, pas par un pourcentage', () => {
    expect(etatEquipe({ id: 'a', nom: 'A', membres: ['1', '2', '3', '4', '5'] }).cle).toBe('prete');
    expect(etatEquipe({ id: 'a', nom: 'A', membres: ['1', '2', '3', '4'] }).label).toBe('Il manque 1 joueur');
    expect(etatEquipe({ id: 'a', nom: 'A', membres: ['1', '2'] }).label).toBe('Il manque 3 joueurs');
  });

  it('ne descend pas sous zéro quand l’équipe déborde', () => {
    expect(etatEquipe({ id: 'a', nom: 'A', membres: Array(9).fill('x') }).manque).toBe(0);
  });

  it('déduit l’effectif du sport — le modèle reste multi-sport', () => {
    expect(effectifEquipe({ sport: 'foot5' })).toBe(5);
    expect(effectifEquipe({ sport: 'basket3' })).toBe(3);
    expect(effectifEquipe({ sport: 'padel' })).toBe(2);
    expect(effectifEquipe({ sport: 'inconnu' })).toBe(5);
  });
});

describe('encreBlason', () => {
  // La règle N'EST PAS un seuil : c'est « celle des deux qui contraste le
  // plus ». Un jaune clair doit prendre de l'encre sombre, un violet de
  // l'encre claire — et les six couleurs officielles doivent toutes passer.
  it('prend l’encre qui contraste le plus, pas celle d’un seuil', () => {
    // Le point de bascule est à une luminance de ~0,189 : en dessous l'encre
    // claire gagne, au-dessus l'encre sombre. Les six couleurs de la palette
    // sont TOUTES au-dessus — elles sont vives, pas sombres — et prennent donc
    // de l'encre sombre. Le violet #B36BFF (luminance 0,28) en fait partie :
    // il paraît sombre à l'œil, il ne l'est pas à la mesure.
    expect(encreBlason('#FFD24A')).toBe('#0B0E12');
    expect(encreBlason('#B36BFF')).toBe('#0B0E12');
    // La branche claire existe, et c'est un fond vraiment sombre qui la
    // déclenche — un bleu marine de club, par exemple.
    expect(encreBlason('#1B2A4A')).toBe('#FFFFFF');
    expect(encreBlason('#000000')).toBe('#FFFFFF');
  });

  it('atteint 3:1 sur les six couleurs officielles', () => {
    const lum = (hex: string) => {
      const h = hex.replace('#', '');
      const v = [0, 2, 4].map((i) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    for (const couleur of COULEURS_EQUIPE) {
      const a = lum(couleur);
      const b = lum(encreBlason(couleur));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      expect(ratio, `${couleur} → ${encreBlason(couleur)}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('initialesEquipe', () => {
  it('prend deux mots au plus', () => {
    expect(initialesEquipe('Les Bleus du Dimanche')).toBe('LB');
    expect(initialesEquipe('Massy')).toBe('M');
    expect(initialesEquipe('   ')).toBe('?');
  });
});

describe('couleurEquipe', () => {
  it('refuse une couleur hors palette — les règles Firestore valident ces littéraux', () => {
    expect(couleurEquipe({ couleur: '#123456' })).toBe(COULEURS_EQUIPE[0]);
    expect(couleurEquipe({ couleur: '#00B0FF' })).toBe('#00B0FF');
  });
});
