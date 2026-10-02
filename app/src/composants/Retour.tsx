import { useLocation, useNavigate } from 'react-router-dom';
import { parentDe } from '../domaine/navigation';

/** Le bouton « retour », en haut à gauche, sur tout écran qui n'est pas un
 *  onglet du dock. Même matière et même taille que « ⋯ » en face : les deux
 *  coins du haut parlent la même langue. */
export function Retour() {
  const { pathname, key } = useLocation();
  const aller = useNavigate();
  const parent = parentDe(pathname);
  if (!parent) return null;

  return (
    <button
      type="button"
      aria-label="Retour"
      // `key === 'default'` : c'est la première page de cette session —
      // arrivée par un lien ou une notification. Reculer sortirait de l'app.
      onClick={() => (key === 'default' ? aller(parent, { replace: true }) : aller(-1))}
      className="verre fixed left-3 z-30 grid size-11 place-items-center rounded-full text-(--color-encre) transition-transform duration-(--duration-doigt) active:scale-90"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
