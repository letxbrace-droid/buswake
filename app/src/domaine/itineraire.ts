import type { Position } from './rayon';

/** Y ALLER.
 *
 *  Un joueur qui ouvre un itinéraire doit arriver AU TERRAIN, pas dans le
 *  quartier. D'où la distinction centrale de ce module : une destination est
 *  soit EXACTE (une adresse avec un numéro de rue, que le GPS sait résoudre
 *  au mètre), soit APPROXIMATIVE (des coordonnées, ou pire un nom de ville).
 *  Et quand elle est approximative, on le DIT — un joueur qui se croit guidé
 *  au bon endroit et se retrouve à 800 m ne revient pas.
 */

export interface Lieu extends Partial<Position> {
  readonly n: string;
  readonly adr?: string;
  readonly v?: string;
  readonly cp?: string;
}

/** Une adresse n'en est une que si elle porte un NUMÉRO DE RUE.
 *  « Palaiseau » tout seul était traité comme une adresse en v1 : le GPS
 *  visait le centre-ville, et la mention « position approximative »
 *  disparaissait parce qu'on croyait avoir une adresse. */
export function estAdresseUtilisable(adr?: string): boolean {
  if (!adr) return false;
  const premier = adr.split(',')[0] ?? '';
  return /\d/.test(premier) && premier.trim().length > 4;
}

export interface Destination {
  /** Ce qu'on envoie au GPS comme requête textuelle. */
  readonly q: string;
  /** Coordonnées, quand on n'a pas mieux qu'elles. */
  readonly ll: Position | null;
  /** Vrai seulement si le GPS visera la porte et pas le quartier. */
  readonly exact: boolean;
}

export function destinationItineraire(l: Lieu): Destination {
  if (estAdresseUtilisable(l.adr)) {
    return { q: l.adr!, ll: coords(l), exact: true };
  }
  const ll = coords(l);
  if (ll) {
    // Des coordonnées valent mieux qu'un nom : elles pointent le terrain même
    // si l'adresse manque. Mais ce n'est pas une adresse, donc pas « exact ».
    return { q: [l.n, l.v, l.cp].filter(Boolean).join(', '), ll, exact: false };
  }
  return { q: [l.n, l.v, l.cp].filter(Boolean).join(', '), ll: null, exact: false };
}

function coords(l: Lieu): Position | null {
  return typeof l.lat === 'number' && typeof l.lon === 'number'
    ? { lat: l.lat, lon: l.lon }
    : null;
}

export type Appli = 'waze' | 'google' | 'apple';

export const APPLIS: readonly { id: Appli; label: string }[] = [
  { id: 'waze', label: 'Waze' },
  { id: 'google', label: 'Google Maps' },
  { id: 'apple', label: 'Plans' },
] as const;

/** Le lien d'itinéraire.
 *
 *  On privilégie les COORDONNÉES quand on les a, même avec une adresse
 *  exacte : c'est la seule forme qu'aucune application n'interprète de
 *  travers. Une recherche textuelle peut tomber sur un homonyme — il y a
 *  plusieurs « Le Five » en Île-de-France. */
export function lienItineraire(l: Lieu, appli: Appli): string {
  const d = destinationItineraire(l);

  if (appli === 'waze') {
    return d.ll
      ? `https://waze.com/ul?ll=${d.ll.lat},${d.ll.lon}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(d.q)}&navigate=yes`;
  }

  if (appli === 'apple') {
    return d.ll
      ? `https://maps.apple.com/?daddr=${d.ll.lat},${d.ll.lon}&dirflg=d`
      : `https://maps.apple.com/?daddr=${encodeURIComponent(d.q)}&dirflg=d`;
  }

  return d.ll
    ? `https://www.google.com/maps/dir/?api=1&destination=${d.ll.lat},${d.ll.lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.q)}`;
}

/** Ce qu'on affiche sous le nom du lieu. Une adresse exacte se montre en
 *  entier : c'est elle que le joueur recopie, lit à voix haute au téléphone,
 *  ou compare à ce qu'il voit dans la rue. */
export function libelleAdresse(l: Lieu): { texte: string; approximatif: boolean } {
  if (estAdresseUtilisable(l.adr)) return { texte: l.adr!, approximatif: false };
  const approx = [l.v, l.cp].filter(Boolean).join(' ');
  return {
    texte: approx || 'Adresse non renseignée',
    approximatif: true,
  };
}
