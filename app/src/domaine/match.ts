import type { Match } from './schemas';

/** Effectif minimal pour confirmer un match. */
export const MIN_CONFIRM = 10;

export function maxJoueurs(m: Pick<Match, 'joueursMax'>): number {
  const n = m?.joueursMax;
  return typeof n === 'number' && n >= 2 && n <= 40 ? n : MIN_CONFIRM;
}

/** Les titulaires sont les N premiers inscrits ; au-delà, ce sont des
 *  remplaçants. L'ordre du tableau EST la file d'attente. */
export function titulaires(m: Match): string[] {
  return (m.joueursInscrits ?? []).slice(0, maxJoueurs(m));
}

export function estTitulaire(m: Match, uid: string): boolean {
  return titulaires(m).includes(uid);
}

/** Un match n'occupe son monde que tant qu'il est vivant. */
export function matchVivant(m: Match): boolean {
  return m.statut === 'sondage' || m.statut === 'confirmé';
}

export interface Eligibilite {
  readonly peut: boolean;
  /** Le match qui bloque, s'il y en a un. */
  readonly bloquePar?: { readonly id: string; readonly quand: string; readonly ou: string };
}

/**
 * Peut-on créer un match ?
 *
 * Fonction PURE : elle reçoit les matchs déjà chargés et ne connaît ni
 * Firestore ni React. C'est ce qui la rend testable — et c'est là que le bug
 * vécu en production se rejoue en une seconde plutôt qu'en ouvrant l'app.
 *
 * Trois bornes, et les trois manquaient en v1 :
 *
 *  1. `finVisible > maintenant`. Sans elle, un match d'il y a trois semaines
 *     resté en 'sondage' parce que personne ne l'a clos bloquait ses inscrits
 *     À VIE. C'était exactement le « tu joues déjà dans un match » alors que
 *     le joueur ne jouait nulle part.
 *  2. Seuls les TITULAIRES sont bloqués. Un remplaçant n'occupe pas de place.
 *  3. Seuls les matchs VIVANTS bloquent — ni terminés, ni annulés.
 *
 * L'appelant est responsable de ne passer que des matchs où `uid` figure
 * (requête bornée `joueursInscrits array-contains uid`) : lire la collection
 * entière ferait échouer la règle `allow list` dès qu'un match d'un tiers
 * existe, et le blocage dépendrait alors du contenu de la base.
 */
export function peutCreerUnMatch(
  uid: string,
  mesMatchs: readonly Match[],
  maintenant: Date = new Date(),
  formaterDate: (d: unknown) => string = () => '',
): Eligibilite {
  if (!uid) return { peut: false };

  for (const m of mesMatchs) {
    if (!matchVivant(m)) continue;
    if (!estEncoreVisible(m, maintenant)) continue;
    if (!estTitulaire(m, uid)) continue;

    // Dire LEQUEL. « Tu joues déjà quelque part » sans dire où laisse le
    // joueur devant une porte fermée sans poignée.
    return {
      peut: false,
      bloquePar: {
        id: m.id,
        quand: m.dateFinale
          ? formaterDate(m.dateFinale)
          : m.statut === 'sondage'
            ? 'créneau en cours de vote'
            : '',
        ou: m.lieuFinal || (m.creneauxProposes ?? []).find((c) => c.lieu)?.lieu || '',
      },
    };
  }

  return { peut: true };
}

function estEncoreVisible(m: Match, maintenant: Date): boolean {
  const f = versDate(m.finVisible);
  // Pas de finVisible = document ancien, antérieur au backfill. On le
  // considère expiré : un match sans horizon ne doit bloquer personne.
  return f !== null && f.getTime() > maintenant.getTime();
}

/** Firestore rend des Timestamp, les fixtures des Date, les vieux documents
 *  parfois des nombres. Un seul endroit sait les lire. */
export function versDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object' && 'seconds' in (v as object)) {
    return new Date((v as { seconds: number }).seconds * 1000);
  }
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
