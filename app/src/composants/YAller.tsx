import { useState } from 'react';
import { APPLIS, destinationItineraire, lienItineraire, type Lieu } from '../domaine/itineraire';

/** « Y aller » — un bouton, trois applications.
 *
 *  On ne choisit PAS à la place du joueur : Waze, Google Maps et Plans n'ont
 *  pas le même public, et deviner mal coûte un aller-retour dans un menu
 *  système au moment où quelqu'un est déjà en retard. */
export function YAller({ lieu, compact = false }: { lieu: Lieu; compact?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const d = destinationItineraire(lieu);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-label={compact ? `Aller à ${lieu.n}` : undefined}
        className={`flex items-center justify-center gap-1.5 rounded-(--radius-pill) bg-(--color-vert) font-semibold text-(--color-fond) ${
          compact ? 'size-10' : 'w-full py-3'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
          <path d="M21.3 3.3 3.6 10.6c-.9.4-.8 1.7.2 1.9l7 1.6 1.6 7c.2 1 1.5 1.1 1.9.2l7.3-17.7c.3-.7-.4-1.5-1.3-1.3z" />
        </svg>
        {!compact && 'Y aller'}
      </button>

      {ouvert && (
        <div
          className="absolute right-0 bottom-full z-20 mb-2 w-52 overflow-hidden rounded-(--radius-md) border border-white/12 bg-(--color-surface) shadow-[0_18px_36px_-12px_rgba(0,0,0,.8)]"
          role="menu"
        >
          {APPLIS.map((a) => (
            <a
              key={a.id}
              role="menuitem"
              href={lienItineraire(lieu, a.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOuvert(false)}
              className="block border-b border-white/8 px-3.5 py-3 text-sm last:border-0"
            >
              {a.label}
            </a>
          ))}

          {/* On DIT que la position est approximative. Un joueur qui se croit
              guidé à la porte et se retrouve à 800 m ne revient pas. */}
          {!d.exact && (
            <p className="bg-(--color-feu)/12 px-3.5 py-2 text-xs text-(--color-feu)">
              Position approximative — pas d’adresse exacte pour ce lieu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
