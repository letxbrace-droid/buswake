import { describe, it, expect } from 'vitest';
import {
  etatPush, libellePush, aidePush, lireNotification, routeHeritee, destinationSure,
} from './push';

const ctx = (p: Partial<Parameters<typeof etatPush>[0]> = {}) => ({
  apiPresente: true, fcmSupporte: true, permission: 'default' as NotificationPermission, ...p,
});

describe('etatPush', () => {
  it('lit les quatre situations', () => {
    expect(etatPush(ctx())).toBe('a-demander');
    expect(etatPush(ctx({ permission: 'granted' }))).toBe('actif');
    expect(etatPush(ctx({ permission: 'denied' }))).toBe('refuse');
    expect(etatPush(ctx({ apiPresente: false, permission: null }))).toBe('indisponible');
  });

  // Safari sur iPhone expose Notification hors app installée, mais FCM s'y
  // déclare non supporté. Croire la seule API ferait proposer un bouton qui
  // échoue au moment du jeton, après avoir demandé la permission.
  it('croit FCM même quand l’API Notification existe', () => {
    expect(etatPush(ctx({ fcmSupporte: false }))).toBe('indisponible');
    expect(etatPush(ctx({ fcmSupporte: false, permission: 'granted' }))).toBe('indisponible');
  });
});

describe('libellePush / aidePush', () => {
  // Un refus est TERMINAL : le site ne peut plus redemander. Reproposer
  // « Activer » serait une promesse qu'on ne tient pas.
  it('n’offre d’action que quand il y en a une', () => {
    expect(libellePush('a-demander').actif).toBe(true);
    for (const e of ['actif', 'refuse', 'indisponible'] as const) {
      expect(libellePush(e).actif).toBe(false);
    }
  });

  it('explique chaque bouton éteint qui pourrait passer pour une panne', () => {
    expect(aidePush('refuse')).not.toBe('');
    expect(aidePush('indisponible')).not.toBe('');
    expect(aidePush('a-demander')).toBe('');
    expect(aidePush('actif')).toBe('');
  });
});

describe('lireNotification', () => {
  it('lit un message complet et pointe vers le match', () => {
    expect(lireNotification({ title: 'C’est calé ✅', body: 'Mardi 19h', matchId: 'm1' })).toEqual({
      titre: 'C’est calé ✅', corps: 'Mardi 19h', cible: '/match/m1',
    });
  });

  // Le payload vient du réseau : un champ manquant ne doit pas faire
  // disparaître la notification, seulement l'appauvrir.
  it('survit à tout ce qui manque ou n’est pas une chaîne', () => {
    expect(lireNotification(null)).toEqual({ titre: 'Kolektif', corps: '', cible: '/' });
    expect(lireNotification({})).toEqual({ titre: 'Kolektif', corps: '', cible: '/' });
    expect(lireNotification({ title: 42, matchId: { x: 1 } })).toEqual({
      titre: 'Kolektif', corps: '', cible: '/',
    });
    expect(lireNotification({ title: '   ', matchId: '  ' }).titre).toBe('Kolektif');
  });

  it('ouvre toujours quelque chose', () => {
    for (const d of [null, {}, { matchId: '' }, { matchId: 'x' }]) {
      expect(lireNotification(d).cible.startsWith('/')).toBe(true);
    }
  });
});

describe('routeHeritee', () => {
  // Ces liens circulent dans des conversations et rien ne les rappellera.
  it('traduit les invitations de la v1', () => {
    expect(routeHeritee('#j=abc123')).toBe('/match/abc123');
    expect(routeHeritee('j=abc123')).toBe('/match/abc123');
    expect(routeHeritee('#j=a-b_C9')).toBe('/match/a-b_C9');
  });

  it('laisse passer ce qui est déjà une route de la v2', () => {
    expect(routeHeritee('#/match/abc')).toBeNull();
    expect(routeHeritee('#/matchs')).toBeNull();
    expect(routeHeritee('')).toBeNull();
  });

  // Un identifiant Firestore n'a ni slash ni point : refuser le reste évite
  // qu'un hash bricolé se transforme en chemin.
  it('refuse ce qui n’est pas un identifiant', () => {
    expect(routeHeritee('#j=../../admin')).toBeNull();
    expect(routeHeritee('#j=a/b')).toBeNull();
    expect(routeHeritee('#j=')).toBeNull();
  });
});

describe('destinationSure', () => {
  it('garde un chemin interne', () => {
    expect(destinationSure('/match/m1')).toBe('/match/m1');
    expect(destinationSure('/matchs')).toBe('/matchs');
  });

  // `//ailleurs.example` est une URL ABSOLUE pour le navigateur : la retenir
  // ferait de l'écran de connexion un tremplin vers n'importe quel site.
  it('refuse tout ce qui peut sortir du site', () => {
    expect(destinationSure('//ailleurs.example')).toBeNull();
    expect(destinationSure('https://ailleurs.example')).toBeNull();
    expect(destinationSure('match/m1')).toBeNull();
    expect(destinationSure(null)).toBeNull();
    expect(destinationSure(undefined)).toBeNull();
    expect(destinationSure(42 as unknown as string)).toBeNull();
  });

  // Se souvenir de l'écran de connexion ferait boucler dessus après connexion.
  it('ne retient pas les écrans d’entrée', () => {
    expect(destinationSure('/connexion')).toBeNull();
    expect(destinationSure('/bienvenue')).toBeNull();
  });
});
