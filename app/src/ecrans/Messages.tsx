import { Plaque } from '../composants/Plaque';
import { Icone } from '../composants/Icone';
import { useEntree } from '../services/useEntree';
import type { Fil } from '../domaine/messagerie';

const quand = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        .format(d).replace(':', 'h')
    : 'à caler';

/**
 * Les fils de MES matchs.
 *
 * Ce n'est pas une messagerie directe, et l'écran le dit plutôt que de le
 * laisser deviner : le chat de KOLEKTIF est attaché à un match et ferme 24 h
 * après le coup d'envoi. Un fil qui survit au match devient un groupe que
 * personne n'a demandé et que personne ne quitte.
 */
export function Messages({
  fils, onOuvrir,
}: {
  fils: readonly Fil[];
  onOuvrir(matchId: string): void;
}) {
  const entree = useEntree(fils.length);

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-1 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Messages
      </h1>
      <p className="mb-4 text-xs text-(--color-encre-faible)">
        Un fil par match, ouvert jusqu’à 24 h après le coup d’envoi.
      </p>

      {fils.length === 0 ? (
        <Plaque className="p-8 text-center">
          <p className="font-[family-name:var(--font-titre)] text-xl">Aucune conversation</p>
          <p className="mt-2 text-sm text-(--color-encre-sec)">
            Rejoins un match : son fil s’ouvre avec toi.
          </p>
        </Plaque>
      ) : (
        <div className={`flex flex-col gap-2.5 ${entree}`}>
          {fils.map((f) => (
            <Plaque
              key={f.matchId}
              action
              as="button"
              onClick={() => onOuvrir(f.matchId)}
              className="mc flex w-full items-center gap-3 p-3.5 text-left"
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full ${
                  f.ouvert ? 'bg-(--color-vert)/15 text-(--color-vert)' : 'bg-white/8 text-(--color-encre-faible)'
                }`}
              >
                <Icone nom="message" taille={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{f.titre}</span>
                <span className="block truncate text-xs text-(--color-encre-sec)">
                  {quand(f.quand)} · {f.joueurs} joueur{f.joueurs > 1 ? 's' : ''}
                </span>
              </span>

              {/* On dit pourquoi un fil est éteint. « Fermé » sans raison se
                  lit comme une panne. */}
              {!f.ouvert && (
                <span className="shrink-0 rounded-(--radius-pill) bg-black/35 px-2 py-0.5 text-[10px] text-(--color-encre-faible)">
                  Terminé
                </span>
              )}
            </Plaque>
          ))}
        </div>
      )}
    </div>
  );
}
