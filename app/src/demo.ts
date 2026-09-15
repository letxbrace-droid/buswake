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
