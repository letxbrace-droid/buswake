// Règles de `equipes/{id}` éprouvées dans les deux sens.
import { after, before, beforeEach, describe, it } from 'node:test';
import { environnement, passe, poser, refuse } from './outils.mjs';

let env;
before(async () => { env = await environnement('kolektif-regles-equipes'); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const db = (uid) => env.authenticatedContext(uid).firestore();

// La forme exacte de domaine/creationClub.documentClub.
const club = (uid, extra = {}) => ({
  nom: 'Les Bleus', capitaineUid: uid, sport: 'foot5', niveau: 'intermediaire',
  membres: [uid], couleur: '#5DD62C', embleme: 'eclair', appel: null,
  stats: { victoires: 0, nuls: 0, defaites: 0, serie: 0, butsPour: 0, butsContre: 0 },
  ...extra,
});

describe('créer un club', () => {
  it('passe : le document du formulaire', async () => {
    await passe(db('cap').collection('equipes').add(club('cap')));
  });
  it('passe : sans palmarès du tout', async () => {
    const d = club('cap'); delete d.stats;
    await passe(db('cap').collection('equipes').add(d));
  });
  it('refuse : au nom d’un autre capitaine', async () => {
    await refuse(db('cap').collection('equipes').add(club('autre')));
  });
  it('refuse : une couleur hors liste', async () => {
    await refuse(db('cap').collection('equipes').add(club('cap', { couleur: 'red' })));
  });
  it('refuse : un nom de 29 caractères', async () => {
    await refuse(db('cap').collection('equipes').add(club('cap', { nom: 'x'.repeat(29) })));
  });
  // Le trou : le palmarès est refusé à tout client en MODIFICATION, mais la
  // création l'acceptait tel quel — un club naissait avec 999 victoires.
  it('refuse : naître avec 999 victoires', async () => {
    await refuse(db('cap').collection('equipes').add(club('cap', {
      stats: { victoires: 999, nuls: 0, defaites: 0, serie: 0, butsPour: 0, butsContre: 0 },
    })));
  });
  it('refuse : naître avec une statistique inconnue', async () => {
    await refuse(db('cap').collection('equipes').add(club('cap', { stats: { triche: 1 } })));
  });
});

describe('rejoindre et quitter', () => {
  beforeEach(async () => { await poser(env, 'equipes/e1', club('cap')); });
  it('passe : je m’ajoute', async () => {
    await passe(db('moi').doc('equipes/e1').update({ membres: ['cap', 'moi'] }));
  });
  it('refuse : j’ajoute quelqu’un d’autre', async () => {
    await refuse(db('moi').doc('equipes/e1').update({ membres: ['cap', 'lui'] }));
  });
  it('refuse : je retire le capitaine', async () => {
    await refuse(db('moi').doc('equipes/e1').update({ membres: [] }));
  });
  it('refuse : je me donne des victoires en rejoignant', async () => {
    await refuse(db('moi').doc('equipes/e1').update({ membres: ['cap', 'moi'], 'stats.victoires': 5 }));
  });
});

describe('quitter son club', () => {
  beforeEach(async () => { await poser(env, 'equipes/e1', club('cap', { membres: ['cap', 'a'] })); });
  it('passe : un membre se retire', async () => {
    await passe(db('a').doc('equipes/e1').update({ membres: ['cap'] }));
  });
  it('passe : le capitaine transmet le brassard et part, en une écriture', async () => {
    await passe(db('cap').doc('equipes/e1').update({ capitaineUid: 'a', membres: ['a'] }));
  });
  it('refuse : un membre se proclame capitaine', async () => {
    await refuse(db('a').doc('equipes/e1').update({ capitaineUid: 'a' }));
  });
  it('passe : le capitaine supprime son club', async () => {
    await passe(db('cap').doc('equipes/e1').delete());
  });
  it('refuse : un membre supprime le club', async () => {
    await refuse(db('a').doc('equipes/e1').delete());
  });
});
