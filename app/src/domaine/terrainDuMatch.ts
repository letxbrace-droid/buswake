import { TERRAINS_VERIFIES, type TerrainVerifie } from './terrains';
import { maxJoueurs } from './match';
import { libelleDuree } from './assistant';
import type { Match } from './schemas';

/**
 * CE QU'ON SAIT DU LIEU D'UN MATCH — et rien de plus.
 *
 * La maquette liste quatre équipements : terrain couvert, chasubles
 * fournies, vestiaires/douches, parking gratuit. UN SEUL est dans les
 * données (`t: 'indoor'`). Les trois autres seraient inventés, et un joueur
 * qui arrive sans chasuble parce que l'app en promettait est exactement le
 * genre de promesse que la règle 1 du produit interdit.
 *
 * On montre donc ce que la fiche porte, dont sa SOURCE : `url` n'est pas
 * décoratif, c'est ce qui permet à quelqu'un de contrôler l'entrée. Dix-sept
 * lieux ont été écartés du lot d'origine faute de source, parce qu'un terrain
 * inventé envoie un joueur nulle part un jeudi soir.
 */

/** Le lieu d'un match, quel que soit son stade : confirmé ou en vote. */
export function nomDuLieu(m: Match): string {
  return m.lieuFinal || (m.creneauxProposes ?? []).find((c) => c.lieu)?.lieu || '';
}

/**
 * Retrouve la fiche du terrain à partir du nom stocké sur le match.
 *
 * Comparaison insensible à la casse et aux accents : le nom vient d'une
 * saisie ou d'une API tierce, et « LE FIVE Massy » ne doit pas rater
 * « Le Five Massy ». Rend `null` plutôt que le premier venu — un mauvais
 * terrain est pire qu'aucun.
 */
const norme = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function ficheDuTerrain(m: Match): TerrainVerifie | null {
  const nom = norme(nomDuLieu(m));
  if (!nom) return null;
  return TERRAINS_VERIFIES.find((t) => norme(t.n) === nom) ?? null;
}

/**
 * L'ambiance à montrer, choisie sur le TYPE de terrain.
 *
 * Rend une CLÉ, pas un chemin : c'est le composant qui tient les imports.
 * Un chemin écrit en dur (`'./terrain-indoor.jpg'`) ne passe pas par Vite —
 * il n'est ni empreinté, ni résolu depuis `src/`, et l'image ne charge pas.
 * Vu à l'écran avant d'être corrigé.
 *
 * Il n'existe pas de photo par lieu : en afficher une prise ailleurs ferait
 * croire à une vue du terrain réel. Ce sont des ambiances, pas des
 * reportages.
 */
export type Ambiance = 'indoor' | 'urbain' | 'plein-air';

export function ambianceDuTerrain(fiche: TerrainVerifie | null): Ambiance {
  return fiche?.t ?? 'indoor';
}

/** « 5v5 », « 6v6 »… Un effectif impair ne se partage pas en deux camps
 *  égaux : on dit alors le nombre de joueurs, sans mentir sur le format. */
export function formatDuMatch(m: Match): string {
  const n = maxJoueurs(m);
  return n % 2 === 0 ? `${n / 2}v${n / 2}` : `${n} joueurs`;
}

export interface Detail {
  readonly icone: 'toit' | 'carte' | 'verifie' | 'ballon';
  readonly texte: string;
  readonly url?: string;
}

/**
 * La liste « Détails ».
 *
 * Chaque ligne sort d'un champ réel. Ce qui manque ne s'invente pas : si
 * un jour on veut annoncer les chasubles ou les vestiaires, il faudra les
 * relever lieu par lieu et les mettre dans la fiche — pas les supposer.
 */
export function detailsDuLieu(m: Match, fiche: TerrainVerifie | null): Detail[] {
  const lignes: Detail[] = [
    { icone: 'ballon', texte: `${formatDuMatch(m)} · ${libelleDuree(m.duree)} de jeu` },
  ];
  if (!fiche) return lignes;

  lignes.push({
    icone: 'toit',
    texte: fiche.t === 'indoor' ? 'Terrain couvert' : fiche.t === 'urbain' ? 'Terrain urbain' : 'Plein air',
  });
  lignes.push({ icone: 'carte', texte: fiche.adr });
  lignes.push({ icone: 'verifie', texte: 'Lieu vérifié — voir la source', url: fiche.url });
  return lignes;
}
