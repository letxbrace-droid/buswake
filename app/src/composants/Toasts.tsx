import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type TonToast = 'info' | 'succes' | 'erreur';

interface Toast {
  readonly id: number;
  readonly texte: string;
  readonly ton: TonToast;
  readonly sortant: boolean;
}

const Contexte = createContext<(texte: string, ton?: TonToast) => void>(() => {});

export function useToast() {
  return useContext(Contexte);
}

const DUREE = 3400;
const SORTIE = 220;

/** Les retours d'action. Une écriture qui part sans rien dire laisse le doute
 *  — « est-ce que ça a marché ? » — et le doute fait recliquer, donc réécrire.
 *
 *  ANIMÉ EN CSS, PAS AVEC MOTION. Ce composant est monté à la racine : y
 *  importer Motion faisait entrer 39 Ko dans la première peinture, pour faire
 *  glisser une pastille. Un moteur de physique à ressorts se charge avec les
 *  écrans qui en ont besoin, pas avec la page d'accueil.
 *
 *  Les toasts passent par un live region : un message qui n'existe que
 *  visuellement n'est pas un message pour tout le monde.
 */
export function FournisseurToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const montrer = useCallback((texte: string, ton: TonToast = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, texte, ton, sortant: false }]);
    window.setTimeout(() => {
      setToasts((p) => p.map((t) => (t.id === id ? { ...t, sortant: true } : t)));
      window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), SORTIE);
    }, DUREE);
  }, []);

  const valeur = useMemo(() => montrer, [montrer]);

  return (
    <Contexte.Provider value={valeur}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-sortant={t.sortant || undefined}
            className={`toast max-w-sm rounded-(--radius-pill) px-4 py-2.5 text-sm font-medium shadow-[0_14px_28px_-10px_rgba(0,0,0,.8)] ${
              t.ton === 'succes'
                ? 'bg-(--color-vert) text-(--color-fond)'
                : t.ton === 'erreur'
                  ? 'bg-(--color-rouge) text-white'
                  : 'bg-(--color-carte2) text-(--color-encre)'
            }`}
          >
            {t.texte}
          </div>
        ))}
      </div>
    </Contexte.Provider>
  );
}
