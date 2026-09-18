import { VISIBLE_APRES_MS } from './cycle';
import { versDate } from './match';
import type { Match } from './schemas';

/** CHAT ÉPHÉMÈRE.
 *
 *  Il ferme 24 h après le coup d'envoi — la même borne que `finVisible`, et
 *  c'est voulu : un fil qui survit au match devient un groupe de discussion
 *  que personne n'a demandé, et que personne ne quitte. Le chat sert à caler
 *  un match, pas à durer.
 */
export const MESSAGE_MAX = 300;

export function heureDuMatch(m: Match): Date | null {
  return (
    versDate(m.dateFinale) ??
    versDate((m.creneauxProposes ?? []).find((c) => c.date)?.date) ??
    null
  );
}

export function chatOuvert(m: Match, maintenant: Date = new Date()): boolean {
  const debut = heureDuMatch(m);
  // Pas d'heure connue : le match se cale encore, donc le chat sert.
  if (!debut) return true;
  return maintenant.getTime() <= debut.getTime() + VISIBLE_APRES_MS;
}

export interface Message {
  readonly id: string;
  readonly auteur: string;
  readonly texte: string;
  readonly quand: Date | null;
}

/** Combien de messages on garde à l'écran — et donc combien on lit.
 *
 *  Le chat ferme 24 h après le coup d'envoi : cent messages couvrent
 *  largement la vie d'un fil qui sert à caler un match. */
export const MESSAGES_GARDES = 100;

/** Une ligne brute du fil, telle que la couche service la sort de Firestore. */
export interface LigneBrute {
  readonly id: string;
  readonly uid?: unknown;
  readonly text?: unknown;
  readonly createdAt?: unknown;
}

/**
 * Remet en ordre de lecture ce que Firestore rend en ordre de REQUÊTE.
 *
 * La requête trie du plus récent au plus ancien — c'est la seule façon qu'un
 * `limit` garde les messages récents. Triée à l'endroit, la même limite
 * garderait les cent PREMIERS : le chat se figerait sur le début de la
 * conversation, et un nouveau message n'apparaîtrait jamais. Le défaut serait
 * invisible tant qu'un fil reste court.
 *
 * On rend donc la liste du plus ancien au plus récent, ici, côté client.
 */
export function rangerMessages(lignes: readonly LigneBrute[]): Message[] {
  return lignes
    .map((l) => ({
      id: l.id,
      auteur: String(l.uid ?? ''),
      texte: String(l.text ?? ''),
      quand: versDate(l.createdAt),
    }))
    .reverse();
}

/** Un message vide ou fait d'espaces n'en est pas un, et un message de trois
 *  cents caractères tient déjà un paragraphe. */
export function messageValide(texte: string): boolean {
  const t = texte.trim();
  return t.length > 0 && t.length <= MESSAGE_MAX;
}
