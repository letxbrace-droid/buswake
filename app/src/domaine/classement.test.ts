import { describe, it, expect } from 'vitest';
import {
  classerEquipes, classerJoueurs, diffButs, maPlace, ordrePodium, pointsEquipe,
} from './classement';
import type { Equipe } from './equipe';

const j = (id: string, xp: number, pseudo = id) => ({ id, pseudo, xp });

describe('classerJoueurs', () => {
  it('classe par XP décroissant', () => {
    expect(classerJoueurs([j('a', 100), j('b', 900), j('c', 400)]).map((u) => u.id))
      .toEqual(['b', 'c', 'a']);
  });

  it('départage à XP égal de façon STABLE — le classement ne doit pas sauter', () => {
    const une = classerJoueurs([j('z', 500, 'Zoé'), j('a', 500, 'Alex')]).map((u) => u.id);
    const deux = classerJoueurs([j('a', 500, 'Alex'), j('z', 500, 'Zoé')]).map((u) => u.id);
    expect(une).toEqual(deux);
  });
});

describe('maPlace', () => {
  const liste = classerJoueurs([j('a', 1000), j('moi', 800), j('c', 600)]);

  it('dit combien il manque pour DÉPASSER, pas pour égaliser', () => {
    expect(maPlace('moi', liste)?.pourDepasser).toEqual({ xp: 201, pseudo: 'a' });
  });

  it('ne promet rien au premier', () => {
    expect(maPlace('a', liste)?.pourDepasser).toBeNull();
  });

  it('situe entre celui du dessous et celui du dessus', () => {
    expect(maPlace('moi', liste)?.fraction).toBeCloseTo(0.5, 2);
  });

  it('cache le « Top X % » tant qu’il ne veut rien dire', () => {
    expect(maPlace('moi', liste)?.topPourcent).toBeNull();
    const grand = classerJoueurs(Array.from({ length: 10 }, (_, i) => j(`u${i}`, 1000 - i * 10)));
    expect(maPlace('u0', grand)?.topPourcent).toBe(10);
  });

  it('rend null pour quelqu’un hors classement', () => {
    expect(maPlace('inconnu', liste)).toBeNull();
  });
});

describe('classement des équipes', () => {
  const e = (nom: string, v: number, n: number, pour = 0, contre = 0): Equipe => ({
    id: nom, nom, stats: { victoires: v, nuls: n, defaites: 0, butsPour: pour, butsContre: contre },
  });

  it('applique le barème du football : 3 par victoire, 1 par nul', () => {
    expect(pointsEquipe(e('x', 4, 2))).toBe(14);
  });

  it('départage à points égaux par la différence de buts', () => {
    expect(diffButs(e('x', 0, 0, 20, 8))).toBe(12);
    expect(classerEquipes([e('serre', 3, 0, 10, 9), e('ecrase', 3, 0, 30, 5)]).map((x) => x.nom))
      .toEqual(['ecrase', 'serre']);
  });
});

describe('ordrePodium', () => {
  it('rend 2 — 1 — 3 : la forme se reconnaît sans lire les chiffres', () => {
    expect(ordrePodium(['or', 'argent', 'bronze'])).toEqual(['argent', 'or', 'bronze']);
  });

  it('tient avec moins de trois joueurs', () => {
    expect(ordrePodium(['or'])).toEqual([null, 'or', null]);
  });
});
