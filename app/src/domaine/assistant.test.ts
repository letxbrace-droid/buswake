import { describe, it, expect } from 'vitest';
import {
  DUREES, ETAPES, etapeAtteignable, etapeComplete, libelleDuree, manqueA,
  MESSAGE_MAX, NIVEAUX_MATCH, peutPublier, precedente, premiereIncomplete,
  SAISIE_VIDE, suivante, type Saisie,
} from './assistant';

const s = (p: Partial<Saisie> = {}): Saisie => ({ ...SAISIE_VIDE, ...p });
const complete = s({ creneaux: [0, 2], lieu: 'LE FIVE Morangis' });

describe('manqueA', () => {
  it('dit ce qui manque, étape par étape', () => {
    expect(manqueA('infos', s())).toBe('Coche au moins un créneau');
    expect(manqueA('lieu', s({ creneaux: [0] }))).toBe('Choisis un terrain');
    expect(manqueA('joueurs', s({ joueursMax: 1 }))).toContain('2 et 40');
    expect(manqueA('publier', s({ message: 'x'.repeat(MESSAGE_MAX + 1) }))).toContain('maximum');
  });

  it('ne se plaint de rien quand l’étape est faite', () => {
    for (const e of ETAPES) expect(manqueA(e, complete)).toBeNull();
  });

  // La borne vient des règles Firestore. La dire ici évite un refus opaque
  // après l'envoi — un compteur sous le champ coûte infiniment moins cher.
  it('accepte un message pile à la borne, refuse au-delà', () => {
    expect(etapeComplete('publier', s({ message: 'x'.repeat(MESSAGE_MAX) }))).toBe(true);
    expect(etapeComplete('publier', s({ message: 'x'.repeat(MESSAGE_MAX + 1) }))).toBe(false);
  });

  it('le message est facultatif', () => {
    expect(etapeComplete('publier', s({ message: '' }))).toBe(true);
  });

  // La règle serveur borne les créneaux à dix : la dire ici aussi évite le
  // même refus opaque.
  it('refuse plus de dix créneaux', () => {
    expect(etapeComplete('infos', s({ creneaux: Array.from({ length: 11 }, (_, i) => i) }))).toBe(false);
    expect(etapeComplete('infos', s({ creneaux: Array.from({ length: 10 }, (_, i) => i) }))).toBe(true);
  });

  it('borne l’effectif comme les règles', () => {
    expect(etapeComplete('joueurs', s({ ...complete, joueursMax: 2 }))).toBe(true);
    expect(etapeComplete('joueurs', s({ ...complete, joueursMax: 40 }))).toBe(true);
    expect(etapeComplete('joueurs', s({ ...complete, joueursMax: 41 }))).toBe(false);
    expect(etapeComplete('joueurs', s({ ...complete, joueursMax: 5.5 }))).toBe(false);
  });
});

describe('navigation', () => {
  it('avance et recule dans l’ordre', () => {
    expect(suivante('infos')).toBe('lieu');
    expect(suivante('publier')).toBeNull();
    expect(precedente('infos')).toBeNull();
    expect(precedente('lieu')).toBe('infos');
  });

  // On ne saute pas une étape incomplète : arriver à « Publier » sans
  // terrain donnerait un bouton grisé sans dire pourquoi.
  it('ne laisse pas sauter une étape incomplète', () => {
    const vide = s();
    expect(etapeAtteignable('infos', vide)).toBe(true);
    expect(etapeAtteignable('lieu', vide)).toBe(false);
    expect(etapeAtteignable('publier', vide)).toBe(false);
  });

  // Mais revenir doit être libre : corriger le terrain depuis la dernière
  // page ne doit pas coûter trois retours en arrière.
  it('laisse revenir librement sur une étape franchie', () => {
    for (const e of ETAPES) expect(etapeAtteignable(e, complete)).toBe(true);
  });

  it('nomme la première étape incomplète', () => {
    expect(premiereIncomplete(s())).toBe('infos');
    expect(premiereIncomplete(s({ creneaux: [0] }))).toBe('lieu');
    expect(premiereIncomplete(complete)).toBeNull();
  });
});

describe('peutPublier', () => {
  it('exige TOUTES les étapes, pas seulement la dernière', () => {
    expect(peutPublier(complete)).toBe(true);
    expect(peutPublier(s({ creneaux: [0] }))).toBe(false);
    expect(peutPublier(s({ lieu: 'X' }))).toBe(false);
  });
});

describe('durées et niveaux', () => {
  it('nomme les durées comme un centre les loue', () => {
    expect(libelleDuree(60)).toBe('1h');
    expect(libelleDuree(90)).toBe('1h30');
    expect(libelleDuree(120)).toBe('2h');
  });

  it('ne propose que des durées louables', () => {
    expect([...DUREES]).toEqual([60, 90, 120]);
  });

  it('garde « tous » comme premier niveau — c’est le défaut', () => {
    expect(NIVEAUX_MATCH[0]).toBe('tous');
    expect(SAISIE_VIDE.niveau).toBe('tous');
  });
});
