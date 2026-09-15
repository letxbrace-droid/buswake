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

/** Un message vide ou fait d'espaces n'en est pas un, et un message de trois
 *  cents caractères tient déjà un paragraphe. */
export function messageValide(texte: string): boolean {
  const t = texte.trim();
  return t.length > 0 && t.length <= MESSAGE_MAX;
}
