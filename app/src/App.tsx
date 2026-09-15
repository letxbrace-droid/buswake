import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Accueil } from './ecrans/Accueil';

// Chargement par route. Firebase pèse à lui seul plus que toute l'app v1 :
// tant qu'il est importé par l'écran d'accueil, on le fait payer à la
// première peinture pour rien. Ici il part avec l'écran qui en a besoin.
const Matchs = lazy(() => import('./ecrans/Matchs').then((m) => ({ default: m.Matchs })));

/** HashRouter et pas BrowserRouter : GitHub Pages ne sait pas réécrire les
 *  URL vers index.html, et l'app v1 utilise déjà des liens d'invitation en
 *  `#j=matchId`. Le hash évite la page 404 de secours et garde valides les
 *  liens déjà partagés par les joueurs. */
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Rendu travaillé sans réseau. `import.meta.env.DEV` est une constante à la
// compilation : ce bloc n'existe pas dans le bundle de production.
if (import.meta.env.DEV) {
  const { MATCHS_DEMO } = await import('./demo');
  client.setQueryData(['fil', 'u1'], MATCHS_DEMO);
}

const MASSY = { lat: 48.726, lon: 2.283 };

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <HashRouter>
        <div className="flex h-full flex-col">
          <main className="min-h-0 flex-1">
            <Routes>
              <Route path="/" element={<Accueil pseudo="Sam" xp={1240} />} />
              <Route
                path="/matchs"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Matchs uid="u1" domicile={MASSY} />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BarreBasse />
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}

/** Le « + » central est surélevé et c'est le SEUL élément vert de la barre :
 *  une barre où tout est accentué n'accentue rien. */
function BarreBasse() {
  const onglet = ({ isActive }: { isActive: boolean }) =>
    `flex-1 min-w-0 py-2 text-center text-xs ${
      isActive ? 'text-(--color-vert)' : 'text-(--color-encre-faible)'
    }`;

  return (
    <nav
      className="relative flex min-h-16 items-center border-t border-(--color-bord) bg-(--color-fond)/92 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <NavLink to="/" className={onglet} end>
        Accueil
      </NavLink>
      <NavLink to="/matchs" className={onglet}>
        Matchs
      </NavLink>

      <div className="flex-1 min-w-0">
        <button
          aria-label="Proposer un match"
          className="mx-auto -mt-6 block size-14 rounded-full bg-(--color-vert) text-3xl leading-none font-light text-(--color-fond) shadow-[0_8px_20px_-6px_rgba(93,214,44,.55)] transition-transform duration-(--duration-doigt) active:scale-95"
        >
          +
        </button>
      </div>

      <NavLink to="/equipes" className={onglet}>
        Équipes
      </NavLink>
      <NavLink to="/classement" className={onglet}>
        Classement
      </NavLink>
    </nav>
  );
}
