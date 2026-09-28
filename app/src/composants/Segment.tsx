import { motion } from 'motion/react';

export interface OptionSegment<T extends string> {
  readonly cle: T;
  readonly label: string;
  readonly compte?: number;
}

/** Contrôle segmenté. Le curseur glisse d'un onglet à l'autre par `layoutId` :
 *  Motion mesure les deux positions et anime entre elles. La v1 le faisait à
 *  la main (offsetWidth + offsetLeft + requestAnimationFrame) — même geste,
 *  trois fois moins de code, et rien à recalculer au redimensionnement. */
export function Segment<T extends string>({
  options,
  valeur,
  onChange,
}: {
  options: readonly OptionSegment<T>[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="relative flex gap-1 rounded-(--radius-pill) bg-black/40 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,.5)]"
    >
      {options.map((o) => {
        const actif = o.cle === valeur;
        return (
          <button
            key={o.cle}
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(o.cle)}
            className="relative min-h-10 flex-1 rounded-(--radius-pill) px-2 py-2 text-sm font-medium whitespace-nowrap transition-transform duration-(--duration-doigt) active:scale-95"
          >
            {actif && (
              <motion.span
                layoutId="curseur-segment"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-(--radius-pill) bg-(--color-vert)/15 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-vert)_32%,transparent)]"
              />
            )}
            <span
              className={`relative ${actif ? 'font-semibold text-(--color-vert)' : 'text-(--color-encre-sec)'}`}
            >
              {o.label}
              {o.compte !== undefined && (
                <span className="ml-1.5 text-xs text-(--color-encre-faible)">{o.compte}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
