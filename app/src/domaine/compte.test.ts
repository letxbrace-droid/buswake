import { describe, it, expect } from 'vitest';
import {
  ChangementMdpSchema, ETAPES_SUPPRESSION, estCompteGooglePur, gereSonMotDePasse,
} from './compte';

describe('fournisseurs', () => {
  it('un compte Google pur ne gère pas son mot de passe ici', () => {
    expect(gereSonMotDePasse(['google.com'])).toBe(false);
    expect(estCompteGooglePur(['google.com'])).toBe(true);
  });

  it('un compte Google AVEC mot de passe le gère bien ici', () => {
    expect(gereSonMotDePasse(['google.com', 'password'])).toBe(true);
    expect(estCompteGooglePur(['google.com', 'password'])).toBe(false);
  });
});

describe('ChangementMdpSchema', () => {
  const bon = { actuel: 'ancien1', nouveau: 'nouveau1', confirmation: 'nouveau1' };

  it('accepte un changement valide', () => {
    expect(ChangementMdpSchema.safeParse(bon).success).toBe(true);
  });

  it('refuse une confirmation qui diffère', () => {
    expect(ChangementMdpSchema.safeParse({ ...bon, confirmation: 'autre123' }).success).toBe(false);
  });

  // Firebase accepte de « changer » vers le même mot de passe sans rien
  // faire : l'utilisateur croit avoir changé quelque chose.
  it('refuse un nouveau mot de passe identique à l’ancien', () => {
    const r = ChangementMdpSchema.safeParse({ actuel: 'pareil1', nouveau: 'pareil1', confirmation: 'pareil1' });
    expect(r.success).toBe(false);
  });

  it('refuse un nouveau mot de passe trop court', () => {
    expect(ChangementMdpSchema.safeParse({ ...bon, nouveau: '123', confirmation: '123' }).success)
      .toBe(false);
  });
});

describe('ordre de suppression', () => {
  // La ré-authentification est la seule étape qui peut échouer sur une action
  // de l'utilisateur, et c'est la seule qui ne détruit rien : elle passe donc
  // en premier. La v1 supprimait le document AVANT, et un échec laissait un
  // compte vivant sans profil.
  it('ré-authentifie avant de détruire quoi que ce soit', () => {
    expect(ETAPES_SUPPRESSION[0]).toBe('reauthentifier');
  });

  it('supprime le document avant le compte — après, les règles refusent l’écriture', () => {
    expect(ETAPES_SUPPRESSION.indexOf('document')).toBeLessThan(
      ETAPES_SUPPRESSION.indexOf('compte'),
    );
  });
});
