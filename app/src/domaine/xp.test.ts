import { describe, it, expect } from 'vitest';
// `?raw` plutôt que `node:fs` : `src/` est typé pour le navigateur
// (`types: ["vite/client"]`), et lui ouvrir les globales Node pour un seul
// test ferait passer `process` et `fs` pour disponibles dans tout le code
// d'application. Vite sait inliner un fichier voisin à la compilation.
import sourceFonctions from '../../../functions/index.js?raw';
import { XP, RANGS, rangDe, progressionDe } from './xp';

describe('barème XP', () => {
  /**
   * Le barème vit à DEUX endroits : ici, où il sert à annoncer un gain, et
   * dans les Cloud Functions, où il est réellement versé. C'est le serveur
   * qui fait autorité — le client n'écrit jamais d'XP.
   *
   * Un écart entre les deux ne casse rien de visible : l'app promet
   * « +100 » et le compte monte de 50. Personne ne le remarque tout de
   * suite, et quand ça se remarque, la confiance est déjà partie. Ce test
   * est la seule chose qui lie les deux fichiers.
   */
  it('est identique à celui des Cloud Functions', () => {
    const m = sourceFonctions.match(/const XP = (\{[^}]*\})/);
    expect(m, 'barème introuvable dans functions/index.js').not.toBeNull();
    const serveur = JSON.parse(m![1].replace(/(\w+):/g, '"$1":'));
    expect(serveur).toEqual({ ...XP });
  });

  it('ne compte qu’un seul motif négatif — le lapin', () => {
    const negatifs = Object.entries(XP).filter(([, v]) => v < 0).map(([k]) => k);
    expect(negatifs).toEqual(['lapin']);
  });
});

describe('rangDe', () => {
  it('rend le rang dont le seuil est atteint, pas le suivant', () => {
    expect(rangDe(0).label).toBe('Recrue');
    expect(rangDe(199).label).toBe('Recrue');
    expect(rangDe(200).label).toBe('Stagiaire');
    expect(rangDe(4000).label).toBe('Légende');
    expect(rangDe(99999).label).toBe('Légende');
  });

  // Un XP négatif est possible : le lapin retire des points.
  it('ne tombe pas sur un XP négatif ou absurde', () => {
    expect(rangDe(-50).label).toBe('Recrue');
    expect(rangDe(Number.NaN).label).toBe('Recrue');
    expect(rangDe(Number.POSITIVE_INFINITY).label).toBe('Recrue');
  });

  it('a des seuils strictement croissants — sinon un rang est inatteignable', () => {
    const seuils = RANGS.map((r) => r.min);
    expect([...seuils].sort((a, b) => a - b)).toEqual(seuils);
    expect(new Set(seuils).size).toBe(seuils.length);
  });
});

describe('progressionDe', () => {
  it('donne le reste et l’avancement dans le palier', () => {
    const p = progressionDe(350);
    expect(p.rang.label).toBe('Stagiaire');
    expect(p.suivant?.label).toBe('Titulaire');
    expect(p.restant).toBe(150);
    expect(p.fraction).toBeCloseTo(0.5, 5);
  });

  // La barre ne doit jamais rester vide au rang maximal : c'est le seul
  // endroit où « plein » veut dire « il n'y a plus rien après ».
  it('est pleine et sans suite au rang maximal', () => {
    const p = progressionDe(10000);
    expect(p.suivant).toBeNull();
    expect(p.restant).toBe(0);
    expect(p.fraction).toBe(1);
  });

  it('reste entre 0 et 1 sur tous les seuils', () => {
    for (const r of RANGS) {
      for (const xp of [r.min, r.min + 1]) {
        const f = progressionDe(xp).fraction;
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });
});
