import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plaque } from '../composants/Plaque';
import { Segment } from '../composants/Segment';
import { CarteMatch } from '../composants/CarteMatch';
import { filDeMatchs } from '../services/fil';
import { usePreferences } from '../services/preferences';
import { compter, matchsDeLOnglet, rangerFil, type Onglet } from '../domaine/fil';
import { RAYONS, distanceMatchKm, libelleRayon, type Position } from '../domaine/rayon';

export function Matchs({ uid, domicile }: { uid: string | null; domicile: Position | null }) {
  const [onglet, setOnglet] = useState<Onglet>('sondage');
  const km = usePreferences((s) => s.km);
  const setKm = usePreferences((s) => s.setKm);

  const { data, isPending, isError } = useQuery({
    queryKey: ['fil', uid],
    queryFn: () => filDeMatchs(uid),
  });

  // Compteurs ET liste sortent du MÊME rangement : ils ne peuvent pas
  // diverger. C'est ce qui produisait « À caler 2 » au-dessus d'une liste
  // vide en v1.
  const fil = useMemo(
    () => rangerFil(data ?? [], { uid, km, domicile }),
    [data, uid, km, domicile],
  );
  const c = useMemo(() => compter(fil), [fil]);
  const liste = matchsDeLOnglet(fil, onglet);

  return (
    <div className="terrain terrain-matchs min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <Plaque className="mb-4 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h1 className="font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
            Matchs
          </h1>
          <Telemetrie ouverts={c.sondage + c.confirme} places={c.places} enCours={isPending} />
        </div>

        <Segment
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { cle: 'sondage', label: 'À caler', compte: c.sondage },
            { cle: 'confirme', label: 'Confirmés', compte: c.confirme },
            { cle: 'termine', label: 'Histo', compte: c.termine },
          ]}
        />

        {onglet !== 'termine' && (
          <div className="mt-3 flex gap-1.5">
            {RAYONS.map((k) => (
              <button
                key={k}
                onClick={() => setKm(k)}
                aria-pressed={km === k}
                className={`min-w-0 flex-1 rounded-(--radius-pill) px-1 py-1.5 text-xs whitespace-nowrap transition-colors duration-(--duration-doigt) ${
                  km === k
                    ? 'bg-(--color-vert) font-semibold text-(--color-fond)'
                    : 'bg-white/8 text-(--color-encre-sec)'
                }`}
              >
                {libelleRayon(k)}
              </button>
            ))}
          </div>
        )}
      </Plaque>

      {isPending && <Squelettes />}

      {isError && (
        <Plaque className="p-6 text-center">
          <p className="text-(--color-encre-sec)">Les matchs n’ont pas pu être chargés.</p>
        </Plaque>
      )}

      {!isPending && !isError && liste.length === 0 && (
        <EtatVide onglet={onglet} km={km} />
      )}

      <div className="flex flex-col gap-3">
        {liste.map((m) => {
          const d = distanceMatchKm(m, domicile);
          return (
            <CarteMatch
              key={m.id}
              m={m}
              distanceKm={d}
              horsRayon={d != null && km > 0 && d > km}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Deux chiffres, tous deux calculés sur le fil réellement montré.
 *  Rien à annoncer plutôt qu'un zéro claironné : l'état vide le dit déjà. */
function Telemetrie({
  ouverts,
  places,
  enCours,
}: {
  ouverts: number;
  places: number;
  enCours: boolean;
}) {
  if (enCours) return <span className="text-xs text-(--color-encre-faible)">Chargement…</span>;

  if (ouverts === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-(--color-encre-faible)">
        <i className="size-1.5 rounded-full bg-(--color-encre-faible)" aria-hidden />
        Rien d’ouvert
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-(--color-encre-sec)">
      <i className="size-1.5 animate-pulse rounded-full bg-(--color-vert)" aria-hidden />
      <b className="text-(--color-encre)">{ouverts}</b> ouvert{ouverts > 1 ? 's' : ''}
      {places > 0 && (
        <>
          <i className="size-0.5 rounded-full bg-current" aria-hidden />
          <b className="text-(--color-encre)">{places}</b> place{places > 1 ? 's' : ''}
        </>
      )}
    </span>
  );
}

/** Trois états vides, et ils disent des choses différentes : l'onglet est
 *  vide, OU le rayon est trop serré. Confondre les deux envoie le joueur
 *  créer un match alors qu'il lui suffisait d'élargir. */
function EtatVide({ onglet, km }: { onglet: Onglet; km: number }) {
  const texte =
    onglet === 'termine'
      ? { titre: 'Aucun match joué', sous: 'Ton historique se remplira après ton premier match.' }
      : km > 0
        ? {
            titre: onglet === 'sondage' ? 'Rien à caler par ici' : 'Aucun match confirmé',
            sous: `Personne à moins de ${km} km. Élargis le rayon, ou lance le tien.`,
          }
        : {
            titre: onglet === 'sondage' ? 'Rien à caler' : 'Aucun match confirmé',
            sous: 'Propose un créneau : les autres voteront.',
          };

  return (
    <Plaque className="p-8 text-center">
      <p className="font-[family-name:var(--font-titre)] text-xl">{texte.titre}</p>
      <p className="mt-2 text-sm text-(--color-encre-sec)">{texte.sous}</p>
      {onglet !== 'termine' && (
        <button className="mt-5 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond)">
          Proposer un match
        </button>
      )}
    </Plaque>
  );
}

function Squelettes() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Plaque key={i} className="h-28 animate-pulse opacity-60" />
      ))}
    </div>
  );
}
