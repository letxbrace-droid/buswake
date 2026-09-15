import type { Match } from './schemas';
import { maxJoueurs, versDate } from './match';

/** LE CYCLE DE VIE D'UN MATCH, en fonctions pures.
 *
 *  sondage → confirmé → terminé, avec annulé possible à tout moment.
 *
 *  Aucune de ces fonctions n'écrit : elles CALCULENT l'état d'arrivée, que la
 *  couche service envoie ensuite à Firestore. C'est ce qui permet de tester
 *  la promotion d'un remplaçant sans base de données — et cette règle-là est
 *  précisément celle qu'on ne veut pas découvrir cassée un jeudi soir.
 *
 *  RIEN ICI NE TOUCHE À L'XP. Le client n'en écrit jamais : les règles
 *  Firestore refusent les champs de jeu à tous les clients, et les Cloud
 *  Functions les attribuent depuis le document match. C'est ce qui ferme le
 *  trou où gagner puis annuler laissait l'XP acquise.
 */

export type Votes = Record<string, string[]>;

export function peutVoter(m: Pick<Match, 'statut'>): boolean {
  return m.statut === 'sondage';
}

/** Bascule le vote d'un joueur sur un créneau. Voter deux fois retire le
 *  vote : c'est un interrupteur, pas un compteur. */
export function basculerVote(votes: Votes, creneauId: string, uid: string): Votes {
  const actuels = votes[creneauId] ?? [];
  const dedans = actuels.includes(uid);
  return {
    ...votes,
    [creneauId]: dedans ? actuels.filter((x) => x !== uid) : [...actuels, uid],
  };
}

export function aVote(votes: Votes, creneauId: string, uid: string): boolean {
  return (votes[creneauId] ?? []).includes(uid);
}

/** Le créneau en tête. À égalité, le plus tôt gagne : entre deux dates aussi
 *  populaires, celle qui arrive la première laisse le moins de temps au match
 *  de se déliter. Null si personne n'a voté — on ne désigne pas un vainqueur
 *  par défaut. */
export function creneauGagnant(
  m: Pick<Match, 'creneauxProposes'>,
  votes: Votes,
): { index: number; voix: number } | null {
  const candidats = (m.creneauxProposes ?? [])
    .map((c, index) => ({
      index,
      voix: (votes[String(index)] ?? []).length,
      quand: versDate(c.date)?.getTime() ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((c) => c.voix > 0)
    .sort((a, b) => b.voix - a.voix || a.quand - b.quand);

  return candidats.length ? { index: candidats[0].index, voix: candidats[0].voix } : null;
}

export type Place = 'titulaire' | 'banc' | 'deja-titulaire' | 'deja-banc';

/** Où atterrit un joueur qui rejoint ? Le match plein ne refuse personne : il
 *  met sur le banc. Un « complet » sec fait partir le joueur pour de bon ;
 *  un banc le garde disponible quand quelqu'un se désiste. */
export function placeEnRejoignant(m: Match, uid: string): Place {
  const inscrits = m.joueursInscrits ?? [];
  const banc = (m as Match & { waitlist?: string[] }).waitlist ?? [];
  if (inscrits.includes(uid)) return 'deja-titulaire';
  if (banc.includes(uid)) return 'deja-banc';
  return inscrits.length >= maxJoueurs(m) ? 'banc' : 'titulaire';
}

export interface Effectif {
  readonly joueursInscrits: string[];
  readonly waitlist: string[];
  /** Le remplaçant qui vient d'entrer sur le terrain, s'il y en a un. */
  readonly promu: string | null;
}

export function rejoindre(m: Match, uid: string): Effectif {
  const inscrits = [...(m.joueursInscrits ?? [])];
  const banc = [...((m as Match & { waitlist?: string[] }).waitlist ?? [])];

  if (inscrits.includes(uid)) return { joueursInscrits: inscrits, waitlist: banc, promu: null };

  if (inscrits.length >= maxJoueurs(m)) {
    if (!banc.includes(uid)) banc.push(uid);
    return { joueursInscrits: inscrits, waitlist: banc, promu: null };
  }

  inscrits.push(uid);
  return { joueursInscrits: inscrits, waitlist: banc.filter((x) => x !== uid), promu: null };
}

/** Quitter. Un titulaire qui part laisse sa place au PREMIER du banc —
 *  l'ordre du banc est une file d'attente, pas un ensemble. Sans cette
 *  promotion, un match tombe à 9 alors que quelqu'un attendait d'entrer. */
export function quitter(m: Match, uid: string): Effectif {
  const inscrits = [...(m.joueursInscrits ?? [])];
  const banc = [...((m as Match & { waitlist?: string[] }).waitlist ?? [])];

  if (inscrits.includes(uid)) {
    const restants = inscrits.filter((x) => x !== uid);
    const promu = banc.length ? banc.shift()! : null;
    if (promu) restants.push(promu);
    return { joueursInscrits: restants, waitlist: banc, promu };
  }

  return { joueursInscrits: inscrits, waitlist: banc.filter((x) => x !== uid), promu: null };
}

export interface Confirmation {
  readonly peut: boolean;
  readonly inscrits: number;
  readonly requis: number;
  readonly manque: number;
}

/** On ne confirme pas un match incomplet. Confirmer, c'est dire aux dix
 *  personnes « c'est bon, viens » : le faire à huit, c'est promettre un match
 *  qui n'aura pas lieu. */
export function peutConfirmer(m: Match): Confirmation {
  const inscrits = (m.joueursInscrits ?? []).length;
  const requis = maxJoueurs(m);
  return { peut: inscrits >= requis, inscrits, requis, manque: Math.max(0, requis - inscrits) };
}

/** Le match reste visible 24 h après son coup d'envoi — le temps d'y saisir
 *  le score. Au-delà, il sort des listes et cesse de bloquer ses joueurs. */
export const VISIBLE_APRES_MS = 24 * 3600 * 1000;

export function finVisibleApres(debut: Date): Date {
  return new Date(debut.getTime() + VISIBLE_APRES_MS);
}
