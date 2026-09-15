import type { Match } from './schemas';
import { maxJoueurs } from './match';
import { dansLeRayon, type Position } from './rayon';

export type Onglet = 'sondage' | 'confirme' | 'termine';

export interface Fil {
  readonly sondage: Match[];
  readonly confirme: Match[];
  readonly termine: Match[];
}

export interface Compteurs {
  readonly sondage: number;
  readonly confirme: number;
  readonly termine: number;
  /** Places réellement à prendre sur les matchs confirmés DU FIL. */
  readonly places: number;
}

export interface ContexteFil {
  readonly uid: string | null;
  readonly km: number;
  readonly domicile: Position | null;
}

/**
 * Range les matchs bruts en trois piles, en n'y laissant QUE ce que la liste
 * saura montrer.
 *
 * C'est le point qui a abîmé la confiance en v1 : chaque compteur d'onglet
 * comptait tous les matchs d'un statut dans la base entière — sans borne de
 * date, de visibilité ni de rayon. On lisait « À caler 2 » au-dessus d'une
 * liste vide, parce que les deux matchs comptés étaient hors rayon, expirés,
 * ou privés chez quelqu'un d'autre.
 *
 * Un compteur affiché est une promesse. Ici, compteurs et liste sortent de
 * la MÊME fonction : ils ne peuvent plus diverger.
 */
export function rangerFil(matchs: readonly Match[], ctx: ContexteFil): Fil {
  const visible = matchs.filter((m) => dansLeRayon(m, ctx.uid, ctx.km, ctx.domicile));
  return {
    sondage: visible.filter((m) => m.statut === 'sondage'),
    confirme: visible.filter((m) => m.statut === 'confirmé'),
    // L'historique ne se filtre pas par rayon : un match joué reste à soi,
    // où qu'il ait eu lieu.
    termine: matchs.filter((m) => m.statut === 'terminé'),
  };
}

export function compter(fil: Fil): Compteurs {
  return {
    sondage: fil.sondage.length,
    confirme: fil.confirme.length,
    termine: fil.termine.length,
    places: fil.confirme.reduce(
      (n, m) => n + Math.max(0, maxJoueurs(m) - (m.joueursInscrits ?? []).length),
      0,
    ),
  };
}

export function matchsDeLOnglet(fil: Fil, onglet: Onglet): Match[] {
  return onglet === 'sondage' ? fil.sondage : onglet === 'confirme' ? fil.confirme : fil.termine;
}
