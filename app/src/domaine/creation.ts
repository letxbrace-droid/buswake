import { TERRAINS_VERIFIES, type TerrainVerifie } from './terrains';
import { haversine, type Position } from './rayon';

/** CRÉATION D'UN MATCH — ZÉRO SAISIE.
 *
 *  Personne ne tape une date au clavier sur un téléphone, debout, entre deux
 *  choses. On propose les créneaux où le foot à 5 se joue vraiment, et les
 *  terrains les plus proches : il ne reste qu'à cocher.
 *
 *  Le créateur peut en proposer PLUSIEURS — c'est tout l'intérêt du sondage.
 *  Fixer une seule date, c'est décider pour dix personnes.
 */

export interface CreneauSuggere {
  readonly date: Date;
  readonly libelle: string;
}

/** Les horaires où ça se joue : vendredi soir d'abord, puis mercredi,
 *  samedi après-midi, dimanche matin. Ce ne sont pas des heures au hasard —
 *  ce sont celles où les salles sont ouvertes et les gens disponibles. */
const HORAIRES: readonly [jour: number, heure: number, minute: number][] = [
  [5, 19, 0],
  [5, 20, 30],
  [3, 19, 0],
  [6, 14, 0],
  [0, 10, 0],
];

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function prochainJour(depuis: Date, jour: number, h: number, m: number): Date {
  const d = new Date(depuis);
  d.setHours(h, m, 0, 0);
  let ecart = (jour - d.getDay() + 7) % 7;
  // Aujourd'hui mais déjà passé : on vise la semaine suivante. Proposer un
  // créneau révolu fait perdre un aller-retour à tout le monde.
  if (ecart === 0 && d <= depuis) ecart = 7;
  d.setDate(d.getDate() + ecart);
  return d;
}

export function creneauxSuggeres(maintenant: Date = new Date()): CreneauSuggere[] {
  return HORAIRES.map(([jour, h, m]) => {
    const date = prochainJour(maintenant, jour, h, m);
    return {
      date,
      libelle: `${JOURS[date.getDay()]} ${date.getDate()} · ${h}h${m ? String(m).padStart(2, '0') : ''}`,
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Les terrains proposés : les plus proches d'abord. Sans domicile connu, on
 *  garde l'ordre de la source plutôt que d'inventer un classement. */
export function terrainsProches(
  domicile: Position | null,
  combien = 3,
): { terrain: TerrainVerifie; km: number | null }[] {
  const avec = TERRAINS_VERIFIES.map((terrain) => ({
    terrain,
    km: domicile ? haversine(domicile, { lat: terrain.lat, lon: terrain.lon }) : null,
  }));
  if (domicile) avec.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  return avec.slice(0, combien);
}

export interface EtatCreation {
  readonly pret: boolean;
  readonly manque: string | null;
}

/** Ce qu'il manque pour pouvoir créer, dit en clair. Un bouton grisé sans
 *  explication laisse croire que l'app est cassée. */
export function etatCreation(lieu: string | null, creneaux: readonly unknown[]): EtatCreation {
  if (!lieu) return { pret: false, manque: 'Choisis un terrain' };
  if (creneaux.length === 0) return { pret: false, manque: 'Coche au moins un créneau' };
  if (creneaux.length > 10) return { pret: false, manque: 'Dix créneaux au maximum' };
  return { pret: true, manque: null };
}
