import { Plaque } from '../composants/Plaque';
import { progressionDe } from '../domaine/xp';

/** Écran d'accueil — un seul focus, une seule action.
 *  Port de l'écran v1 : le héros porte le match du moment, le reste est
 *  démoté sous lui. */
export function Accueil({ pseudo, xp }: { pseudo: string; xp: number }) {
  const p = progressionDe(xp);

  return (
    <div className="terrain terrain-accueil min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <header className="mb-5 flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
          Salut {pseudo}
        </h1>
        <span className="text-sm text-(--color-encre-sec)">{xp} XP</span>
      </header>

      <Plaque variante="heros" className="mb-4 p-5">
        <p className="text-xs tracking-[0.18em] text-(--color-encre-faible) uppercase">
          Le prochain
        </p>
        <p className="mt-2 font-[family-name:var(--font-titre)] text-4xl">Jeudi 18h30</p>
        <p className="mt-1 text-(--color-encre-sec)">Le Five Massy · 8 inscrits sur 10</p>
        <button
          type="button"
          className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond) transition-transform duration-(--duration-doigt) active:scale-[0.98]"
        >
          Je viens
        </button>
      </Plaque>

      <div className="grid grid-cols-2 gap-3">
        <Plaque action className="p-4">
          <p className="text-xs text-(--color-encre-faible) uppercase">Ton rang</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: p.rang.couleur }}>
            {p.rang.label}
          </p>
          {p.suivant && (
            <p className="mt-1 text-xs text-(--color-encre-sec)">
              {p.restant} XP avant {p.suivant.label}
            </p>
          )}
        </Plaque>

        <Plaque action className="p-4">
          <p className="text-xs text-(--color-encre-faible) uppercase">Autour de toi</p>
          <p className="mt-1 text-xl font-semibold">3 terrains</p>
          <p className="mt-1 text-xs text-(--color-encre-sec)">à moins de 10 km</p>
        </Plaque>
      </div>
    </div>
  );
}
