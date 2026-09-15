import { useMemo, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { creneauxSuggeres, etatCreation, terrainsProches } from '../domaine/creation';
import { libelleDistance, type Position } from '../domaine/rayon';
import type { TerrainVerifie } from '../domaine/terrains';
import type { CreerMatch as Saisie } from '../domaine/schemas';

const EFFECTIFS = [6, 8, 10, 12] as const;

export function CreerMatch({
  domicile, occupe = false, onCreer,
}: {
  domicile: Position | null;
  occupe?: boolean;
  onCreer(v: Saisie): void;
}) {
  const terrains = useMemo(() => terrainsProches(domicile, 3), [domicile]);
  const creneaux = useMemo(() => creneauxSuggeres(), []);
  const [lieu, setLieu] = useState<TerrainVerifie | null>(null);
  const [choisis, setChoisis] = useState<Set<number>>(new Set());
  const [joueursMax, setJoueursMax] = useState<number>(10);

  const etat = etatCreation(lieu?.n ?? null, [...choisis]);

  const basculer = (i: number) =>
    setChoisis((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="terrain terrain-matchs min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-1 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Proposer un match
      </h1>
      {/* Zéro saisie : personne ne tape une date au clavier, debout, entre
          deux choses. On coche. */}
      <p className="mb-4 text-xs text-(--color-encre-faible)">
        Coche un terrain et un ou plusieurs créneaux — les autres voteront.
      </p>

      <Plaque className="mb-3 p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Où
        </p>
        <div className="flex flex-col gap-2">
          {terrains.map(({ terrain, km }) => {
            const actif = lieu?.n === terrain.n;
            return (
              <button
                key={terrain.n}
                type="button"
                onClick={() => setLieu(terrain)}
                aria-pressed={actif}
                className={`rounded-(--radius-md) border p-3 text-left transition-colors duration-(--duration-doigt) ${
                  actif ? 'border-(--color-vert) bg-(--color-vert)/12' : 'border-white/10 bg-black/25'
                }`}
              >
                <p className="text-sm font-medium">{terrain.n}</p>
                {/* L'adresse complète dès la création : c'est elle qui partira
                    dans le match et que dix personnes liront pour venir. */}
                <p className="mt-0.5 text-xs text-(--color-encre-sec)">{terrain.adr}</p>
                {km != null && (
                  <p className="mt-0.5 text-xs text-(--color-encre-faible)">
                    {libelleDistance(km)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Quand
        </p>
        {/* Plusieurs créneaux, c'est tout l'intérêt du sondage : fixer une
            seule date, c'est décider pour dix personnes. */}
        <p className="mb-3 text-xs text-(--color-encre-sec)">
          Coches-en plusieurs : c’est le vote qui tranchera.
        </p>
        <div className="flex flex-col gap-2">
          {creneaux.map((c, i) => {
            const actif = choisis.has(i);
            return (
              <button
                key={c.date.toISOString()}
                type="button"
                onClick={() => basculer(i)}
                aria-pressed={actif}
                className={`flex items-center gap-2.5 rounded-(--radius-md) border p-3 text-left transition-colors duration-(--duration-doigt) ${
                  actif ? 'border-(--color-vert) bg-(--color-vert)/12' : 'border-white/10 bg-black/25'
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-[6px] border text-xs ${
                    actif
                      ? 'border-(--color-vert) bg-(--color-vert) text-(--color-fond)'
                      : 'border-white/25'
                  }`}
                  aria-hidden
                >
                  {actif ? '✓' : ''}
                </span>
                <span className="text-sm">{c.libelle}</span>
              </button>
            );
          })}
        </div>
      </Plaque>

      <Plaque className="mb-4 p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Combien de joueurs
        </p>
        <div className="flex gap-1.5">
          {EFFECTIFS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setJoueursMax(n)}
              aria-pressed={joueursMax === n}
              className={`flex-1 rounded-(--radius-pill) py-2 text-sm ${
                joueursMax === n
                  ? 'bg-(--color-vert) font-semibold text-(--color-fond)'
                  : 'bg-black/30 text-(--color-encre-sec)'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Plaque>

      {etat.manque && (
        <p className="mb-3 text-center text-sm text-(--color-feu)">{etat.manque}</p>
      )}

      <button
        type="button"
        disabled={occupe || !etat.pret}
        onClick={() =>
          lieu &&
          onCreer({
            sport: 'foot5',
            joueursMax,
            creneauxProposes: [...choisis].map((i) => ({
              date: creneaux[i].date,
              lieu: lieu.n,
            })),
          })
        }
        className="w-full rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) disabled:bg-white/10 disabled:text-(--color-encre-faible)"
      >
        Proposer le match
      </button>
    </div>
  );
}
