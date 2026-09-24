import { describe, it, expect } from 'vitest';
import { CreerMatchSchema, lireMatch, UtilisateurSchema } from './schemas';

describe('UtilisateurSchema', () => {
  // Un document écrit par une version plus ancienne de l'app peut manquer de
  // presque tout. Il doit se lire quand même : faire tomber l'écran Profil
  // d'un joueur inscrit il y a six mois serait pire que des valeurs par
  // défaut.
  it('lit un document minimal sans rien casser', () => {
    const r = UtilisateurSchema.safeParse({ uid: 'u1' });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.pseudo).toBe('Joueur');
    expect(r.data.xp).toBe(0);
    expect(r.data.posteFavori).toBe('milieu');
    expect(r.data.atouts).toEqual({});
    expect(r.data.stats).toEqual({});
  });

  it('accepte un codePostal null — c’est ce que l’inscription écrit quand il est vide', () => {
    const r = UtilisateurSchema.safeParse({ uid: 'u1', codePostal: null });
    expect(r.success && r.data.codePostal).toBe('');
  });

  it('ne se laisse pas empoisonner par un xp non numérique', () => {
    const r = UtilisateurSchema.safeParse({ uid: 'u1', xp: 'beaucoup' });
    expect(r.success && r.data.xp).toBe(0);
  });

  it('garde les valeurs réelles quand elles sont là', () => {
    const r = UtilisateurSchema.safeParse({
      uid: 'u1', pseudo: 'Sam', xp: 1240, posteFavori: 'attaquant',
      atouts: { vitesse: 80 }, stats: { matchsJoues: 12 },
    });
    expect(r.success && r.data.atouts.vitesse).toBe(80);
    expect(r.success && r.data.stats.matchsJoues).toBe(12);
  });
});

describe('lireMatch', () => {
  it('rend null sur un document inexploitable plutôt que de jeter', () => {
    expect(lireMatch('m1', null)).toBeNull();
    expect(lireMatch('m1', 'pas un objet')).toBeNull();
  });

  it('retombe sur sondage quand le statut est inconnu', () => {
    const m = lireMatch('m1', { statut: 'zarbi' });
    expect(m?.statut).toBe('sondage');
  });
});

describe('CreerMatchSchema', () => {
  const base = {
    sport: 'foot5',
    joueursMax: 10,
    creneauxProposes: [{ date: new Date(), lieu: 'Le Five' }],
  };

  it('accepte une création valide', () => {
    expect(CreerMatchSchema.safeParse(base).success).toBe(true);
  });

  // La borne reflète EXACTEMENT la règle Firestore
  // (creneauxProposes.size() <= 10). La refuser ici donne un message clair
  // au lieu d'un rejet serveur opaque.
  it('refuse plus de dix créneaux, comme la règle serveur', () => {
    const onze = Array.from({ length: 11 }, () => ({ date: new Date(), lieu: 'X' }));
    expect(CreerMatchSchema.safeParse({ ...base, creneauxProposes: onze }).success).toBe(false);
  });

  it('exige au moins un créneau et un lieu', () => {
    expect(CreerMatchSchema.safeParse({ ...base, creneauxProposes: [] }).success).toBe(false);
    expect(
      CreerMatchSchema.safeParse({ ...base, creneauxProposes: [{ date: new Date(), lieu: '' }] })
        .success,
    ).toBe(false);
  });
});

describe('lireMatch — fidélité au document réellement stocké', () => {
  /**
   * LE DÉFAUT QUE CE BLOC EXISTE POUR ATTRAPER.
   *
   * Zod supprime ce qu'il ne déclare pas, en silence et sans erreur. Le
   * schéma déclarait `createur` là où la base écrit `createurUid` : le champ
   * arrivait donc toujours vide, personne n'était reconnu comme créateur de
   * son propre match, et le bouton « Annuler ce match » ne s'affichait
   * jamais — pour personne. `lieuCoords` était absent pour la même raison :
   * la distance ne se calculait pas, et le sélecteur de rayon était purement
   * décoratif.
   *
   * Rien ne le signalait. Pas une erreur, pas un avertissement : un champ
   * vide se comporte comme une donnée manquante, donc comme un cas normal.
   *
   * Ce document est copié de ce qu'écrivent `services/cycle.creer` et la v1.
   * Tout champ que l'app LIT doit survivre au passage.
   */
  const DOCUMENT_REEL = {
    createurUid: 'zizou',
    sport: 'foot5',
    statut: 'sondage',
    joueursMax: 12,
    joueursInscrits: ['zizou'],
    waitlist: [],
    creneauxProposes: [
      { date: new Date('2026-09-18T19:00:00Z'), lieu: 'LE FIVE Morangis', votes: [], lat: 48.71, lon: 2.33 },
    ],
    votes: {},
    visibilite: 'public',
    finVisible: new Date('2026-09-19T19:00:00Z'),
    lieuCoords: { lat: 48.71, lon: 2.33 },
    dateFinale: null,
    lieuFinal: '',
  };

  it('garde le créateur — c’est lui qui décide du match', () => {
    expect(lireMatch('m1', DOCUMENT_REEL)?.createurUid).toBe('zizou');
  });

  it('garde les coordonnées, sans quoi le rayon ne filtre rien', () => {
    const m = lireMatch('m1', DOCUMENT_REEL);
    expect(m?.lieuCoords).toEqual({ lat: 48.71, lon: 2.33 });
    expect(m?.creneauxProposes[0].lat).toBe(48.71);
  });

  it('garde tout ce que l’app lit sur un match', () => {
    const m = lireMatch('m1', DOCUMENT_REEL);
    // Le champ nommé ici est un champ dont un écran dépend. En retirer un
    // du schéma le vide en silence.
    for (const champ of [
      'createurUid', 'sport', 'statut', 'joueursMax', 'joueursInscrits',
      'creneauxProposes', 'finVisible', 'lieuCoords',
    ] as const) {
      expect(m?.[champ], `champ perdu au parsing : ${champ}`).not.toBeUndefined();
    }
  });

  it('survit à un document ancien qui ne porte rien de tout ça', () => {
    const m = lireMatch('vieux', { statut: 'terminé' });
    expect(m?.createurUid).toBe('');
    expect(m?.lieuCoords).toBeUndefined();
  });
});

describe('UtilisateurSchema — fidélité au document réellement stocké', () => {
  /**
   * LA MÊME GARDE QUE POUR LE MATCH, GÉNÉRALISÉE.
   *
   * Elle ne couvrait que `lireMatch`, et le défaut est revenu ailleurs :
   * `noteSum` et `noteCount` existent en base — les règles les refusent
   * explicitement à tout client, donc ils sont bien là — mais n'étaient pas
   * déclarés ici. Zod les supprimait, et la note moyenne du joueur était
   * impossible à calculer alors que toute la donnée était présente.
   *
   * Ce document est copié de ce qu'écrivent l'inscription et les Cloud
   * Functions. Tout champ que l'app LIT doit survivre au passage.
   */
  const DOCUMENT_REEL = {
    pseudo: 'Zizou',
    xp: 2240,
    badges: ['premier-match'],
    codePostal: '91130',
    domicileLat: 48.726,
    domicileLon: 2.283,
    posteFavori: 'milieu',
    club: 'OM',
    atouts: { vitesse: 82, dribble: 79 },
    profilComplet: true,
    stats: { matchsJoues: 42, victoires: 28, hommeDuMatch: 2, presences: 11, lapins: 1 },
    streak: 3,
    noteSum: 42,
    noteCount: 5,
    friends: ['u7'],
    friendRequestsSent: [],
    friendRequestsReceived: ['u3'],
  };

  it('garde tout ce que l’app lit sur un joueur', () => {
    const u = UtilisateurSchema.parse({ ...DOCUMENT_REEL, uid: 'z' });
    for (const champ of [
      'pseudo', 'xp', 'badges', 'codePostal', 'domicileLat', 'domicileLon',
      'posteFavori', 'atouts', 'stats', 'streak', 'noteSum', 'noteCount',
      'friends', 'friendRequestsSent', 'friendRequestsReceived',
    ] as const) {
      expect(u[champ], `champ perdu au parsing : ${champ}`).not.toBeUndefined();
    }
  });

  it('garde la note, sans quoi la moyenne est incalculable', () => {
    const u = UtilisateurSchema.parse({ ...DOCUMENT_REEL, uid: 'z' });
    expect(u.noteSum / u.noteCount).toBeCloseTo(8.4, 5);
  });

  it('survit à un compte tout neuf qui ne porte rien de tout ça', () => {
    const u = UtilisateurSchema.parse({ uid: 'neuf', pseudo: 'Neuf' });
    expect(u.noteCount).toBe(0);
    expect(u.friends).toEqual([]);
  });
});
