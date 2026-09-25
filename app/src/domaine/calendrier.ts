/**
 * LE CALENDRIER — choisir sa date, pas en cocher une.
 *
 * L'étape 1 proposait cinq créneaux calculés (« vendredi 19h, samedi 14h… »).
 * C'était un raccourci pour les cas courants, mais ça n'est pas choisir :
 * quelqu'un qui joue le mardi à 21 h n'avait aucun moyen de le dire.
 *
 * CE QUI NE CHANGE PAS : on propose PLUSIEURS créneaux et le vote tranche.
 * Le calendrier sert à les composer soi-même, pas à en choisir un seul.
 *
 * Toute la logique de grille est ici, en fonctions pures : un calendrier se
 * trompe sur les mois à 31 jours, les débuts de semaine et les changements
 * d'heure, et aucune de ces erreurs ne se voit sur une capture d'écran.
 */

export const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const;

/** Horizon de proposition. Au-delà de trois mois, un match à cinq ne se cale
 *  plus : il se souhaite. Le borner évite aussi une grille infinie. */
export const HORIZON_JOURS = 92;

export interface Jour {
  readonly date: Date;
  /** Du mois affiché, ou débordement d'un mois voisin — ceux-là se grisent
   *  plutôt que de disparaître : une grille à trous se lit mal. */
  readonly duMois: boolean;
  readonly choisissable: boolean;
  readonly aujourdhui: boolean;
}

const jourNu = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const memeJour = (a: Date, b: Date) => jourNu(a).getTime() === jourNu(b).getTime();

/**
 * La grille d'un mois : six semaines de sept jours, toujours.
 *
 * Six et pas « autant qu'il en faut » : une grille dont la hauteur change
 * d'un mois à l'autre fait sauter tout ce qui est en dessous quand on
 * navigue. C'est le genre de détail qu'on ne remarque qu'en l'utilisant.
 *
 * La semaine commence LUNDI. `getDay()` rend 0 pour dimanche : le décalage
 * est la faute classique de tout calendrier écrit à la main.
 */
export function grilleDuMois(
  mois: Date,
  maintenant: Date = new Date(),
): Jour[][] {
  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
  const decalage = (premier.getDay() + 6) % 7; // lundi = 0
  const debut = new Date(premier);
  debut.setDate(premier.getDate() - decalage);

  const min = jourNu(maintenant);
  const max = jourNu(new Date(min.getTime() + HORIZON_JOURS * 86400_000));

  const semaines: Jour[][] = [];
  for (let s = 0; s < 6; s++) {
    const semaine: Jour[] = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + s * 7 + j);
      semaine.push({
        date: d,
        duMois: d.getMonth() === mois.getMonth(),
        choisissable: d.getTime() >= min.getTime() && d.getTime() <= max.getTime(),
        aujourdhui: memeJour(d, maintenant),
      });
    }
    semaines.push(semaine);
  }
  return semaines;
}

export function moisSuivant(m: Date): Date {
  return new Date(m.getFullYear(), m.getMonth() + 1, 1);
}

export function moisPrecedent(m: Date): Date {
  return new Date(m.getFullYear(), m.getMonth() - 1, 1);
}

/** Peut-on reculer ? Pas avant le mois courant : il n'y a rien à y proposer. */
export function peutReculer(mois: Date, maintenant: Date = new Date()): boolean {
  return (
    mois.getFullYear() > maintenant.getFullYear() ||
    (mois.getFullYear() === maintenant.getFullYear() && mois.getMonth() > maintenant.getMonth())
  );
}

export function peutAvancer(mois: Date, maintenant: Date = new Date()): boolean {
  const limite = new Date(maintenant.getTime() + HORIZON_JOURS * 86400_000);
  return (
    mois.getFullYear() < limite.getFullYear() ||
    (mois.getFullYear() === limite.getFullYear() && mois.getMonth() < limite.getMonth())
  );
}

export function libelleMois(m: Date): string {
  return `${MOIS[m.getMonth()]} ${m.getFullYear()}`;
}

/** Assemble une date et une heure « HH:MM ». Rend `null` si l'heure est
 *  illisible — un champ vide donnait `NaN`, et `NaN` partait dans le créneau. */
export function composer(jour: Date, heure: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((heure ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), h, min, 0, 0);
}

export const CRENEAUX_MAX = 10;

export type Ajout =
  | { ok: true; creneaux: Date[] }
  | { ok: false; probleme: string };

/**
 * Ajoute un créneau à la liste.
 *
 * Trois refus, tous rencontrables un jeudi soir :
 *  — une date passée : proposer hier n'a pas de sens, et le match
 *    n'apparaîtrait dans aucune requête bornée par `finVisible` ;
 *  — un doublon : deux fois le même créneau couperait le vote en deux ;
 *  — au-delà de dix : c'est la borne des règles Firestore, et la dire ici
 *    évite un refus opaque après l'envoi.
 */
export function ajouterCreneau(
  creneaux: readonly Date[],
  quand: Date | null,
  maintenant: Date = new Date(),
): Ajout {
  if (!quand || !Number.isFinite(quand.getTime())) {
    return { ok: false, probleme: 'Choisis une date et une heure.' };
  }
  if (quand.getTime() <= maintenant.getTime()) {
    return { ok: false, probleme: 'Ce créneau est déjà passé.' };
  }
  if (creneaux.some((c) => c.getTime() === quand.getTime())) {
    return { ok: false, probleme: 'Ce créneau est déjà proposé.' };
  }
  if (creneaux.length >= CRENEAUX_MAX) {
    return { ok: false, probleme: `${CRENEAUX_MAX} créneaux au maximum.` };
  }
  return { ok: true, creneaux: [...creneaux, quand].sort((a, b) => a.getTime() - b.getTime()) };
}

export function retirerCreneau(creneaux: readonly Date[], quand: Date): Date[] {
  return creneaux.filter((c) => c.getTime() !== quand.getTime());
}

const JOURS_LONGS = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
] as const;

export function libelleCreneau(d: Date): string {
  const min = d.getMinutes();
  return `${JOURS_LONGS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()].slice(0, 4)}. · ${d.getHours()}h${
    min ? String(min).padStart(2, '0') : ''
  }`;
}
