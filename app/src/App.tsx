import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Accueil } from './ecrans/Accueil';
import { useSession } from './services/session';
import type { Connexion, Inscription } from './domaine/auth';

// Chargement par route. Firebase pèse à lui seul plus que toute l'app v1 :
// tant qu'il est importé par l'écran d'accueil, on le fait payer à la
// première peinture pour rien. Ici il part avec l'écran qui en a besoin.
const Matchs = lazy(() => import('./ecrans/Matchs').then((m) => ({ default: m.Matchs })));
const Equipes = lazy(() => import('./ecrans/Equipes').then((m) => ({ default: m.Equipes })));
const Classement = lazy(() => import('./ecrans/Classement').then((m) => ({ default: m.Classement })));
const Profil = lazy(() => import('./ecrans/Profil').then((m) => ({ default: m.Profil })));
const DetailMatch = lazy(() => import('./ecrans/DetailMatch').then((m) => ({ default: m.DetailMatch })));
const TerminerMatch = lazy(() => import('./ecrans/TerminerMatch').then((m) => ({ default: m.TerminerMatch })));
const Auth = lazy(() => import('./ecrans/Auth').then((m) => ({ default: m.Auth })));

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
type Demo = Awaited<typeof import('./demo')>;
let equipesDemo: Demo['EQUIPES_DEMO'] = [];
let joueursDemo: Demo['JOUEURS_DEMO'] = [];
let profilDemo: Demo['PROFIL_DEMO'] | null = null;
let detailDemo: Demo['DETAIL_DEMO'] | null = null;
let terminerDemo: Demo['TERMINER_DEMO'] | null = null;
if (import.meta.env.DEV) {
  const d = await import('./demo');
  client.setQueryData(['fil', 'u1'], d.MATCHS_DEMO);
  equipesDemo = d.EQUIPES_DEMO;
  joueursDemo = d.JOUEURS_DEMO;
  profilDemo = d.PROFIL_DEMO;
  detailDemo = d.DETAIL_DEMO;
  terminerDemo = d.TERMINER_DEMO;
}

const MASSY = { lat: 48.726, lon: 2.283 };

// Même raison que dans session.ts : ces trois fonctions vivent dans un module
// qui importe Firebase. Les appeler par import dynamique garde Firebase hors
// du chunk d'entrée — il ne se charge qu'au moment où on s'en sert.
const actionsAuth = {
  connecter: (v: Connexion) => import('./services/auth').then((m) => m.connecter(v)),
  inscrire: (v: Inscription) => import('./services/auth').then((m) => m.inscrire(v)),
  avecGoogle: () => import('./services/auth').then((m) => m.connecterAvecGoogle()),
};

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <HashRouter>
        <Coque />
      </HashRouter>
    </QueryClientProvider>
  );
}

function Coque() {
  const chemin = useLocation().pathname;
  const { uid, enAttente } = useSession();
  const surEcranAuth = chemin === '/connexion';

  // Tant qu'on ne SAIT pas, on ne montre rien plutôt que de faire clignoter
  // l'écran de connexion devant quelqu'un qui est déjà connecté.
  if (enAttente) return <div className="h-full bg-(--color-fond)" aria-busy="true" />;

  // Un visiteur déconnecté n'a rien à faire ailleurs qu'à l'entrée.
  if (!uid && !surEcranAuth) return <Navigate to="/connexion" replace />;
  // En production, quelqu'un de connecté n'a pas à voir l'écran d'entrée.
  // En développement on l'y laisse aller : la session y est simulée comme
  // connectée, et sans cette exception l'écran deviendrait inatteignable —
  // ni pour le travail visuel, ni pour le harnais qui le mesure.
  if (uid && surEcranAuth && !import.meta.env.DEV) return <Navigate to="/" replace />;

  return (
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
              <Route
                path="/equipes"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Equipes equipes={equipesDemo} />
                  </Suspense>
                }
              />
              <Route
                path="/classement"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Classement uid="u1" joueurs={joueursDemo} equipes={equipesDemo} />
                  </Suspense>
                }
              />
              <Route
                path="/profil"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    {profilDemo && <Profil j={profilDemo} />}
                  </Suspense>
                }
              />
              <Route
                path="/match/:id"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    {detailDemo && (
                      <DetailMatch
                        m={detailDemo.m}
                        votes={detailDemo.votes}
                        uid="u1"
                        actions={{
                          onVoter: () => {}, onRejoindre: () => {}, onQuitter: () => {},
                          onConfirmer: () => {}, onAnnuler: () => {},
                        }}
                      />
                    )}
                  </Suspense>
                }
              />
              <Route
                path="/match/:id/terminer"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    {terminerDemo && (
                      <TerminerMatch
                        inscrits={terminerDemo.inscrits}
                        pseudos={terminerDemo.pseudos}
                        camps={terminerDemo.camps}
                        onValider={() => {}}
                      />
                    )}
                  </Suspense>
                }
              />
              <Route
                path="/connexion"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Auth actions={actionsAuth} />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          {/* Pas de navigation tant qu'on n'est pas entré : proposer Matchs
              ou Classement à quelqu'un de déconnecté ne mène nulle part. */}
          {!surEcranAuth && <BarreBasse />}
        </div>
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
