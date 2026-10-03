import { describe, it, expect } from 'vitest';
import { messageAction } from './erreurs';

describe('messages d’erreur', () => {
  it('traduit le refus des règles', () => {
    expect(messageAction({ code: 'permission-denied', message: 'Missing or insufficient permissions.' })).toMatch(/refusé/);
  });
  it('traduit l’absence de réseau', () => {
    expect(messageAction({ code: 'unavailable' })).toMatch(/réseau/);
  });
  it('garde nos propres messages, déjà en français', () => {
    expect(messageAction(new Error('Il faut 10 joueurs pour confirmer (7/10).'))).toBe('Il faut 10 joueurs pour confirmer (7/10).');
  });
  it('ne montre jamais un message anglais brut', () => {
    expect(messageAction(new Error('Failed to fetch'))).toBe('Ça n’a pas marché. Réessaie.');
  });
});
