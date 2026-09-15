import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/** Tiroir de réglages. Il glisse depuis la droite et couvre l'écran d'un
 *  voile : on ne perd pas l'écran de dessous, on le met en retrait.
 *
 *  Trois choses qu'un tiroir doit faire et qu'on oublie souvent :
 *  Échap le ferme, le focus y entre à l'ouverture et n'en sort pas, et le
 *  fond ne défile plus derrière. Sans ça, c'est une div qui flotte. */
export function Tiroir({
  ouvert, onFermer, titre, children,
}: {
  ouvert: boolean;
  onFermer(): void;
  titre: string;
  children: ReactNode;
}) {
  const panneau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFermer();
        return;
      }
      if (e.key !== 'Tab') return;
      // Piège à focus : sans lui, la tabulation sort du tiroir et va cliquer
      // dans l'écran de dessous, qu'on croit pourtant inactif.
      const cibles = panneau.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!cibles?.length) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener('keydown', auClavier);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panneau.current?.querySelector<HTMLElement>('button')?.focus();

    return () => {
      document.removeEventListener('keydown', auClavier);
      document.body.style.overflow = avant;
    };
  }, [ouvert, onFermer]);

  return (
    <AnimatePresence>
      {ouvert && (
        <>
          {/* Le voile se clique pour fermer, mais il n'est NI focalisable NI
              annoncé : c'est une commodité à la souris, pas une commande.
              En faire un <button> donnait deux fermetures à un lecteur
              d'écran — celle-ci et la croix — pour un seul geste utile.
              Échap et la croix restent les vraies commandes. */}
          <motion.div
            aria-hidden
            onClick={onFermer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panneau}
            role="dialog"
            aria-modal="true"
            aria-label={titre}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[min(21rem,88vw)] flex-col bg-(--color-surface) shadow-[-24px_0_48px_-12px_rgba(0,0,0,.7)]"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <header className="flex items-center justify-between border-b border-(--color-bord) px-4 py-3.5">
              <h2 className="font-[family-name:var(--font-titre)] text-xl tracking-wide uppercase">
                {titre}
              </h2>
              <button
                onClick={onFermer}
                aria-label="Fermer"
                className="grid size-9 place-items-center rounded-full bg-white/8 text-(--color-encre-sec)"
              >
                ✕
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
        {titre}
      </h3>
      {children}
    </section>
  );
}

export function Ligne({
  children, onClick, danger = false, aide,
}: {
  children: ReactNode;
  onClick?(): void;
  danger?: boolean;
  aide?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1.5 w-full rounded-(--radius-sm) bg-black/25 px-3.5 py-3 text-left text-sm ${
        danger ? 'text-(--color-rouge)' : 'text-(--color-encre)'
      }`}
    >
      {children}
      {aide && <span className="mt-0.5 block text-xs text-(--color-encre-faible)">{aide}</span>}
    </button>
  );
}
