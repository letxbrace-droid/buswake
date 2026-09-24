import { describe, it, expect } from 'vitest';
import {
  ambianceDuTerrain, detailsDuLieu, ficheDuTerrain, formatDuMatch, nomDuLieu,
} from './terrainDuMatch';
import { TERRAINS_VERIFIES } from './terrains';
import type { Match } from './schemas';

const m = (p: Partial<Match> = {}): Match =>
  ({
    id: 'm', createurUid: 'c', sport: 'foot5', statut: 'sondage',
    joueursInscrits: [], creneauxProposes: [], dateFinale: null, lieuFinal: '',
    finVisible: null, joueursMax: 10, ...p,
  }) as Match;

const REEL = TERRAINS_VERIFIES[0];

describe('nomDuLieu', () => {
  it('prend le lieu final, sinon le premier créneau qui en porte un', () => {
    expect(nomDuLieu(m({ lieuFinal: 'A', creneauxProposes: [{ date: null, lieu: 'B', votes: [] }] }))).toBe('A');
    expect(nomDuLieu(m({ creneauxProposes: [{ date: null, lieu: '', votes: [] }, { date: null, lieu: 'B', votes: [] }] }))).toBe('B');
    expect(nomDuLieu(m())).toBe('');
  });
});

describe('ficheDuTerrain', () => {
  it('retrouve un terrain vérifié par son nom', () => {
    expect(ficheDuTerrain(m({ lieuFinal: REEL.n }))?.adr).toBe(REEL.adr);
  });

  // Le nom vient d'une saisie ou d'une API tierce : la casse et les accents
  // ne doivent pas faire rater la fiche.
  it('ignore la casse, les accents et les espaces en trop', () => {
    expect(ficheDuTerrain(m({ lieuFinal: REEL.n.toUpperCase() }))?.n).toBe(REEL.n);
    expect(ficheDuTerrain(m({ lieuFinal: `  ${REEL.n}  ` }))?.n).toBe(REEL.n);
    expect(ficheDuTerrain(m({ lieuFinal: 'LE FIVE PARIS 13' }))?.n ?? '').toMatch(/Five Paris 13/i);
  });

  // Un mauvais terrain est pire qu'aucun : il envoie quelqu'un ailleurs.
  it('rend null plutôt que le premier venu', () => {
    expect(ficheDuTerrain(m({ lieuFinal: 'Terrain inconnu de Zanzibar' }))).toBeNull();
    expect(ficheDuTerrain(m())).toBeNull();
    expect(ficheDuTerrain(m({ lieuFinal: 'Five' }))).toBeNull();
  });
});

describe('formatDuMatch', () => {
  it('nomme le format quand l’effectif se partage en deux', () => {
    expect(formatDuMatch(m({ joueursMax: 10 }))).toBe('5v5');
    expect(formatDuMatch(m({ joueursMax: 12 }))).toBe('6v6');
  });

  // Un effectif impair ne se partage pas en deux camps égaux : annoncer
  // « 5.5v5.5 » serait faux, et « 5v5 » enlèverait un joueur.
  it('ne ment pas sur un effectif impair', () => {
    expect(formatDuMatch(m({ joueursMax: 11 }))).toBe('11 joueurs');
  });
});

describe('ambianceDuTerrain', () => {
  it('suit le type du terrain, et retombe sur l’indoor', () => {
    expect(ambianceDuTerrain({ ...REEL, t: 'urbain' })).toBe('urbain');
    expect(ambianceDuTerrain({ ...REEL, t: 'plein-air' })).toBe('plein-air');
    expect(ambianceDuTerrain({ ...REEL, t: 'indoor' })).toBe('indoor');
    expect(ambianceDuTerrain(null)).toBe('indoor');
  });
});

describe('detailsDuLieu', () => {
  /**
   * LE POINT DE CE FICHIER. La maquette liste chasubles fournies, vestiaires
   * et parking gratuit. Aucun de ces champs n'existe. Un joueur qui arrive
   * sans chasuble parce que l'app en promettait, c'est la règle 1 du produit
   * retournée contre lui.
   */
  it('n’annonce aucun équipement que la fiche ne porte pas', () => {
    const textes = detailsDuLieu(m({ lieuFinal: REEL.n }), ficheDuTerrain(m({ lieuFinal: REEL.n })))
      .map((d) => d.texte.toLowerCase())
      .join(' ');
    for (const invente of ['chasuble', 'vestiaire', 'douche', 'parking']) {
      expect(textes, `« ${invente} » n'est dans aucun champ`).not.toContain(invente);
    }
  });

  it('donne le format même sans fiche connue', () => {
    const d = detailsDuLieu(m({ lieuFinal: 'Inconnu' }), null);
    expect(d).toHaveLength(1);
    expect(d[0].texte).toContain('5v5');
  });

  it('porte l’adresse et la source quand la fiche existe', () => {
    const f = ficheDuTerrain(m({ lieuFinal: REEL.n }));
    const d = detailsDuLieu(m({ lieuFinal: REEL.n }), f);
    expect(d.some((x) => x.texte === REEL.adr)).toBe(true);
    expect(d.some((x) => x.url === REEL.url)).toBe(true);
  });
});
