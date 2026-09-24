import { describe, it, expect } from 'vitest';
import { bilanDuClub, membresDuClub, monClub, noteMoyenne } from './club';
import type { Equipe } from './equipe';

const e = (p: Partial<Equipe> = {}): Equipe =>
  ({ id: 'e', nom: 'Club', sport: 'foot5', membres: [], ...p }) as Equipe;

describe('noteMoyenne', () => {
  it('arrondit au dixième', () => {
    expect(noteMoyenne(42, 5)).toBe(8.4);
    expect(noteMoyenne(25, 3)).toBe(8.3);
  });

  // `null` et `0` ne sont pas la même chose : l'un dit « on ne sait pas »,
  // l'autre « il joue très mal ». Les confondre affiche 0,0 à côté du nom
  // de quelqu'un qui vient d'arriver.
  it('rend null quand personne n’a noté', () => {
    expect(noteMoyenne(0, 0)).toBeNull();
    expect(noteMoyenne(12, 0)).toBeNull();
    expect(noteMoyenne(5, -1)).toBeNull();
  });
});

describe('monClub', () => {
  it('prend celui dont je suis capitaine, même si j’en ai d’autres', () => {
    const autre = e({ id: 'a', membres: ['moi'] });
    const mien = e({ id: 'm', capitaineUid: 'moi', membres: ['moi'] });
    expect(monClub([autre, mien], 'moi')?.id).toBe('m');
  });

  it('retombe sur celui où je suis simple membre', () => {
    expect(monClub([e({ id: 'a', membres: ['x'] }), e({ id: 'b', membres: ['moi'] })], 'moi')?.id).toBe('b');
  });

  it('rend null quand je n’ai pas de club, ou que je ne suis pas connecté', () => {
    expect(monClub([e({ membres: ['x'] })], 'moi')).toBeNull();
    expect(monClub([e({ membres: ['moi'] })], null)).toBeNull();
  });
});

describe('membresDuClub', () => {
  const club = e({ capitaineUid: 'cap', membres: ['bas', 'cap', 'haut', 'neuf'] });
  const fiches = {
    cap: { uid: 'cap', pseudo: 'Capi', posteFavori: 'milieu', noteSum: 14, noteCount: 2, xp: 100 },
    haut: { uid: 'haut', pseudo: 'Haut', noteSum: 18, noteCount: 2, xp: 50 },
    bas: { uid: 'bas', pseudo: 'Bas', noteSum: 10, noteCount: 2, xp: 900 },
    neuf: { uid: 'neuf', pseudo: 'Neuf', xp: 10 },
  };

  it('met le capitaine en tête, quelle que soit sa note', () => {
    const m = membresDuClub(club, fiches);
    expect(m[0].uid).toBe('cap');
    expect(m[0].capitaine).toBe(true);
  });

  it('classe ensuite par note décroissante', () => {
    expect(membresDuClub(club, fiches).slice(1, 3).map((x) => x.uid)).toEqual(['haut', 'bas']);
  });

  // N'avoir pas encore été noté n'est pas un mauvais classement : c'est une
  // absence d'information. Mélanger les deux punit les nouveaux.
  it('range les joueurs jamais notés après les notés, pas parmi les mauvais', () => {
    const m = membresDuClub(club, fiches);
    expect(m[m.length - 1].uid).toBe('neuf');
    expect(m[m.length - 1].note).toBeNull();
  });

  it('rend un membre lisible même sans fiche', () => {
    const m = membresDuClub(e({ membres: ['inconnu'] }), {});
    expect(m[0]).toMatchObject({ uid: 'inconnu', pseudo: 'Joueur', note: null, capitaine: false });
  });
});

describe('bilanDuClub', () => {
  const club = e({ id: 'moi', stats: { victoires: 7, nuls: 2, defaites: 3, serie: 3, butsPour: 30, butsContre: 18 } });
  const autres = [club, e({ id: 'x', stats: { victoires: 9 } }), e({ id: 'y', stats: { victoires: 1 } })];

  it('compte les points au barème du football', () => {
    const b = bilanDuClub(club, autres);
    expect(b.points).toBe(7 * 3 + 2);
    expect(b.joues).toBe(12);
  });

  it('donne la place dans le classement des équipes', () => {
    const b = bilanDuClub(club, autres);
    expect(b.place).toBe(2);
    expect(b.surTotal).toBe(3);
  });

  // « 0 % de victoires » sur zéro match est un chiffre FAUX, pas un chiffre
  // bas. Il décourage une équipe qui n'a simplement pas encore joué.
  it('ne calcule pas de pourcentage sans match joué', () => {
    expect(bilanDuClub(e({ id: 'neuf' }), [e({ id: 'neuf' })]).pourcentVictoires).toBeNull();
    expect(bilanDuClub(club, autres).pourcentVictoires).toBe(58);
  });

  it('dit combien de joueurs manquent à l’effectif du sport', () => {
    const b = bilanDuClub(e({ id: 'p', sport: 'foot5', membres: ['a', 'b'] }), []);
    expect(b.effectif).toBe(5);
    expect(b.manque).toBe(3);
  });
});
