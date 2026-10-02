import { describe, it, expect } from 'vitest';
import { ONGLETS, ongletActif, parentDe } from './navigation';

describe('onglet actif du dock', () => {
  it('l’accueil ne s’allume que sur « / » — sinon il serait actif partout', () => {
    expect(ongletActif('/')).toBe(0);
    expect(ongletActif('/matchs')).toBe(1);
  });
  it('une sous-page garde son onglet', () => {
    expect(ongletActif('/profil/modifier')).toBe(4);
  });
  it('un préfixe n’est pas un onglet : /matchsxyz n’est pas /matchs', () => {
    expect(ongletActif('/matchsxyz')).toBe(-1);
  });
  it('hors onglet (fiche d’un match) : aucune pastille', () => {
    expect(ongletActif('/match/abc')).toBe(-1);
  });
  // La pastille mesure un cinquième de la barre (dock.css). Un sixième
  // onglet la décalerait sans qu'aucun type ne proteste.
  it('cinq onglets, pas un de plus', () => {
    expect(ONGLETS).toHaveLength(5);
  });
});

describe('retour', () => {
  it('un onglet du dock n’a pas de retour', () => {
    expect(parentDe('/')).toBeNull();
    expect(parentDe('/profil/modifier')).toBeNull();
  });
  it('l’entrée non plus', () => {
    expect(parentDe('/connexion')).toBeNull();
  });
  it('une sous-page de match remonte à la fiche du match', () => {
    expect(parentDe('/match/abc/terminer')).toBe('/match/abc');
    expect(parentDe('/match/abc/chat')).toBe('/match/abc');
  });
  it('la fiche d’un match remonte à la liste', () => {
    expect(parentDe('/match/abc')).toBe('/matchs');
  });
  it('les écrans secondaires remontent à leur origine', () => {
    expect(parentDe('/equipes')).toBe('/club');
    expect(parentDe('/compte/supprimer')).toBe('/profil');
    expect(parentDe('/terrains')).toBe('/');
  });
});
