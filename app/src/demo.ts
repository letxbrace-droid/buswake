import type { Match } from './domaine/schemas';

/** Fixtures de développement — pour travailler le rendu sans réseau.
 *  Branchées uniquement sous `import.meta.env.DEV`, donc éliminées du bundle
 *  de production par le tree-shaking. Rien ici ne part chez un joueur. */
const h = (n: number) => new Date(Date.now() + n * 3600e3);

export const MATCHS_DEMO: Match[] = [
  {
    id: 'd1', createurUid: 'u9', sport: 'foot5', statut: 'confirmé',
    joueursInscrits: ['u1', 'u7', 'u3', 'u9', 'u2', 'u5', 'u4', 'u8'],
    creneauxProposes: [], dateFinale: h(50), lieuFinal: 'LE FIVE Morangis',
    finVisible: h(54), joueursMax: 10,
  },
  {
    id: 'd2', createurUid: 'u1', sport: 'foot5', statut: 'sondage',
    joueursInscrits: ['u1', 'u7', 'u3'],
    creneauxProposes: [{ date: h(74), lieu: 'UrbanSoccer Orsay', votes: ['u1', 'u7'] }],
    dateFinale: null, lieuFinal: '', finVisible: h(80), joueursMax: 10,
  },
  {
    id: 'd3', createurUid: 'u4', sport: 'foot5', statut: 'sondage',
    joueursInscrits: ['u2', 'u5'],
    creneauxProposes: [{ date: h(98), lieu: 'LE FIVE Créteil', votes: ['u2'] }],
    dateFinale: null, lieuFinal: '', finVisible: h(104), joueursMax: 10,
  },
];

export const EQUIPES_DEMO = [
  // Le joueur de démonstration est CAPITAINE de la première : sans ça,
  // l'onglet Mon Club ne rendait que son état vide, et l'écran le plus dense
  // de l'app n'était mesuré par aucune sonde.
  { id: 'e1', nom: 'Les Bleus du Dimanche', sport: 'foot5', couleur: '#00B0FF',
    embleme: 'etoile', niveau: 'intermediaire' as const, capitaineUid: 'u1',
    appel: 'On cherche un gardien pour le dimanche matin',
    membres: ['u1', 'u7', 'u3', 'u9'],
    stats: { victoires: 7, nuls: 2, defaites: 3, serie: 3, butsPour: 34, butsContre: 21 } },
  { id: 'e2', nom: 'Massy Warriors', sport: 'foot5', couleur: '#FF8A3D',
    embleme: 'griffe', niveau: 'confirme' as const, capitaineUid: 'u7',
    membres: ['u7', 'u2', 'u5', 'u4', 'u8'],
    stats: { victoires: 12, nuls: 1, defaites: 2, serie: 0, butsPour: 51, butsContre: 19 } },
  { id: 'e3', nom: 'FC Palaiseau', sport: 'foot5', couleur: '#FFD24A',
    embleme: '', niveau: 'debutant' as const, capitaineUid: 'u6',
    membres: ['u6', 'u10'],
    stats: { victoires: 1, nuls: 0, defaites: 4, serie: 0, butsPour: 9, butsContre: 28 } },
  { id: 'e4', nom: 'Vitry Nord', sport: 'foot5', couleur: '#B36BFF',
    embleme: 'couronne', niveau: 'intermediaire' as const, capitaineUid: 'u3',
    membres: ['u3', 'u9', 'u2'],
    stats: { victoires: 5, nuls: 3, defaites: 5, serie: 0, butsPour: 22, butsContre: 24 } },
];

export const JOUEURS_DEMO = [
  { id: 'u7', pseudo: 'Karim', xp: 3120, streak: 4, stats: { hommeDuMatch: 6 } },
  { id: 'u3', pseudo: 'Naïm', xp: 2480, stats: { hommeDuMatch: 3 } },
  { id: 'u9', pseudo: 'Théo', xp: 1890 },
  { id: 'u1', pseudo: 'Sam', xp: 1240, streak: 3, stats: { hommeDuMatch: 2 } },
  { id: 'u2', pseudo: 'Yanis', xp: 1105 },
  { id: 'u5', pseudo: 'Ibrahim', xp: 860 },
  { id: 'u4', pseudo: 'Lucas', xp: 640 },
  { id: 'u8', pseudo: 'Adam', xp: 415 },
  { id: 'u6', pseudo: 'Mehdi', xp: 260 },
  { id: 'u10', pseudo: 'Rayan', xp: 180 },
];

/** L'annuaire du jeu d'essai : uid → fiche, pour les pastilles et les fils.
 *  Dérivé de JOUEURS_DEMO pour qu'il ne puisse pas diverger. */
export const PSEUDOS_DEMO: Record<string, { uid: string; pseudo: string; xp: number }> =
  Object.fromEntries(
    JOUEURS_DEMO.map((j) => [j.id, { uid: j.id, pseudo: j.pseudo, xp: j.xp }]),
  );

/** Postes et notes du jeu d'essai — ce que `lireFichesCompletes` rend en
 *  développement, où Firestore n'est pas joignable. */
export const POSTES_DEMO: Record<string, string> = {
  u7: 'attaquant', u3: 'milieu', u9: 'défenseur', u1: 'milieu',
  u2: 'gardien', u5: 'attaquant', u4: 'défenseur', u8: 'milieu', u6: 'gardien',
};

export const NOTES_DEMO: Record<string, { somme: number; nombre: number }> = {
  u7: { somme: 42, nombre: 5 }, u3: { somme: 31.2, nombre: 4 },
  u9: { somme: 21.6, nombre: 3 }, u1: { somme: 33.6, nombre: 4 },
  u2: { somme: 14.4, nombre: 2 }, u5: { somme: 20.7, nombre: 3 },
  u4: { somme: 13.8, nombre: 2 },
};

export const PROFIL_DEMO = {
  uid: 'u1',
  pseudo: 'Sam',
  noteSum: 42,
  noteCount: 5,
  friends: [] as string[],
  friendRequestsSent: [] as string[],
  friendRequestsReceived: [] as string[],
  posteFavori: 'milieu',
  club: 'OM',
  codePostal: '91300',
  profilComplet: true,
  streak: 3,
  xp: 1240,
  atouts: { vitesse: 78, dribble: 81, frappe: 72, defense: 64, physique: 70 },
  badges: ['Régulier', 'Buteur', 'Capitaine'],
  stats: { matchsJoues: 12, victoires: 7, hommeDuMatch: 2, presences: 11, lapins: 1 },
};

export const DETAIL_DEMO = {
  m: {
    id: 'd2', createurUid: 'u1', sport: 'foot5', statut: 'sondage' as const,
    joueursInscrits: ['u1', 'u7', 'u3', 'u9', 'u2', 'u5', 'u4'],
    waitlist: ['u8', 'u6'],
    creneauxProposes: [
      { date: h(74), lieu: 'UrbanSoccer Orsay', votes: [] },
      { date: h(98), lieu: 'LE FIVE Créteil', votes: [] },
      { date: h(122), lieu: 'LE FIVE Morangis', votes: [] },
    ],
    dateFinale: null, lieuFinal: '', finVisible: h(128), joueursMax: 10,
  },
  votes: { '0': ['u1', 'Karim', 'Naïm'], '1': ['Théo'], '2': ['Yanis', 'Lucas'] } as Record<string, string[]>,
};

export const TERMINER_DEMO = {
  inscrits: ['u1', 'u7', 'u3', 'u9', 'u2', 'u5', 'u4', 'u8', 'u6', 'u10'],
  pseudos: {
    u1: 'Sam', k: 'Karim', n: 'Naïm', t: 'Théo', y: 'Yanis',
    i: 'Ibrahim', l: 'Lucas', a: 'Adam', m: 'Mehdi', z: 'Zied',
  } as Record<string, string>,
  camps: [
    { nom: 'Chasubles', couleur: '#FF6A00', joueurs: ['u1', 'u7', 'u3', 'u9', 'u2'] },
    { nom: 'Verts', couleur: '#5DD62C', joueurs: ['u5', 'u4', 'u8', 'u6', 'u10'] },
  ],
};

export const APRES_DEMO = {
  inscrits: ['u1', 'u7', 'u3', 'u9', 'u2', 'u5'],
  pseudos: { u1: 'Sam', k: 'Karim', n: 'Naïm', t: 'Théo', y: 'Yanis', i: 'Ibrahim' } as Record<string, string>,
  votes: { k: ['n', 't', 'y'], t: ['k'], n: ['i'] } as Record<string, string[]>,
};

export const AMIS_DEMO = {
  relations: {
    friends: ['k', 'n'],
    friendRequestsSent: ['t'],
    friendRequestsReceived: ['y'],
  },
  annuaire: {
    k: { uid: 'k', pseudo: 'Karim', xp: 3120 },
    n: { uid: 'n', pseudo: 'Naïm', xp: 2480 },
    t: { uid: 't', pseudo: 'Théo', xp: 1890 },
    y: { uid: 'y', pseudo: 'Yanis', xp: 1105 },
  } as Record<string, { uid: string; pseudo: string; xp: number }>,
};

export const CHAT_DEMO = {
  messages: [
    { id: '1', auteur: 'k', texte: 'On est combien pour vendredi ?', quand: h(-2) },
    { id: '2', auteur: 'u1', texte: 'Sept pour l’instant, il en manque trois.', quand: h(-1.5) },
    { id: '3', auteur: 'n', texte: 'J’amène un pote, ça fera huit.', quand: h(-1) },
    { id: '4', auteur: 'k', texte: 'Nickel. Quelqu’un prend les chasubles ?', quand: h(-0.5) },
  ],
  pseudos: { u1: 'Sam', k: 'Karim', n: 'Naïm' } as Record<string, string>,
};
