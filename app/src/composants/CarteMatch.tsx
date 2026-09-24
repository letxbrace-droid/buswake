import { Plaque } from './Plaque';
import type { Match } from '../domaine/schemas';
import { maxJoueurs, versDate } from '../domaine/match';
import { libelleDistance } from '../domaine/rayon';
import { Pulse } from './Pulse';
import { RangeeJoueurs } from './Avatar';

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
  pseudos,
}: {
  m: Match;
  distanceKm: number | null;
  /** Affiché quand le match dépasse le rayon mais reste montré parce qu'on y
   *  joue — sinon le filtre a l'air cassé. */
  horsRayon?: boolean;
  onOuvrir?: () => void;
  /** uid → pseudo, pour les pastilles. Absent, la carte rend sans avatars
   *  plutôt que d'afficher des identifiants bruts. */
  pseudos?: Record<string, string>;
}) {
  const inscrits = (m.joueursInscrits ?? []).length;
  const total = maxJoueurs(m);
  const manque = Math.max(0, total - inscrits);
  const d = libelleDistance(distanceKm);
  const q = quand(m);

  return (
    // `mc` : la cascade d'entrée de la liste s'accroche à cette classe.
    <Plaque action as="button" onClick={onOuvrir} className="mc w-full p-4 text-left">
      {/* L'en-tête de la maquette : l'état à gauche, les places à droite.
          Le badge de places est la première chose qu'on cherche en balayant
          une liste — « est-ce que je peux entrer ? ». */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          {m.statut === 'sondage' ? 'À caler' : m.statut === 'terminé' ? 'Joué' : 'Confirmé'}
        </p>
        {m.statut !== 'terminé' && manque > 0 && (
          <span className="shrink-0 rounded-(--radius-pill) bg-(--color-vert)/18 px-2 py-0.5 text-[11px] font-semibold text-(--color-vert)">
            {manque} place{manque > 1 ? 's' : ''}
          </span>
        )}
        {manque === 0 && (
          <span className="shrink-0 rounded-(--radius-pill) bg-black/35 px-2 py-0.5 text-[11px] font-semibold text-(--color-encre-faible)">
            Complet
          </span>
        )}
      </div>

      <p className="mt-1.5 font-[family-name:var(--font-titre)] text-2xl">{q.titre}</p>
      {q.sousTitre && (
        <p className="text-xs text-(--color-encre-faible)">{q.sousTitre}</p>
      )}

      <p className="mt-1 text-sm text-(--color-encre-sec)">
        {ou(m)}
        {d && ` · ${d}`}
        {horsRayon && <span className="text-(--color-encre-faible)"> · tu y joues</span>}
      </p>

      {/* LE PULSE, PAS UNE BARRE. Le Pulse avait remplacé la barre partout où
          elle existait en v1, pour une raison de récit : une barre à 70 % dit
          « 70 % » ; sept points posés disent « sept personnes sont là ». La v2
          était repartie sur la barre — donc sur le récit qu'on avait quitté. */}
      {/* Les visages avant les chiffres : la maquette montre QUI vient, pas
          seulement combien. Les places libres en pointillés donnent envie
          d'être prises — c'est le ressort de la carte. */}
      {pseudos && inscrits > 0 && (
        <div className="mt-3">
          <RangeeJoueurs
            joueurs={(m.joueursInscrits ?? []).map((u) => ({ uid: u, pseudo: pseudos[u] ?? '?' }))}
            total={total}
            taille={28}
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <Pulse pris={inscrits} total={total} />
        </div>
        <span className="kpulse-cnt shrink-0 text-xs font-bold tabular-nums text-(--color-encre-sec)">
          <b className="text-(--color-encre)">{inscrits}</b>/{total}
        </span>
      </div>

      {/* Le manque n'est rappelé en bas QUE s'il est criant : au-delà de la
          moitié de l'effectif, le badge du haut suffit et la répétition
          alourdit la carte. */}
      {m.statut !== 'terminé' && manque > 0 && manque <= total / 2 && (
        <p className="mt-2 text-xs text-(--color-feu)">
          {manque === 1 ? 'Il manque 1 joueur' : `Il manque ${manque} joueurs`}
        </p>
      )}
    </Plaque>
  );
}
