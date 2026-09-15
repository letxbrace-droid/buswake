import { Plaque } from './Plaque';
import type { Match } from '../domaine/schemas';
import { maxJoueurs, versDate } from '../domaine/match';
import { libelleDistance } from '../domaine/rayon';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function libelle(d: Date): string {
  const h = d.getHours();
  const min = d.getMinutes();
  return `${JOURS[d.getDay()]} ${d.getDate()} · ${h}h${min ? String(min).padStart(2, '0') : ''}`;
}

/** Quand joue-t-on ?
 *  Un match confirmé a sa date. Un match à caler n'en a pas encore — mais il
 *  a des créneaux PROPOSÉS, et c'est le plus proche qui intéresse le joueur.
 *  Afficher « créneau en cours de vote » en titre géant occupait la place la
 *  plus visible de la carte pour ne rien dire : l'œil cherche une date. */
function quand(m: Match): { titre: string; sousTitre: string | null } {
  const finale = versDate(m.dateFinale);
  if (finale) return { titre: libelle(finale), sousTitre: null };

  const dates = (m.creneauxProposes ?? [])
    .map((c) => versDate(c.date))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return { titre: 'Créneau à proposer', sousTitre: null };

  return {
    titre: libelle(dates[0]),
    sousTitre:
      dates.length > 1 ? `ou ${dates.length - 1} autre${dates.length > 2 ? 's' : ''} créneau${dates.length > 2 ? 'x' : ''}` : null,
  };
}

function ou(m: Match): string {
  return m.lieuFinal || (m.creneauxProposes ?? []).find((c) => c.lieu)?.lieu || 'Lieu à définir';
}

export function CarteMatch({
  m,
  distanceKm,
  horsRayon = false,
  onOuvrir,
}: {
  m: Match;
  distanceKm: number | null;
  /** Affiché quand le match dépasse le rayon mais reste montré parce qu'on y
   *  joue — sinon le filtre a l'air cassé. */
  horsRayon?: boolean;
  onOuvrir?: () => void;
}) {
  const inscrits = (m.joueursInscrits ?? []).length;
  const total = maxJoueurs(m);
  const manque = Math.max(0, total - inscrits);
  const d = libelleDistance(distanceKm);
  const q = quand(m);

  return (
    <Plaque action as="button" onClick={onOuvrir} className="w-full p-4 text-left">
      <p className="text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
        {m.statut === 'sondage' ? 'À caler' : m.statut === 'terminé' ? 'Joué' : 'Confirmé'}
      </p>

      <p className="mt-1.5 font-[family-name:var(--font-titre)] text-2xl">{q.titre}</p>
      {q.sousTitre && (
        <p className="text-xs text-(--color-encre-faible)">{q.sousTitre}</p>
      )}

      <p className="mt-1 text-sm text-(--color-encre-sec)">
        {ou(m)}
        {d && ` · ${d}`}
        {horsRayon && <span className="text-(--color-encre-faible)"> · tu y joues</span>}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-(--radius-pill) bg-white/10">
          <div
            className="h-full rounded-(--radius-pill) bg-(--color-vert) transition-[width] duration-(--duration-recompense) ease-(--ease-kolektif)"
            style={{ width: `${Math.min(100, (inscrits / total) * 100)}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-(--color-encre-sec)">
          {inscrits}/{total}
        </span>
      </div>

      {m.statut !== 'terminé' && manque > 0 && (
        <p className="mt-2 text-xs text-(--color-feu)">
          {manque === 1 ? 'Il manque 1 joueur' : `Il manque ${manque} joueurs`}
        </p>
      )}
    </Plaque>
  );
}
