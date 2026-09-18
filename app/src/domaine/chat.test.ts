import { describe, it, expect } from 'vitest';
import { chatOuvert, messageValide, rangerMessages, MESSAGE_MAX, MESSAGES_GARDES } from './chat';
import type { Match } from './schemas';

const m = (p: Partial<Match> = {}): Match =>
  ({
    id: 'm', createur: 'c', sport: 'foot5', statut: 'confirmé',
    joueursInscrits: [], creneauxProposes: [], dateFinale: null, lieuFinal: '',
    finVisible: null, joueursMax: 10, ...p,
  }) as Match;

describe('chatOuvert', () => {
  const debut = new Date('2026-09-18T19:00:00Z');

  it('est ouvert avant et pendant le match', () => {
    expect(chatOuvert(m({ dateFinale: debut }), new Date('2026-09-18T12:00:00Z'))).toBe(true);
    expect(chatOuvert(m({ dateFinale: debut }), new Date('2026-09-18T20:00:00Z'))).toBe(true);
  });

  it('reste ouvert 24 h après — le temps de commenter', () => {
    expect(chatOuvert(m({ dateFinale: debut }), new Date('2026-09-19T18:00:00Z'))).toBe(true);
  });

  // Un fil qui survit au match devient un groupe de discussion que personne
  // n'a demandé et que personne ne quitte.
  it('ferme au-delà', () => {
    expect(chatOuvert(m({ dateFinale: debut }), new Date('2026-09-19T20:00:00Z'))).toBe(false);
  });

  it('retombe sur le premier créneau proposé quand la date n’est pas tranchée', () => {
    const avec = m({ creneauxProposes: [{ date: debut, lieu: 'X', votes: [] }] });
    expect(chatOuvert(avec, new Date('2026-09-19T20:00:00Z'))).toBe(false);
  });

  it('reste ouvert quand aucune heure n’est connue — le match se cale encore', () => {
    expect(chatOuvert(m())).toBe(true);
  });
});

describe('messageValide', () => {
  it('refuse le vide et les espaces seuls', () => {
    expect(messageValide('')).toBe(false);
    expect(messageValide('   ')).toBe(false);
  });

  it('accepte un message normal et refuse un pavé', () => {
    expect(messageValide('on joue où ?')).toBe(true);
    expect(messageValide('a'.repeat(MESSAGE_MAX))).toBe(true);
    expect(messageValide('a'.repeat(MESSAGE_MAX + 1))).toBe(false);
  });
});

describe('rangerMessages', () => {
  const l = (id: string, h: number) => ({
    id, uid: 'u' + id, text: 'm' + id,
    createdAt: new Date(`2026-09-18T${String(h).padStart(2, '0')}:00:00Z`),
  });

  // Firestore rend du plus RÉCENT au plus ancien : c'est la seule façon
  // qu'un `limit` garde les messages récents plutôt que les premiers.
  it('rend le fil du plus ancien au plus récent', () => {
    const range = rangerMessages([l('c', 12), l('b', 11), l('a', 10)]);
    expect(range.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('survit à un document incomplet plutôt que de faire tomber le fil', () => {
    const [m] = rangerMessages([{ id: 'x' }]);
    expect(m).toEqual({ id: 'x', auteur: '', texte: '', quand: null });
  });

  it('ne garde pas plus que ce que la requête plafonne', () => {
    expect(MESSAGES_GARDES).toBe(100);
  });
});
