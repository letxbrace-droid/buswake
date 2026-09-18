import { useMemo, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { Segment } from '../composants/Segment';
import { initiales } from '../domaine/joueur';
import {
  aDejaNote, basculerVoteMotm, compterVotesMotm, joueursANoter, monVoteMotm,
  NOTE_MAX, validerNotes, vainqueurMotm, type Notes, type VotesMotm,
} from '../domaine/social';

type Onglet = 'notes' | 'motm';

export function ApresMatch({
  inscrits, pseudos, monUid, ratings, votesInitiaux, onNoter, onVoterMotm,
}: {
  inscrits: readonly string[];
  pseudos: Record<string, string>;
  monUid: string;
  ratings?: Record<string, Notes>;
  votesInitiaux: VotesMotm;
  onNoter(n: Notes): void;
  onVoterMotm(cible: string): void;
}) {
  const [onglet, setOnglet] = useState<Onglet>('notes');
  const nom = (u: string) => pseudos[u] ?? u;

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-4 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Après le match
      </h1>

      <div className="mb-4">
        <Segment
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { cle: 'notes', label: 'Noter' },
            { cle: 'motm', label: 'Homme du match' },
          ]}
        />
      </div>

      {onglet === 'notes' ? (
        <Notation
          aNoter={joueursANoter(inscrits, monUid)}
          nom={nom}
          deja={aDejaNote(ratings, monUid)}
          notesExistantes={ratings?.[monUid]}
          onValider={onNoter}
        />
      ) : (
        <VoteMotm
          inscrits={inscrits}
          nom={nom}
          monUid={monUid}
          votesInitiaux={votesInitiaux}
          onVoter={onVoterMotm}
        />
      )}
    </div>
  );
}

function Notation({
  aNoter, nom, deja, notesExistantes, onValider,
}: {
  aNoter: string[];
  nom(u: string): string;
  deja: boolean;
  notesExistantes?: Notes;
  onValider(n: Notes): void;
}) {
  const [notes, setNotes] = useState<Notes>(notesExistantes ?? {});
  const v = useMemo(() => validerNotes(aNoter, notes), [aNoter, notes]);

  return (
    <>
      <Plaque className="mb-3 p-4">
        <p className="text-sm text-(--color-encre-sec)">
          {deja
            ? 'Tu as déjà noté ce match. Merci.'
            : 'Donne une note à chaque joueur — ça vaut 10 XP.'}
        </p>
        {/* On ne se note pas soi-même : c'est la seule façon d'empêcher
            quelqu'un de faire monter sa propre moyenne. */}
        <p className="mt-1 text-xs text-(--color-encre-faible)">
          Tu ne peux pas te noter toi-même.
        </p>
      </Plaque>

      <div className="flex flex-col gap-2">
        {aNoter.map((u) => (
          <Plaque key={u} className="flex items-center gap-3 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
              {initiales(nom(u))}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm">{nom(u)}</p>
            <div className="flex shrink-0 gap-0.5" role="group" aria-label={`Note de ${nom(u)}`}>
              {Array.from({ length: NOTE_MAX }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={deja}
                  aria-label={`${n} sur ${NOTE_MAX}`}
                  aria-pressed={(notes[u] ?? 0) >= n}
                  onClick={() => setNotes((p) => ({ ...p, [u]: n }))}
                  className={`text-xl leading-none ${
                    // Une étoile éteinte doit RESTER VISIBLE : à 22 % on ne
                    // voyait plus combien il y en avait à cliquer, et la
                    // mesure la donnait à 2.05:1. L'écart avec l'or reste
                    // parfaitement lisible.
                    (notes[u] ?? 0) >= n ? 'text-(--color-or)' : 'text-(--color-encre-faible)'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </Plaque>
        ))}
      </div>

      {!deja && (
        <>
          {/* Toutes les notes ou aucune : ne noter que ses amis fausse la
              moyenne de tout le monde. On dit combien il en manque. */}
          {!v.ok && (
            <p className="mt-3 text-center text-sm text-(--color-feu)">
              {v.manque === 1 ? 'Il reste 1 joueur à noter' : `Il reste ${v.manque} joueurs à noter`}
            </p>
          )}
          <button
            type="button"
            disabled={!v.ok}
            onClick={() => onValider(notes)}
            className="mt-3 w-full rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
          >
            Valider mes notes
          </button>
        </>
      )}
    </>
  );
}

function VoteMotm({
  inscrits, nom, monUid, votesInitiaux, onVoter,
}: {
  inscrits: readonly string[];
  nom(u: string): string;
  monUid: string;
  votesInitiaux: VotesMotm;
  onVoter(cible: string): void;
}) {
  const [votes, setVotes] = useState(votesInitiaux);
  const mien = monVoteMotm(votes, monUid);
  const classement = compterVotesMotm(votes);
  const vainqueur = vainqueurMotm(votes);
  const voix = (u: string) => votes[u]?.length ?? 0;

  return (
    <>
      <Plaque className="mb-3 p-4">
        <p className="text-sm text-(--color-encre-sec)">
          Qui a été le meilleur ? Le vainqueur gagne 15 XP.
        </p>
        {/* Une égalité n'a pas de vainqueur : désigner le premier par ordre
            alphabétique donnerait 15 XP sur un tirage déguisé en résultat. */}
        {classement.length > 0 && !vainqueur && (
          <p className="mt-1.5 text-xs text-(--color-feu)">
            Égalité en tête — pas de vainqueur pour l’instant.
          </p>
        )}
      </Plaque>

      <div className="grid grid-cols-2 gap-2.5">
        {inscrits.map((u) => {
          const choisi = mien === u;
          return (
            <Plaque
              key={u}
              action
              as="button"
              onClick={() => {
                setVotes((p) => basculerVoteMotm(p, u, monUid));
                onVoter(u);
              }}
              aria-pressed={choisi}
              className={`flex flex-col items-center p-4 ${choisi ? 'ring-1 ring-(--color-or)' : ''}`}
            >
              <span
                className={`grid size-11 place-items-center rounded-full text-sm font-bold ${
                  u === vainqueur
                    ? 'bg-(--color-or) text-(--color-fond)'
                    : 'bg-white/10 text-(--color-encre)'
                }`}
              >
                {initiales(nom(u))}
              </span>
              <p className="mt-2 max-w-full truncate text-sm font-medium">{nom(u)}</p>
              <p className="text-xs text-(--color-encre-sec)">
                {voix(u)} {voix(u) === 1 ? 'voix' : 'voix'}
                {choisi && ' · ton vote'}
              </p>
            </Plaque>
          );
        })}
      </div>
    </>
  );
}
