/** RELATIONS ENTRE JOUEURS.
 *
 *  Trois tableaux sur le document utilisateur : `friends`,
 *  `friendRequestsSent`, `friendRequestsReceived`. Les règles Firestore
 *  n'autorisent un client à toucher QUE ces trois champs chez quelqu'un
 *  d'autre — c'est ce qui permet d'écrire dans le document d'un tiers sans
 *  lui ouvrir l'accès à son XP.
 */

export interface RelationsJoueur {
  readonly friends?: readonly string[];
  readonly friendRequestsSent?: readonly string[];
  readonly friendRequestsReceived?: readonly string[];
}

export type Lien = 'moi' | 'ami' | 'demande-envoyee' | 'demande-recue' | 'inconnu';

export function lienAvec(moi: RelationsJoueur, monUid: string, autreUid: string): Lien {
  if (monUid === autreUid) return 'moi';
  if (moi.friends?.includes(autreUid)) return 'ami';
  if (moi.friendRequestsSent?.includes(autreUid)) return 'demande-envoyee';
  if (moi.friendRequestsReceived?.includes(autreUid)) return 'demande-recue';
  return 'inconnu';
}

/** Ce qu'on propose de faire, selon le lien. Une demande envoyée ne se
 *  renvoie pas — bombarder quelqu'un de demandes n'est pas une fonctionnalité. */
export function actionPossible(lien: Lien): 'ajouter' | 'accepter' | 'retirer' | 'aucune' {
  if (lien === 'inconnu') return 'ajouter';
  if (lien === 'demande-recue') return 'accepter';
  if (lien === 'ami') return 'retirer';
  return 'aucune';
}

// ===== NOTATION ENTRE JOUEURS =====

export const NOTE_MIN = 1;
export const NOTE_MAX = 5;

export type Notes = Record<string, number>;

/** On ne se note pas soi-même. C'est la seule façon d'empêcher quelqu'un de
 *  faire monter sa propre moyenne, et c'est aussi la seule qui se vérifie
 *  sans rien connaître du reste. */
export function joueursANoter(inscrits: readonly string[], monUid: string): string[] {
  return inscrits.filter((u) => u !== monUid);
}

export interface ValidationNotes {
  readonly ok: boolean;
  readonly manque: number;
}

/** Toutes les notes, ou aucune. Une notation partielle avantage qui note peu :
 *  ne noter que ses amis fausse la moyenne de tout le monde. */
export function validerNotes(aNoter: readonly string[], notes: Notes): ValidationNotes {
  const donnees = aNoter.filter((u) => {
    const n = notes[u];
    return Number.isInteger(n) && n >= NOTE_MIN && n <= NOTE_MAX;
  });
  return { ok: donnees.length === aNoter.length, manque: aNoter.length - donnees.length };
}

export function aDejaNote(ratings: Record<string, Notes> | undefined, monUid: string): boolean {
  return !!ratings?.[monUid];
}

// ===== VOTE HOMME DU MATCH =====

export type VotesMotm = Record<string, string[]>;

export function monVoteMotm(votes: VotesMotm, monUid: string): string | null {
  return Object.keys(votes).find((cible) => votes[cible]?.includes(monUid)) ?? null;
}

/** UNE voix par votant. On retire le vote précédent avant d'ajouter le
 *  nouveau — sans ça, changer d'avis laisse les deux voix en place et le
 *  votant compte double. Voter à nouveau pour la même personne retire le
 *  vote : c'est un interrupteur, comme le vote de créneau. */
export function basculerVoteMotm(votes: VotesMotm, cible: string, monUid: string): VotesMotm {
  const actuel = monVoteMotm(votes, monUid);
  const sansMoi: VotesMotm = Object.fromEntries(
    Object.entries(votes).map(([k, v]) => [k, v.filter((x) => x !== monUid)]),
  );
  if (actuel === cible) return sansMoi;
  return { ...sansMoi, [cible]: [...(sansMoi[cible] ?? []), monUid] };
}

export function compterVotesMotm(votes: VotesMotm): { uid: string; voix: number }[] {
  return Object.entries(votes)
    .map(([uid, v]) => ({ uid, voix: v.length }))
    .filter((x) => x.voix > 0)
    .sort((a, b) => b.voix - a.voix || a.uid.localeCompare(b.uid));
}

/** Le vainqueur, SEULEMENT s'il est seul en tête. Une égalité n'a pas de
 *  vainqueur : désigner le premier par ordre alphabétique donnerait 15 XP
 *  sur un tirage déguisé en résultat. */
export function vainqueurMotm(votes: VotesMotm): string | null {
  const c = compterVotesMotm(votes);
  if (!c.length) return null;
  if (c.length > 1 && c[1].voix === c[0].voix) return null;
  return c[0].uid;
}
