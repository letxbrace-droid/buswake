import { describe, it, expect } from 'vitest';
import {
  aDejaNote, actionPossible, basculerVoteMotm, compterVotesMotm, joueursANoter,
  lienAvec, monVoteMotm, vainqueurMotm, validerNotes,
} from './social';

describe('lienAvec', () => {
  const moi = {
    friends: ['ami1'],
    friendRequestsSent: ['envoye1'],
    friendRequestsReceived: ['recu1'],
  };

  it('distingue les quatre situations', () => {
    expect(lienAvec(moi, 'u1', 'u1')).toBe('moi');
    expect(lienAvec(moi, 'u1', 'ami1')).toBe('ami');
    expect(lienAvec(moi, 'u1', 'envoye1')).toBe('demande-envoyee');
    expect(lienAvec(moi, 'u1', 'recu1')).toBe('demande-recue');
    expect(lienAvec(moi, 'u1', 'inconnu1')).toBe('inconnu');
  });

  it('tient sur un document sans aucun de ces champs', () => {
    expect(lienAvec({}, 'u1', 'u2')).toBe('inconnu');
  });
});

describe('actionPossible', () => {
  // Bombarder quelqu'un de demandes n'est pas une fonctionnalité.
  it('ne propose pas de renvoyer une demande déjà envoyée', () => {
    expect(actionPossible('demande-envoyee')).toBe('aucune');
  });

  it('propose la bonne action dans les autres cas', () => {
    expect(actionPossible('inconnu')).toBe('ajouter');
    expect(actionPossible('demande-recue')).toBe('accepter');
    expect(actionPossible('ami')).toBe('retirer');
    expect(actionPossible('moi')).toBe('aucune');
  });
});

describe('notation', () => {
  const inscrits = ['moi', 'a', 'b', 'c'];

  it('ne se note pas soi-même', () => {
    expect(joueursANoter(inscrits, 'moi')).toEqual(['a', 'b', 'c']);
  });

  // Ne noter que ses amis fausse la moyenne de tout le monde.
  it('exige TOUTES les notes ou aucune', () => {
    const partiel = validerNotes(['a', 'b', 'c'], { a: 5, b: 4 });
    expect(partiel.ok).toBe(false);
    expect(partiel.manque).toBe(1);
    expect(validerNotes(['a', 'b', 'c'], { a: 5, b: 4, c: 3 }).ok).toBe(true);
  });

  it('refuse une note hors de 1 à 5, ou décimale', () => {
    expect(validerNotes(['a'], { a: 0 }).ok).toBe(false);
    expect(validerNotes(['a'], { a: 6 }).ok).toBe(false);
    expect(validerNotes(['a'], { a: 3.5 }).ok).toBe(false);
  });

  it('sait qu’un joueur a déjà noté', () => {
    expect(aDejaNote({ moi: { a: 5 } }, 'moi')).toBe(true);
    expect(aDejaNote({ autre: { a: 5 } }, 'moi')).toBe(false);
    expect(aDejaNote(undefined, 'moi')).toBe(false);
  });
});

describe('vote homme du match', () => {
  // Sans le retrait du vote précédent, changer d'avis laisse les deux voix
  // en place et le votant compte double.
  it('ne laisse QU’UNE voix par votant quand il change d’avis', () => {
    let v = basculerVoteMotm({}, 'a', 'moi');
    v = basculerVoteMotm(v, 'b', 'moi');
    expect(monVoteMotm(v, 'moi')).toBe('b');
    expect(v.a).toEqual([]);
    expect(v.b).toEqual(['moi']);
  });

  it('est un interrupteur : revoter pour la même personne retire la voix', () => {
    let v = basculerVoteMotm({}, 'a', 'moi');
    v = basculerVoteMotm(v, 'a', 'moi');
    expect(monVoteMotm(v, 'moi')).toBeNull();
  });

  it('n’efface pas les voix des autres', () => {
    let v = basculerVoteMotm({ a: ['autre'] }, 'a', 'moi');
    expect(v.a.sort()).toEqual(['autre', 'moi']);
    v = basculerVoteMotm(v, 'b', 'moi');
    expect(v.a).toEqual(['autre']);
  });

  it('compte et classe les voix', () => {
    const c = compterVotesMotm({ a: ['x', 'y'], b: ['z'], c: [] });
    expect(c).toEqual([{ uid: 'a', voix: 2 }, { uid: 'b', voix: 1 }]);
  });

  // Désigner le premier par ordre alphabétique donnerait 15 XP sur un tirage
  // déguisé en résultat.
  it('ne désigne AUCUN vainqueur en cas d’égalité', () => {
    expect(vainqueurMotm({ a: ['x'], b: ['y'] })).toBeNull();
  });

  it('désigne le vainqueur quand il est seul en tête', () => {
    expect(vainqueurMotm({ a: ['x', 'y'], b: ['z'] })).toBe('a');
  });

  it('ne désigne personne sans aucun vote', () => {
    expect(vainqueurMotm({})).toBeNull();
    expect(vainqueurMotm({ a: [] })).toBeNull();
  });
});
