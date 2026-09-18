import { Plaque } from '../composants/Plaque';
import {
  aVote, creneauGagnant, peutConfirmer, placeEnRejoignant, type Votes,
} from '../domaine/cycle';
import { maxJoueurs, versDate } from '../domaine/match';
import type { Match } from '../domaine/schemas';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function quand(d: Date): string {
  const min = d.getMinutes();
  return `${JOURS[d.getDay()]} ${d.getDate()} · ${d.getHours()}h${min ? String(min).padStart(2, '0') : ''}`;
}

export interface ActionsMatch {
  onVoter(index: number): void;
  onRejoindre(): void;
  onQuitter(): void;
  onConfirmer(index: number): void;
  onAnnuler(): void;
}

export function DetailMatch({
  m, votes, uid, actions, occupe = false,
}: {
  m: Match;
  votes: Votes;
  uid: string;
  actions: ActionsMatch;
  /** Vrai pendant qu'une écriture est en vol : on grise plutôt que de
   *  laisser cliquer deux fois. */
  occupe?: boolean;
}) {
  const inscrits = m.joueursInscrits ?? [];
  const banc = (m as Match & { waitlist?: string[] }).waitlist ?? [];
  const total = maxJoueurs(m);
  const place = placeEnRejoignant(m, uid);
  const dedans = place === 'deja-titulaire' || place === 'deja-banc';
  const createur = (m as Match & { createurUid?: string }).createurUid === uid;
  const conf = peutConfirmer(m);
  const gagnant = creneauGagnant(m, votes);
  const finale = versDate(m.dateFinale);
  const enTete =
    gagnant != null ? versDate((m.creneauxProposes ?? [])[gagnant.index]?.date) : null;

  return (
    <div className="terrain terrain-matchs min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <Plaque variante="heros" className="mb-4 p-5">
        <p className="text-xs tracking-[0.18em] text-(--color-encre-faible) uppercase">
          {m.statut === 'sondage' ? 'À caler' : m.statut === 'confirmé' ? 'Confirmé' : m.statut}
        </p>
        {/* Même règle que sur la carte : l'œil cherche une date. Tant que le
            créneau n'est pas tranché, on montre CELUI QUI MÈNE, et on dit que
            c'est provisoire — « créneau en cours de vote » en titre géant
            occupe la place la plus visible pour ne rien dire. */}
        <p className="mt-2 font-[family-name:var(--font-titre)] text-3xl">
          {finale ? quand(finale) : enTete ? quand(enTete) : 'Aucun créneau proposé'}
        </p>
        {!finale && enTete && (
          <p className="text-xs text-(--color-encre-faible)">en tête du vote</p>
        )}
        <p className="mt-1 text-(--color-encre-sec)">
          {m.lieuFinal || (m.creneauxProposes ?? []).find((c) => c.lieu)?.lieu || 'Lieu à définir'}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-(--radius-pill) bg-white/10">
            <div
              className="h-full rounded-(--radius-pill) bg-(--color-vert) transition-[width] duration-(--duration-recompense) ease-(--ease-kolektif)"
              style={{ width: `${Math.min(100, (inscrits.length / total) * 100)}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-(--color-encre-sec)">
            {inscrits.length}/{total}
          </span>
        </div>

        {conf.manque > 0 && m.statut === 'sondage' && (
          <p className="mt-2 text-xs text-(--color-feu)">
            {conf.manque === 1 ? 'Il manque 1 joueur' : `Il manque ${conf.manque} joueurs`}
          </p>
        )}

        <button
          type="button"
          disabled={occupe}
          onClick={dedans ? actions.onQuitter : actions.onRejoindre}
          className={`mt-4 w-full rounded-(--radius-pill) py-3 font-semibold transition-transform duration-(--duration-doigt) active:scale-[0.98] disabled:opacity-50 ${
            dedans
              ? 'bg-white/10 text-(--color-encre)'
              : 'bg-(--color-vert) text-(--color-fond)'
          }`}
        >
          {dedans
            ? place === 'deja-banc'
              ? 'Quitter le banc'
              : 'Je ne viens plus'
            : place === 'banc'
              ? 'Match plein — me mettre sur le banc'
              : 'Je viens'}
        </button>

        {/* Le banc n'est pas un refus : on le dit AVANT de cliquer, sinon le
            joueur croit qu'il s'inscrit et découvre après coup qu'il attend. */}
        {!dedans && place === 'banc' && (
          <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
            Tu entres dès que quelqu’un se désiste.
          </p>
        )}
      </Plaque>

      {m.statut === 'sondage' && (m.creneauxProposes ?? []).length > 0 && (
        <Plaque className="mb-4 p-4">
          <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
            Quel créneau ?
          </p>

          <div className="flex flex-col gap-2">
            {(m.creneauxProposes ?? []).map((c, i) => {
              const d = versDate(c.date);
              const voix = (votes[String(i)] ?? []).length;
              const mien = aVote(votes, String(i), uid);
              const gagne = gagnant?.index === i;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={occupe}
                  onClick={() => actions.onVoter(i)}
                  aria-pressed={mien}
                  className={`flex items-center gap-3 rounded-(--radius-md) border p-3 text-left transition-colors duration-(--duration-doigt) disabled:opacity-50 ${
                    mien
                      ? 'border-(--color-vert) bg-(--color-vert)/12'
                      : 'border-white/10 bg-black/25'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d ? quand(d) : 'Date à définir'}</p>
                    <p className="truncate text-xs text-(--color-encre-sec)">{c.lieu}</p>
                  </div>
                  {gagne && voix > 0 && (
                    <span // Fond noir et non une teinte du vert sous du vert : mesuré à 3.85:1,
                      // sous le seuil — le même piège que la pastille de tier.
                      className="shrink-0 rounded-(--radius-pill) bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-(--color-vert)">
                      EN TÊTE
                    </span>
                  )}
                  <span className="shrink-0 text-sm tabular-nums text-(--color-encre-sec)">
                    {voix}
                  </span>
                </button>
              );
            })}
          </div>

          {createur && (
            <>
              <button
                type="button"
                disabled={occupe || !conf.peut || !gagnant}
                onClick={() => gagnant && actions.onConfirmer(gagnant.index)}
                className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
              >
                Confirmer le créneau en tête
              </button>
              {/* On dit POURQUOI c'est grisé. Un bouton mort sans explication
                  laisse le créateur croire que l'app est cassée. */}
              {!conf.peut && (
                <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
                  {conf.inscrits}/{conf.requis} joueurs — confirmer maintenant promettrait un
                  match qui n’aura pas lieu.
                </p>
              )}
              {conf.peut && !gagnant && (
                <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
                  Personne n’a encore voté.
                </p>
              )}
            </>
          )}
        </Plaque>
      )}

      <Plaque className="p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Sur le terrain · {inscrits.length}
        </p>
        <ul className="flex flex-col gap-1.5">
          {inscrits.map((j) => (
            <li key={j} className="flex items-center gap-2 text-sm">
              <span className="size-1.5 rounded-full bg-(--color-vert)" aria-hidden />
              {j === uid ? 'Toi' : j}
            </li>
          ))}
        </ul>

        {banc.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Sur le banc · {banc.length}
            </p>
            <ul className="flex flex-col gap-1.5">
              {banc.map((j, i) => (
                <li key={j} className="flex items-center gap-2 text-sm text-(--color-encre-sec)">
                  <span className="w-4 tabular-nums text-(--color-encre-faible)">{i + 1}</span>
                  {j === uid ? 'Toi' : j}
                </li>
              ))}
            </ul>
          </>
        )}
      </Plaque>

      {createur && m.statut !== 'annulé' && (
        <button
          type="button"
          disabled={occupe}
          onClick={actions.onAnnuler}
          className="mt-4 w-full rounded-(--radius-pill) border border-(--color-rouge)/40 py-3 text-sm font-medium text-(--color-rouge) disabled:opacity-50"
        >
          Annuler le match
        </button>
      )}
    </div>
  );
}
