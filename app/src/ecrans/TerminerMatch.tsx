import { useMemo, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import {
  ajusterCompteur, basculerPresence, bilanPresences, lireScore, presencesParDefaut,
  SCORE_MAX, totalCompteur, validerResultat, type Compteurs, type Resultat,
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
  const [buts, setButs] = useState<Compteurs>({});
  const [passes, setPasses] = useState<Compteurs>({});

  const bilan = useMemo(() => bilanPresences(inscrits, presences), [inscrits, presences]);
  const v = useMemo(
    () =>
      validerResultat(inscrits, {
        hommeDuMatchUid: hdm,
        attendance: presences,
        scoreA: lireScore(scoreA),
        scoreB: lireScore(scoreB),
        buts,
        passes,
      }),
    [inscrits, hdm, presences, scoreA, scoreB, buts, passes],
  );
  const totalScore = lireScore(scoreA) + lireScore(scoreB);
  const restants = totalScore - totalCompteur(buts);

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

      {/* BUTS ET PASSES. Facultatif, et l'écran le dit : exiger l'exhaustivité
          ferait renoncer à saisir quoi que ce soit un jeudi soir à 22 h. Une
          donnée partielle vaut mieux qu'aucune — c'est le trop-plein qu'on
          refuse, pas le manque. */}
      {totalScore > 0 && bilan.presents.length > 0 && (
        <Plaque className="mb-3 p-4">
          <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
            Buts et passes
          </p>
          <p className="mb-3 text-xs text-(--color-encre-sec)">
            Facultatif.{' '}
            {restants > 0
              ? `${restants} but${restants > 1 ? 's' : ''} pas encore attribué${restants > 1 ? 's' : ''}.`
              : restants === 0
                ? 'Tous les buts sont attribués.'
                : ''}
          </p>

          <div className="mb-2 flex items-center gap-2 pr-1 text-[10px] tracking-wide text-(--color-encre-faible) uppercase">
            <span className="flex-1" />
            <span className="w-[86px] text-center">Buts</span>
            <span className="w-[86px] text-center">Passes</span>
          </div>

          <ul className="flex flex-col gap-1.5">
            {bilan.presents.map((u) => (
              <li key={u} className="flex items-center gap-2 rounded-(--radius-sm) bg-black/25 p-2">
                <span className="min-w-0 flex-1 truncate text-sm">{nom(u)}</span>
                <Compteur
                  label={`Buts de ${nom(u)}`}
                  valeur={buts[u] ?? 0}
                  onChange={(d) => setButs((c) => ajusterCompteur(c, u, d))}
                />
                <Compteur
                  label={`Passes de ${nom(u)}`}
                  valeur={passes[u] ?? 0}
                  onChange={(d) => setPasses((c) => ajusterCompteur(c, u, d))}
                />
              </li>
            ))}
          </ul>
        </Plaque>
      )}

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
            buts,
            passes,
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

/** Un pas à la fois, au pouce. Un champ de saisie pour un nombre entre 0 et
 *  trois ouvrirait un clavier numérique pour taper un chiffre — deux gestes
 *  de plus que d'appuyer sur « + ». */
function Compteur({
  label, valeur, onChange,
}: {
  label: string;
  valeur: number;
  onChange(delta: number): void;
}) {
  return (
    <span className="flex w-[86px] shrink-0 items-center justify-between rounded-(--radius-pill) bg-black/35 px-1 py-0.5">
      <button
        type="button"
        aria-label={`Retirer — ${label}`}
        disabled={valeur <= 0}
        onClick={() => onChange(-1)}
        className="grid size-7 place-items-center rounded-full text-(--color-encre-sec) disabled:opacity-25"
      >
        −
      </button>
      <span
        className={`min-w-4 text-center text-sm font-bold tabular-nums ${
          valeur > 0 ? 'text-(--color-vert)' : 'text-(--color-encre-faible)'
        }`}
      >
        {valeur}
      </span>
      <button
        type="button"
        aria-label={`Ajouter — ${label}`}
        onClick={() => onChange(1)}
        className="grid size-7 place-items-center rounded-full text-(--color-encre-sec)"
      >
        +
      </button>
    </span>
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
