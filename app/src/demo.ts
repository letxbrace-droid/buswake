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
