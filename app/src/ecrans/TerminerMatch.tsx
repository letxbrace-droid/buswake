import { useMemo, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import {
  basculerPresence, bilanPresences, lireScore, presencesParDefaut, SCORE_MAX,
  validerResultat, type Resultat,
} from '../domaine/fin';
import { initiales } from '../domaine/joueur';
import type { Camp } from '../domaine/composition';

export function TerminerMatch({
  inscrits, pseudos, camps, onValider, occupe = false,
}: {
  inscrits: readonly string[];
  pseudos: Record<string, string>;
  camps?: readonly Camp[];
  onValider(r: Resultat): void;
  occupe?: boolean;
}) {
  const [scoreA, setScoreA] = useState('0');
  const [scoreB, setScoreB] = useState('0');
  const [hdm, setHdm] = useState<string | null>(null);
  const [presences, setPresences] = useState(() => presencesParDefaut(inscrits));

  const bilan = useMemo(() => bilanPresences(inscrits, presences), [inscrits, presences]);
  const v = useMemo(
    () => validerResultat(inscrits, { hommeDuMatchUid: hdm, attendance: presences }),
    [inscrits, hdm, presences],
  );

  const nom = (u: string) => pseudos[u] ?? u;

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-4 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Terminer
      </h1>

      <Plaque className="mb-3 p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Score final
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ChampScore
            label={camps?.[0]?.nom ?? 'Équipe A'}
            valeur={scoreA}
            onChange={setScoreA}
            couleur={camps?.[0]?.couleur}
          />
          <span className="font-[family-name:var(--font-titre)] text-2xl text-(--color-encre-faible)">
            –
          </span>
          <ChampScore
            label={camps?.[1]?.nom ?? 'Équipe B'}
            valeur={scoreB}
            onChange={setScoreB}
            couleur={camps?.[1]?.couleur}
          />
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Homme du match
        </p>
        <p className="mb-3 text-xs text-(--color-encre-sec)">Facultatif — vaut 200 XP.</p>
        <div className="flex flex-wrap gap-2">
          {bilan.presents.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setHdm(hdm === u ? null : u)}
              aria-pressed={hdm === u}
              className={`rounded-(--radius-pill) px-3 py-1.5 text-sm transition-colors duration-(--duration-doigt) ${
                hdm === u
                  ? 'bg-(--color-or) font-semibold text-(--color-fond)'
                  : 'bg-black/30 text-(--color-encre-sec)'
              }`}
            >
              {nom(u)}
            </button>
          ))}
        </div>
      </Plaque>

      <Plaque className="p-4">
        <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Présences
        </p>
        {/* Présent par défaut : on demande de signaler les ABSENTS. Cocher dix
            présents pour un cas qui arrive presque toujours, c'est faire payer
            le cas courant. */}
        <p className="mb-3 text-xs text-(--color-encre-sec)">
          Tout le monde est présent — tape pour marquer un absent.
        </p>
        <ul className="flex flex-col gap-1.5">
          {inscrits.map((u) => {
            const absent = presences[u] === false;
            return (
              <li key={u}>
                <button
                  type="button"
                  onClick={() => setPresences((p) => basculerPresence(p, u))}
                  aria-pressed={!absent}
                  className="flex w-full items-center gap-2.5 rounded-(--radius-sm) bg-black/25 p-2.5 text-left"
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      absent
                        ? 'bg-white/8 text-(--color-encre-faible)'
                        : 'bg-(--color-vert) text-(--color-fond)'
                    }`}
                  >
                    {initiales(nom(u))}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${absent ? 'text-(--color-encre-faible) line-through' : ''}`}
                  >
                    {nom(u)}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${absent ? 'text-(--color-feu)' : 'text-(--color-encre-sec)'}`}
                  >
                    {absent ? 'Absent' : 'Présent'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Plaque>

      {/* On dit POURQUOI c'est bloqué plutôt que de griser en silence. */}
      {!v.ok && (
        <p className="mt-3 text-center text-sm text-(--color-feu)">{v.probleme}</p>
      )}

      <button
        type="button"
        disabled={occupe || !v.ok}
        onClick={() =>
          onValider({
            scoreA: lireScore(scoreA),
            scoreB: lireScore(scoreB),
            hommeDuMatchUid: hdm,
            attendance: presences,
          })
        }
        className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
      >
        Valider le résultat
      </button>

      <p className="mt-3 text-center text-xs text-(--color-encre-faible)">
        L’XP est attribuée par le serveur à partir des présences.
      </p>
    </div>
  );
}

function ChampScore({
  label, valeur, onChange, couleur,
}: {
  label: string;
  valeur: string;
  onChange(v: string): void;
  couleur?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 truncate text-center text-xs text-(--color-encre-sec)">{label}</p>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={SCORE_MAX}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Score ${label}`}
        className="w-full rounded-(--radius-sm) border border-white/12 bg-(--color-carte) py-3 text-center font-[family-name:var(--font-titre)] text-2xl text-(--color-encre)"
        style={couleur ? { borderBottomColor: couleur, borderBottomWidth: 2 } : undefined}
      />
    </div>
  );
}
