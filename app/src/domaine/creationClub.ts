import { COULEURS_EQUIPE, EMBLEMES, NIVEAUX, type CouleurEquipe, type Equipe, type Niveau } from './equipe';
import { monClub } from './club';

/** CRÉER UN CLUB.
 *
 *  Le bouton « Créer une équipe » existait sur deux écrans et ne menait
 *  nulle part : l'un renvoyait vers la liste, l'autre n'était relié à rien.
 *  On tournait en rond. Ce module porte la règle ; l'écran ne fait qu'afficher.
 *
 *  Chaque borne ici est CELLE des règles Firestore (`equipeValide()`) : un
 *  nom de 2 à 28 caractères, une couleur et un emblème pris dans une liste
 *  fermée, un appel de 120 caractères au plus. Une borne plus large ici
 *  qu'en base donnerait un « permission denied » opaque après l'envoi. */

export const NOM_CLUB_MIN = 2;
export const NOM_CLUB_MAX = 28;
export const APPEL_MAX = 120;
export const DESCRIPTION_MAX = 160;
/** `membres.size() <= 20` dans les règles. */
export const MEMBRES_MAX = 20;

export const NOMS_EMBLEMES = Object.keys(EMBLEMES);

export interface SaisieClub {
  readonly nom: string;
  readonly couleur: CouleurEquipe;
  readonly embleme: string;
  readonly niveau: Niveau;
  readonly appel: string;
}

export const CLUB_VIDE: SaisieClub = {
  nom: '',
  couleur: COULEURS_EQUIPE[0],
  embleme: NOMS_EMBLEMES[0],
  niveau: 'intermediaire',
  appel: '',
};

/** Ce qui empêche de créer le club — `null` s'il est prêt. */
export function problemeClub(s: SaisieClub): string | null {
  const nom = s.nom.trim();
  if (nom.length < NOM_CLUB_MIN) return 'Donne un nom à ton club';
  if (nom.length > NOM_CLUB_MAX) return `${NOM_CLUB_MAX} caractères au maximum pour le nom`;
  if (!(COULEURS_EQUIPE as readonly string[]).includes(s.couleur)) return 'Choisis une couleur';
  if (!NOMS_EMBLEMES.includes(s.embleme)) return 'Choisis un emblème';
  if (!(s.niveau in NIVEAUX)) return 'Choisis un niveau';
  if (s.appel.trim().length > APPEL_MAX) return `${APPEL_MAX} caractères au maximum pour l’appel`;
  return null;
}

/** Le document tel que les règles l'attendent. Le capitaine est membre
 *  d'office — la règle l'exige — et le palmarès naît à zéro : il n'est plus
 *  jamais écrit par un client ensuite. */
export function documentClub(s: SaisieClub, uid: string) {
  const appel = s.appel.trim().replace(/\s+/g, ' ');
  return {
    nom: s.nom.trim().replace(/\s+/g, ' '),
    capitaineUid: uid,
    sport: 'foot5',
    niveau: s.niveau,
    membres: [uid],
    couleur: s.couleur,
    embleme: s.embleme,
    appel: appel || null,
    stats: { victoires: 0, nuls: 0, defaites: 0, serie: 0, butsPour: 0, butsContre: 0 },
  };
}

export type Adhesion =
  | { readonly peut: true }
  | { readonly peut: false; readonly pourquoi: string; readonly club?: Equipe };

/** Un joueur, un club. `monClub` n'affiche que le premier trouvé : en avoir
 *  deux rendait le second invisible, avec son effectif et ses défis. On le
 *  dit avant, au lieu de le découvrir après. */
export function peutCreerUnClub(equipes: readonly Equipe[], uid: string | null): Adhesion {
  if (!uid) return { peut: false, pourquoi: 'Connecte-toi pour créer un club.' };
  const club = monClub(equipes, uid);
  if (club) return { peut: false, pourquoi: `Tu fais déjà partie de ${club.nom}.`, club };
  return { peut: true };
}

export function peutRejoindre(e: Equipe, equipes: readonly Equipe[], uid: string | null): Adhesion {
  if (!uid) return { peut: false, pourquoi: 'Connecte-toi pour rejoindre un club.' };
  if ((e.membres ?? []).includes(uid)) return { peut: false, pourquoi: 'C’est ton club.' };
  const club = monClub(equipes, uid);
  if (club) return { peut: false, pourquoi: `Tu fais déjà partie de ${club.nom}.`, club };
  if ((e.membres ?? []).length >= MEMBRES_MAX) return { peut: false, pourquoi: 'Ce club est complet.' };
  return { peut: true };
}
