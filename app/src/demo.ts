import type { Match } from './domaine/schemas';

/** Fixtures de développement — pour travailler le rendu sans réseau.
 *  Branchées uniquement sous `import.meta.env.DEV`, donc éliminées du bundle
 *  de production par le tree-shaking. Rien ici ne part chez un joueur. */
const h = (n: number) => new Date(Date.now() + n * 3600e3);

export const MATCHS_DEMO: Match[] = [
  {
    id: 'd1', createur: 'u9', sport: 'foot5', statut: 'confirmé',
    joueursInscrits: ['u1', 'a', 'b', 'c', 'd', 'e', 'f', 'g'],
    creneauxProposes: [], dateFinale: h(50), lieuFinal: 'Le Five Massy',
    finVisible: h(54), joueursMax: 10,
  },
  {
    id: 'd2', createur: 'u1', sport: 'foot5', statut: 'sondage',
    joueursInscrits: ['u1', 'a', 'b'],
    creneauxProposes: [{ date: h(74), lieu: 'UrbanSoccer Vitry', votes: ['u1', 'a'] }],
    dateFinale: null, lieuFinal: '', finVisible: h(80), joueursMax: 10,
  },
  {
    id: 'd3', createur: 'u4', sport: 'foot5', statut: 'sondage',
    joueursInscrits: ['x', 'y'],
    creneauxProposes: [{ date: h(98), lieu: 'Le Five Bercy', votes: ['x'] }],
    dateFinale: null, lieuFinal: '', finVisible: h(104), joueursMax: 10,
  },
];

export const EQUIPES_DEMO = [
  { id: 'e1', nom: 'Les Bleus du Dimanche', sport: 'foot5', couleur: '#00B0FF',
    embleme: 'etoile', niveau: 'intermediaire' as const, membres: ['a', 'b', 'c', 'd'],
    stats: { victoires: 7, nuls: 2, defaites: 3, serie: 3 } },
  { id: 'e2', nom: 'Massy Warriors', sport: 'foot5', couleur: '#FF8A3D',
    embleme: 'griffe', niveau: 'confirme' as const, membres: ['a', 'b', 'c', 'd', 'e'],
    stats: { victoires: 12, nuls: 1, defaites: 2, serie: 0 } },
  { id: 'e3', nom: 'FC Palaiseau', sport: 'foot5', couleur: '#FFD24A',
    embleme: '', niveau: 'debutant' as const, membres: ['a', 'b'],
    stats: { victoires: 1, nuls: 0, defaites: 4, serie: 0 } },
  { id: 'e4', nom: 'Vitry Nord', sport: 'foot5', couleur: '#B36BFF',
    embleme: 'couronne', niveau: 'intermediaire' as const, membres: ['a', 'b', 'c'],
    stats: { victoires: 5, nuls: 3, defaites: 5, serie: 0 } },
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
];

export const PROFIL_DEMO = {
  uid: 'u1',
  pseudo: 'Sam',
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
    id: 'd2', createur: 'u1', createurUid: 'u1', sport: 'foot5', statut: 'sondage' as const,
    joueursInscrits: ['u1', 'Karim', 'Naïm', 'Théo', 'Yanis', 'Ibrahim', 'Lucas'],
    waitlist: ['Adam', 'Mehdi'],
    creneauxProposes: [
      { date: h(74), lieu: 'UrbanSoccer Vitry', votes: [] },
      { date: h(98), lieu: 'Le Five Bercy', votes: [] },
      { date: h(122), lieu: 'Le Five Massy', votes: [] },
    ],
    dateFinale: null, lieuFinal: '', finVisible: h(128), joueursMax: 10,
  },
  votes: { '0': ['u1', 'Karim', 'Naïm'], '1': ['Théo'], '2': ['Yanis', 'Lucas'] } as Record<string, string[]>,
};

export const TERMINER_DEMO = {
  inscrits: ['u1', 'k', 'n', 't', 'y', 'i', 'l', 'a', 'm', 'z'],
  pseudos: {
    u1: 'Sam', k: 'Karim', n: 'Naïm', t: 'Théo', y: 'Yanis',
    i: 'Ibrahim', l: 'Lucas', a: 'Adam', m: 'Mehdi', z: 'Zied',
  } as Record<string, string>,
  camps: [
    { nom: 'Chasubles', couleur: '#FF6A00', joueurs: ['u1', 'k', 'n', 't', 'y'] },
    { nom: 'Verts', couleur: '#5DD62C', joueurs: ['i', 'l', 'a', 'm', 'z'] },
  ],
};

export const APRES_DEMO = {
  inscrits: ['u1', 'k', 'n', 't', 'y', 'i'],
  pseudos: { u1: 'Sam', k: 'Karim', n: 'Naïm', t: 'Théo', y: 'Yanis', i: 'Ibrahim' } as Record<string, string>,
  votes: { k: ['n', 't', 'y'], t: ['k'], n: ['i'] } as Record<string, string[]>,
};
