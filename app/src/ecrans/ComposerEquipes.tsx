import { useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { initiales } from '../domaine/joueur';
import {
  banc, CAMPS_PAR_DEFAUT, etatComposition, placer, repartirAlternativement, retirer,
  type Camp,
} from '../domaine/composition';

export function ComposerEquipes({
  inscrits, pseudos, campsInitiaux, occupe = false, onEnregistrer,
}: {
  inscrits: readonly string[];
  pseudos: Record<string, string>;
  campsInitiaux?: readonly Camp[];
  occupe?: boolean;
  onEnregistrer(camps: Camp[]): void;
}) {
  const [camps, setCamps] = useState<Camp[]>(() =>
    campsInitiaux?.length
      ? campsInitiaux.map((c) => ({ ...c, joueurs: [...c.joueurs] }))
      : CAMPS_PAR_DEFAUT.map((c) => ({ ...c, joueurs: [] })),
  );
  const [choisi, setChoisi] = useState<string | null>(null);
  const restants = banc(inscrits, camps);
  const etat = etatComposition(inscrits, camps);
  const nom = (u: string) => pseudos[u] ?? u;

  const versCamp = (i: number) => {
    if (!choisi) return;
    setCamps((c) => placer(c, choisi, i));
    setChoisi(null);
  };

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-1 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Composer
      </h1>
      <p className="mb-4 text-xs text-(--color-encre-faible)">
        Touche un joueur du banc, puis l’équipe où le mettre.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-3">
        {camps.map((c, i) => (
          <Plaque key={c.nom} className="p-3">
            <button
              type="button"
              onClick={() => versCamp(i)}
              disabled={!choisi}
              className="w-full text-left disabled:cursor-default"
            >
              {/* Le nom porte sa propre surface sombre : une couleur d'équipe
                  vive posée à nu sur la plaque tombe sous le seuil — mesuré
                  à 4.42:1 pour le orange des chasubles. */}
              <p
                className="inline-block rounded-(--radius-pill) bg-(--color-fond)/92 px-2.5 py-1 text-xs font-semibold tracking-[0.1em] uppercase"
                style={{ color: c.couleur }}
              >
                {c.nom} · {c.joueurs.length}
              </p>
              {/* La cible d'accueil ne se montre que quand quelqu'un attend
                  d'être placé : un cadre en pointillés permanent fait croire
                  qu'il manque toujours quelque chose. */}
              {choisi && (
                <p className="mt-1 text-xs text-(--color-encre-sec)">
                  Mettre {nom(choisi)} ici
                </p>
              )}
            </button>

            <ul className="mt-2 flex flex-col gap-1.5">
              {c.joueurs.map((u) => (
                <li key={u}>
                  <button
                    type="button"
                    onClick={() => setCamps((p) => retirer(p, u))}
                    className="flex w-full items-center gap-2 rounded-(--radius-sm) bg-black/25 p-2 text-left"
                  >
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-(--color-fond)"
                      style={{ background: c.couleur }}
                    >
                      {initiales(nom(u))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs">{nom(u)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Plaque>
        ))}
      </div>

      <Plaque className="mb-4 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
            Banc · {restants.length}
          </p>
          {restants.length > 0 && (
            <button
              type="button"
              onClick={() => setCamps((c) => repartirAlternativement(inscrits, c))}
              className="text-xs text-(--color-vert) underline underline-offset-2"
            >
              Tirer au sort
            </button>
          )}
        </div>

        {restants.length === 0 ? (
          <p className="text-sm text-(--color-encre-sec)">Tout le monde est placé.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {restants.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setChoisi(choisi === u ? null : u)}
                aria-pressed={choisi === u}
                className={`rounded-(--radius-pill) px-3 py-1.5 text-sm ${
                  choisi === u
                    ? 'bg-(--color-encre) font-semibold text-(--color-fond)'
                    : 'bg-black/30 text-(--color-encre-sec)'
                }`}
              >
                {nom(u)}
              </button>
            ))}
          </div>
        )}
      </Plaque>

      {/* Un écart de deux joueurs se voit sur le terrain avant la fin du
          premier tiers. On le dit avant, pas après. */}
      {etat.ecart > 1 && (
        <p className="mb-3 text-center text-sm text-(--color-feu)">
          {etat.ecart} joueurs d’écart entre les deux équipes.
        </p>
      )}

      <button
        type="button"
        disabled={occupe}
        onClick={() => onEnregistrer(camps)}
        className="w-full rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) disabled:opacity-60"
      >
        Enregistrer les équipes
      </button>
      {!etat.complet && (
        <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
          {restants.length === 1
            ? 'Un joueur reste sur le banc — c’est possible, mais dis-le-lui.'
            : `${restants.length} joueurs restent sur le banc.`}
        </p>
      )}
    </div>
  );
}
