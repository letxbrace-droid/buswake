// Règles de `matchs/{id}` éprouvées dans les deux sens.
import { after, before, beforeEach, describe, it } from 'node:test';
import { environnement, passe, poser, refuse } from './outils.mjs';

let env;
before(async () => {
  env = await environnement('kolektif-regles-matchs');
});
after(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const db = (uid) => env.authenticatedContext(uid).firestore();

const creation = (uid, extra = {}) => ({
  createurUid: uid,
  sport: 'foot5',
  statut: 'sondage',
  joueursMax: 10,
  duree: 60,
  niveau: 'tous',
  message: null,
  joueursInscrits: [uid],
  waitlist: [],
  creneauxProposes: [],
  votes: {},
  visibilite: 'public',
  ...extra,
});

const confirme = {
  createurUid: 'orga',
  sport: 'foot5',
  statut: 'confirmé',
  joueursMax: 10,
  duree: 60,
  niveau: 'tous',
  joueursInscrits: ['orga', 'a', 'b', 'c'],
  waitlist: [],
  votes: {},
  visibilite: 'public',
};

describe('créer un match', () => {
  it('passe : en son nom, en sondage, champs bornés', async () => {
    await passe(db('orga').collection('matchs').add(creation('orga')));
  });
  it('refuse : au nom de quelqu’un d’autre', async () => {
    await refuse(db('orga').collection('matchs').add(creation('autre')));
  });
  it('refuse : directement confirmé', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { statut: 'confirmé' })));
  });
  it('refuse : avec un grand livre _xp pré-rempli', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { _xp: { orga: {} } })));
  });
  it('refuse : 41 places', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { joueursMax: 41 })));
  });
  it('refuse : 11 créneaux', async () => {
    const c = Array.from({ length: 11 }, () => ({ date: '2026-10-01', heure: '20:00', lieu: 'x' }));
    await refuse(db('orga').collection('matchs').add(creation('orga', { creneauxProposes: c })));
  });
  it('refuse : un mot de 201 caractères', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { message: 'x'.repeat(201) })));
  });

  // Durée et niveau : bornés comme sur le formulaire. Sans règle, un match
  // de 100 000 minutes gardait ses joueurs « en match » pour des mois.
  it('refuse : une durée de 100 000 minutes', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { duree: 100000 })));
  });
  it('refuse : une durée de 10 minutes', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { duree: 10 })));
  });
  it('refuse : une durée non entière', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { duree: 60.5 })));
  });
  it('refuse : un niveau hors liste', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { niveau: '<svg>' })));
  });
  it('passe : chaque niveau connu, et les bornes de durée', async () => {
    for (const niveau of ['tous', 'debutant', 'intermediaire', 'confirme']) {
      await passe(db('orga').collection('matchs').add(creation('orga', { niveau })));
    }
    await passe(db('orga').collection('matchs').add(creation('orga', { duree: 30 })));
    await passe(db('orga').collection('matchs').add(creation('orga', { duree: 240 })));
  });
  it('passe : un ancien client sans durée ni niveau', async () => {
    const d = creation('orga');
    delete d.duree;
    delete d.niveau;
    await passe(db('orga').collection('matchs').add(d));
  });
  it('refuse : un tableau de buts posé dès la création', async () => {
    await refuse(db('orga').collection('matchs').add(creation('orga', { buts: { orga: 5 } })));
  });
});

describe('terminer un match', () => {
  const resultat = {
    statut: 'terminé',
    scoreA: 3,
    scoreB: 2,
    hommeDuMatchUid: 'a',
    attendance: { orga: true, a: true, b: true, c: false },
    buts: { a: 2, b: 1 },
    passes: { orga: 1 },
  };
  beforeEach(async () => {
    await poser(env, 'matchs/m1', confirme);
  });

  it('passe : le créateur écrit le résultat', async () => {
    await passe(db('orga').doc('matchs/m1').update(resultat));
  });
  it('refuse : un joueur qui n’est pas le créateur', async () => {
    await refuse(db('a').doc('matchs/m1').update(resultat));
  });
  it('refuse : le créateur qui touche au grand livre _xp', async () => {
    await refuse(db('orga').doc('matchs/m1').update({ ...resultat, _xp: {} }));
  });
  it('refuse : le créateur qui se transfère… à quelqu’un d’autre', async () => {
    await refuse(db('orga').doc('matchs/m1').update({ createurUid: 'a' }));
  });
  it('refuse : un statut inconnu', async () => {
    await refuse(db('orga').doc('matchs/m1').update({ statut: 'annulé' }));
  });
  it('refuse : un tableau de buts à 41 entrées', async () => {
    const buts = Object.fromEntries(Array.from({ length: 41 }, (_, i) => ['u' + i, 1]));
    await refuse(db('orga').doc('matchs/m1').update({ ...resultat, buts }));
  });
  it('refuse : des buts qui ne sont pas une table', async () => {
    await refuse(db('orga').doc('matchs/m1').update({ ...resultat, buts: 'beaucoup' }));
  });
  it('refuse : des présences à 41 entrées', async () => {
    const attendance = Object.fromEntries(Array.from({ length: 41 }, (_, i) => ['u' + i, true]));
    await refuse(db('orga').doc('matchs/m1').update({ ...resultat, attendance }));
  });
  it('refuse : un score négatif ou absurde', async () => {
    await refuse(db('orga').doc('matchs/m1').update({ ...resultat, scoreA: -1 }));
    await refuse(db('orga').doc('matchs/m1').update({ ...resultat, scoreA: 1000 }));
  });
  it('refuse : la durée gonflée après coup', async () => {
    await refuse(db('orga').doc('matchs/m1').update({ duree: 100000 }));
  });
});

describe('participer', () => {
  beforeEach(async () => {
    await poser(env, 'matchs/m1', { ...confirme, statut: 'sondage' });
  });
  it('passe : un joueur s’inscrit', async () => {
    await passe(db('d').doc('matchs/m1').update({ joueursInscrits: [...confirme.joueursInscrits, 'd'] }));
  });
  it('passe : un joueur note — sa propre fiche', async () => {
    await passe(db('a').doc('matchs/m1').update({ ratings: { a: { b: 4 } } }));
  });
  it('refuse : un joueur écrit la fiche de notes d’un autre', async () => {
    await refuse(db('a').doc('matchs/m1').update({ ratings: { b: { a: 5 } } }));
  });
  it('refuse : un joueur qui touche au statut', async () => {
    await refuse(db('a').doc('matchs/m1').update({ statut: 'confirmé' }));
  });
  it('refuse : un joueur qui pose des buts', async () => {
    await refuse(db('a').doc('matchs/m1').update({ buts: { a: 9 } }));
  });
});

describe('supprimer un match', () => {
  beforeEach(async () => {
    await poser(env, 'matchs/m1', confirme);
  });
  it('passe : le créateur', async () => {
    await passe(db('orga').doc('matchs/m1').delete());
  });
  it('refuse : un autre joueur', async () => {
    await refuse(db('a').doc('matchs/m1').delete());
  });
});

// Les écritures EXACTES de services/cycle.rejoindreMatch (arrayUnion), sur
// un match à la forme de services/cycle.creer.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
const FV = firebase.firestore.FieldValue;

describe('rejoindre un match, comme l’app le fait', () => {
  const cree = {
    createurUid: 'orga', sport: 'foot5', statut: 'sondage', joueursMax: 10, duree: 60, niveau: 'tous',
    message: '', joueursInscrits: ['orga'], waitlist: [], votes: {}, visibilite: 'public',
    creneauxProposes: [{ date: new Date(), lieu: 'Gymnase', adresse: '1 rue X, Massy', lat: 48.7, lon: 2.3 }],
    finVisible: new Date(Date.now() + 86400000),
  };
  it('passe : un joueur devient titulaire', async () => {
    await poser(env, 'matchs/r1', cree);
    await passe(db('moi').doc('matchs/r1').update({ joueursInscrits: FV.arrayUnion('moi'), waitlist: FV.arrayRemove('moi') }));
  });
  it('passe : un joueur se met sur le banc d’un match complet', async () => {
    await poser(env, 'matchs/r2', { ...cree, joueursMax: 2, joueursInscrits: ['orga', 'x'], waitlist: ['y'] });
    await passe(db('moi').doc('matchs/r2').update({ waitlist: FV.arrayUnion('moi') }));
  });
  it('passe : un joueur vote', async () => {
    await poser(env, 'matchs/r3', cree);
    await passe(db('moi').doc('matchs/r3').update({ 'votes.0': FV.arrayUnion('moi') }));
  });
  it('passe : le créateur se retire de son propre match', async () => {
    await poser(env, 'matchs/r4', { ...cree, joueursInscrits: ['orga', 'a'] });
    await passe(db('orga').doc('matchs/r4').update({ joueursInscrits: ['a'], waitlist: [] }));
  });
});
