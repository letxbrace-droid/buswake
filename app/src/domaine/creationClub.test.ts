import { describe, it, expect } from 'vitest';
import regles from '../../../firestore.rules?raw';
import { COULEURS_EQUIPE, type Equipe } from './equipe';
import {
  CLUB_VIDE, documentClub, NOMS_EMBLEMES, peutCreerUnClub, peutRejoindre, problemeClub, sortieDuClub,
} from './creationClub';

/** Les valeurs que la règle accepte, lues dans firestore.rules. */
function listeDeLaRegle(champ: string): string[] {
  const m = regles.match(new RegExp(`d\\.${champ} in \\[([\\s\\S]*?)\\]`));
  if (!m) throw new Error(`liste « ${champ} » introuvable dans firestore.rules`);
  // Les commentaires d'abord : « l'ancien vert » y a une apostrophe, qui
  // décalait toutes les chaînes lues après elle.
  const sansCommentaires = m[1].replace(/\/\/[^\n]*/g, '');
  return [...sansCommentaires.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('les choix du formulaire sont ceux que la règle accepte', () => {
  // Une couleur ou un emblème proposé ici mais absent de la règle donnerait
  // un « permission denied » sans explication au moment de créer.
  it('chaque couleur', () => {
    for (const c of COULEURS_EQUIPE) expect(listeDeLaRegle('couleur')).toContain(c);
  });
  it('chaque emblème', () => {
    for (const e of NOMS_EMBLEMES) expect(listeDeLaRegle('embleme')).toContain(e);
  });
  it('chaque niveau', () => {
    for (const n of ['debutant', 'intermediaire', 'confirme']) expect(listeDeLaRegle('niveau')).toContain(n);
  });
});

describe('valider le club', () => {
  it('exige un nom de 2 à 28 caractères', () => {
    expect(problemeClub({ ...CLUB_VIDE, nom: 'A' })).toMatch(/nom/);
    expect(problemeClub({ ...CLUB_VIDE, nom: 'x'.repeat(29) })).toMatch(/28/);
    expect(problemeClub({ ...CLUB_VIDE, nom: 'Les Bleus' })).toBeNull();
  });
  it('refuse une couleur hors liste', () => {
    expect(problemeClub({ ...CLUB_VIDE, nom: 'Les Bleus', couleur: '#123456' as never })).toMatch(/couleur/);
  });
  it('borne l’appel à 120', () => {
    expect(problemeClub({ ...CLUB_VIDE, nom: 'Les Bleus', appel: 'x'.repeat(121) })).toMatch(/120/);
  });
});

describe('le document envoyé', () => {
  const d = documentClub({ ...CLUB_VIDE, nom: '  Les   Bleus ', appel: '' }, 'u1');
  it('fait du créateur le capitaine ET un membre', () => {
    expect(d.capitaineUid).toBe('u1');
    expect(d.membres).toEqual(['u1']);
  });
  it('nettoie le nom, et un appel vide devient null', () => {
    expect(d.nom).toBe('Les Bleus');
    expect(d.appel).toBeNull();
  });
  it('naît avec un palmarès à zéro', () => {
    expect(Object.values(d.stats).every((v) => v === 0)).toBe(true);
  });
});

describe('un joueur, un club', () => {
  const a: Equipe = { id: 'a', nom: 'A', capitaineUid: 'x', membres: ['x', 'u1'] };
  const b: Equipe = { id: 'b', nom: 'B', capitaineUid: 'y', membres: ['y'] };
  it('déjà membre : ni créer ni rejoindre — et on dit lequel', () => {
    expect(peutCreerUnClub([a, b], 'u1')).toMatchObject({ peut: false, pourquoi: expect.stringContaining('A') });
    expect(peutRejoindre(b, [a, b], 'u1').peut).toBe(false);
  });
  it('libre : peut créer et rejoindre', () => {
    expect(peutCreerUnClub([a, b], 'u9').peut).toBe(true);
    expect(peutRejoindre(b, [a, b], 'u9').peut).toBe(true);
  });
  it('un club plein ne se rejoint pas', () => {
    const plein: Equipe = { id: 'p', nom: 'P', membres: Array.from({ length: 20 }, (_, i) => 'm' + i) };
    expect(peutRejoindre(plein, [plein], 'u9')).toMatchObject({ peut: false, pourquoi: 'Ce club est complet.' });
  });
});

describe('quitter son club', () => {
  const club: Equipe = { id: 'c', nom: 'C', capitaineUid: 'cap', membres: ['cap', 'a', 'b'] };
  it('un membre s’en va', () => {
    expect(sortieDuClub(club, 'a')).toEqual({ type: 'quitter' });
  });
  it('le capitaine transmet le brassard au plus ancien', () => {
    expect(sortieDuClub(club, 'cap')).toEqual({ type: 'transmettre', vers: 'a' });
  });
  it('le capitaine seul supprime le club', () => {
    expect(sortieDuClub({ ...club, membres: ['cap'] }, 'cap')).toEqual({ type: 'supprimer' });
  });
  it('un capitaine absent de membres (club de la v1) le supprime aussi', () => {
    expect(sortieDuClub({ ...club, membres: [] }, 'cap')).toEqual({ type: 'supprimer' });
  });
  it('un étranger n’a rien à quitter', () => {
    expect(sortieDuClub(club, 'zz')).toEqual({ type: 'aucune' });
  });
});
