import { describe, it, expect } from 'vitest';
import { ONGLETS, ongletActif } from './navigation';

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
