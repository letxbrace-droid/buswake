// Règles de `users/{uid}` éprouvées dans les deux sens. Le classement des
// joueurs vaut ce que vaut cette règle.
import { after, before, beforeEach, describe, it } from 'node:test';
import { environnement, passe, poser, refuse } from './outils.mjs';

let env;
before(async () => {
  env = await environnement('kolektif-regles-users');
});
after(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await poser(env, 'users/moi', {
    pseudo: 'Moi',
    email: 'moi@exemple.fr',
    xp: 100,
    stats: { matchsJoues: 1, buts: 0 },
    friends: [],
  });
});

const db = (uid) => env.authenticatedContext(uid).firestore();

describe('son propre profil', () => {
  it('passe : changer son pseudo', async () => {
    await passe(db('moi').doc('users/moi').update({ pseudo: 'Nouveau' }));
  });
  it('refuse : un pseudo de 25 caractères', async () => {
    await refuse(db('moi').doc('users/moi').update({ pseudo: 'x'.repeat(25) }));
  });
  it('refuse : un pseudo égal à l’email', async () => {
    await refuse(db('moi').doc('users/moi').update({ pseudo: 'moi@exemple.fr' }));
  });
  for (const champ of ['xp', 'badges', 'stats', 'noteSum', 'noteCount', 'presences', 'lapins', 'streak']) {
    it(`refuse : se donner du ${champ}`, async () => {
      await refuse(db('moi').doc('users/moi').update({ [champ]: 9999 }));
    });
  }
  it('refuse : se créditer des buts', async () => {
    await refuse(db('moi').doc('users/moi').update({ 'stats.buts': 50 }));
  });
});

describe('le profil d’un autre', () => {
  it('passe : lui envoyer une demande d’ami', async () => {
    await passe(db('toi').doc('users/moi').update({ friendRequestsReceived: ['toi'] }));
  });
  it('refuse : changer son pseudo', async () => {
    await refuse(db('toi').doc('users/moi').update({ pseudo: 'Pirate' }));
  });
  it('refuse : lui retirer de l’XP', async () => {
    await refuse(db('toi').doc('users/moi').update({ xp: 0 }));
  });
});

describe('lecture', () => {
  it('passe : un connecté lit un profil (classement)', async () => {
    await passe(db('toi').doc('users/moi').get());
  });
  it('refuse : un visiteur anonyme', async () => {
    await refuse(env.unauthenticatedContext().firestore().doc('users/moi').get());
  });
});

describe('créer son compte', () => {
  const neuf = {
    email: 'neuf@exemple.fr',
    pseudo: 'Neuf',
    posteFavori: 'milieu',
    xp: 0,
    badges: [],
    stats: { matchsJoues: 0, victoires: 0, hommeDuMatch: 0 },
    profilComplet: false,
  };
  it('passe : le profil initial de l’inscription', async () => {
    await passe(db('neuf').doc('users/neuf').set(neuf));
  });
  it('passe : un profil sans aucun champ de jeu', async () => {
    await passe(db('neuf').doc('users/neuf').set({ email: 'neuf@exemple.fr', pseudo: 'Neuf' }));
  });
  // Le trou : supprimer son profil est permis, et `create` n'est pas `update`.
  it('refuse : supprimer puis recréer son profil avec 999 999 XP', async () => {
    await passe(db('moi').doc('users/moi').delete());
    await refuse(db('moi').doc('users/moi').set({ ...neuf, xp: 999999 }));
  });
  it('refuse : naître avec des buts', async () => {
    await refuse(db('neuf').doc('users/neuf').set({ ...neuf, stats: { ...neuf.stats, buts: 40 } }));
  });
  it('refuse : naître avec une statistique inconnue', async () => {
    await refuse(db('neuf').doc('users/neuf').set({ ...neuf, stats: { triche: 1 } }));
  });
  it('refuse : naître avec des badges', async () => {
    await refuse(db('neuf').doc('users/neuf').set({ ...neuf, badges: ['hdm'] }));
  });
  it('refuse : naître avec un compteur de gains trafiqué', async () => {
    await refuse(db('neuf').doc('users/neuf').set({ ...neuf, _gains: {} }));
  });
  it('refuse : créer le profil d’un autre', async () => {
    await refuse(db('neuf').doc('users/autre').set(neuf));
  });
});

describe('fiabilité', () => {
  it('refuse : se fabriquer un historique « joué » à la création', async () => {
    await refuse(db('n2').doc('users/n2').set({ pseudo: 'N2', historique: Array(10).fill('J') }));
  });
  it('refuse : effacer ses lapins de son historique', async () => {
    await poser(env, 'users/moi', { pseudo: 'Moi', historique: ['L', 'L', 'J'] });
    await refuse(db('moi').doc('users/moi').update({ historique: ['J', 'J', 'J'] }));
  });
  it('refuse : remettre son compteur de désistements à zéro', async () => {
    await poser(env, 'users/moi', { pseudo: 'Moi', desistements: 4 });
    await refuse(db('moi').doc('users/moi').update({ desistements: 0 }));
  });
});
