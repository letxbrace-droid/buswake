import { chatOuvert } from './chat';
import { estTitulaire, versDate } from './match';
import type { Match } from './schemas';

/**
 * LA BOÎTE DE RÉCEPTION — ce qu'elle est, et ce qu'elle n'est pas.
 *
 * La maquette montre un onglet Messages avec des conversations. Il n'existe
 * pas de messagerie directe entre joueurs : le chat de KOLEKTIF est ATTACHÉ
 * À UN MATCH et il est éphémère — il ferme 24 h après le coup d'envoi, pour
 * qu'un fil ne devienne pas un groupe que personne ne quitte.
 *
 * Cet écran liste donc les fils de MES matchs. C'est honnête et c'est
 * buildable aujourd'hui ; une messagerie directe serait une autre
 * fonctionnalité, avec son propre modèle et ses propres règles.
 */
export interface Fil {
  readonly matchId: string;
  readonly titre: string;
  readonly quand: Date | null;
  readonly joueurs: number;
  readonly ouvert: boolean;
}

function titreDe(m: Match): string {
  return m.lieuFinal || (m.creneauxProposes ?? []).find((c) => c.lieu)?.lieu || 'Match';
}

function quandDe(m: Match): Date | null {
  return versDate(m.dateFinale) ?? versDate((m.creneauxProposes ?? []).find((c) => c.date)?.date) ?? null;
}

/**
 * Mes fils, du plus récent au plus ancien.
 *
 * Les fils OUVERTS d'abord : un fil fermé ne sert plus qu'à relire, et le
 * mettre au-dessus d'une conversation en cours ferait rater l'organisation
 * du match de ce soir.
 */
export function mesFils(
  matchs: readonly Match[],
  uid: string | null,
  maintenant: Date = new Date(),
): Fil[] {
  if (!uid) return [];
  return matchs
    .filter((m) => estTitulaire(m, uid))
    .map((m) => ({
      matchId: m.id,
      titre: titreDe(m),
      quand: quandDe(m),
      joueurs: (m.joueursInscrits ?? []).length,
      ouvert: chatOuvert(m, maintenant),
    }))
    .sort((a, b) => {
      if (a.ouvert !== b.ouvert) return a.ouvert ? -1 : 1;
      return (b.quand?.getTime() ?? 0) - (a.quand?.getTime() ?? 0);
    });
}
