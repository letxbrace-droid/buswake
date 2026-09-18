import { lazy, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Accueil } from './ecrans/Accueil';
import { useSession } from './services/session';
import { useProfil } from './services/useProfil';
import { FournisseurToasts } from './composants/Toasts';
import { dejaAccueilli, marquerAccueilli } from './services/premierLancement';
import type { Connexion, Inscription } from './domaine/auth';

// Chargement par route. Firebase pèse à lui seul plus que toute l'app v1 :
// tant qu'il est importé par l'écran d'accueil, on le fait payer à la
// première peinture pour rien. Ici il part avec l'écran qui en a besoin.
const Matchs = lazy(() => import('./ecrans/Matchs').then((m) => ({ default: m.Matchs })));
const Equipes = lazy(() => import('./ecrans/Equipes').then((m) => ({ default: m.Equipes })));
const Classement = lazy(() => import('./ecrans/Classement').then((m) => ({ default: m.Classement })));
const Profil = lazy(() => import('./ecrans/Profil').then((m) => ({ default: m.Profil })));
const DetailMatch = lazy(() => import('./conteneurs/DetailMatchBranche').then((m) => ({ default: m.DetailMatchBranche })));
const Auth = lazy(() => import('./ecrans/Auth').then((m) => ({ default: m.Auth })));
const Accueillir = lazy(() => import('./ecrans/Accueillir').then((m) => ({ default: m.Accueillir })));
const Reglages = lazy(() => import('./ecrans/Reglages').then((m) => ({ default: m.Reglages })));
const Terrains = lazy(() => import('./ecrans/Terrains').then((m) => ({ default: m.Terrains })));
const ApresMatch = lazy(() => import('./conteneurs/ApresMatchBranche').then((m) => ({ default: m.ApresMatchBranche })));
const CreerMatch = lazy(() => import('./conteneurs/CreerMatchBranche').then((m) => ({ default: m.CreerMatchBranche })));
const Amis = lazy(() => import('./conteneurs/AmisBranche').then((m) => ({ default: m.AmisBranche })));
const Chat = lazy(() => import('./conteneurs/ChatBranche').then((m) => ({ default: m.ChatBranche })));
const TerminerMatch = lazy(() => import('./conteneurs/TerminerMatchBranche').then((m) => ({ default: m.TerminerMatchBranche })));
const Composer = lazy(() => import('./conteneurs/ComposerBranche').then((m) => ({ default: m.ComposerBranche })));
const MotDePasse = lazy(() => import('./conteneurs/CompteBranche').then((m) => ({ default: m.MotDePasseBranche })));
const SupprimerCompte = lazy(() => import('./conteneurs/CompteBranche').then((m) => ({ default: m.SupprimerCompteBranche })));

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
let terminerDemo: Demo['TERMINER_DEMO'] | null = null;
let apresDemo: Demo['APRES_DEMO'] | null = null;
let amisDemo: Demo['AMIS_DEMO'] | null = null;
let chatDemo: Demo['CHAT_DEMO'] | null = null;
if (import.meta.env.DEV) {
  const d = await import('./demo');
  client.setQueryData(['fil', 'u1'], d.MATCHS_DEMO);
  equipesDemo = d.EQUIPES_DEMO;
  joueursDemo = d.JOUEURS_DEMO;
  profilDemo = d.PROFIL_DEMO;
  terminerDemo = d.TERMINER_DEMO;
  apresDemo = d.APRES_DEMO;
  amisDemo = d.AMIS_DEMO;
  chatDemo = d.CHAT_DEMO;
  // On amorce le cache des conteneurs plutôt que de rendre un arbre
  // parallèle : le harnais mesure ainsi l'écran RÉELLEMENT branché.
  client.setQueryData(['match', 'd2'], { m: d.DETAIL_DEMO.m, votes: d.DETAIL_DEMO.votes });
  client.setQueryData(['apres', 'd2'], {
    inscrits: d.APRES_DEMO.inscrits, ratings: {}, votes: d.APRES_DEMO.votes,
  });
  client.setQueryData(['terminer', 'd2'], {
    m: { ...d.DETAIL_DEMO.m, statut: 'confirmé', joueursInscrits: d.TERMINER_DEMO.inscrits },
    camps: d.TERMINER_DEMO.camps,
  });
  client.setQueryData(['composer', 'd2'], {
    inscrits: d.TERMINER_DEMO.inscrits,
    camps: d.TERMINER_DEMO.camps.map((c) => ({ ...c, joueurs: c.joueurs.slice(0, 2) })),
  });
}

const MASSY = { lat: 48.726, lon: 2.283 };

// Même raison que dans session.ts : ces trois fonctions vivent dans un module
// qui importe Firebase. Les appeler par import dynamique garde Firebase hors
// du chunk d'entrée — il ne se charge qu'au moment où on s'en sert.
// En développement les fournisseurs sont figés : le conteneur n'atteint pas
// Firebase, donc auth.currentUser est nul. En production ils viennent du
// compte réel, et c'est eux qui décident si le mot de passe se gère ici.
const fournisseursDemo = import.meta.env.DEV ? ['password'] : [];

const actionsAuth = {
  connecter: (v: Connexion) => import('./services/auth').then((m) => m.connecter(v)),
  inscrire: (v: Inscription) => import('./services/auth').then((m) => m.inscrire(v)),
  avecGoogle: () => import('./services/auth').then((m) => m.connecterAvecGoogle()),
};

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <FournisseurToasts>
        <HashRouter>
          <Coque />
        </HashRouter>
      </FournisseurToasts>
    </QueryClientProvider>
  );
}

function Coque() {
  const [reglages, setReglages] = useState(false);
  const chemin = useLocation().pathname;
  const naviguer = useNavigate();
  const { uid, enAttente } = useSession();
  const { profil } = useProfil(uid, profilDemo ?? undefined);
  const [accueilli, setAccueilli] = useState(dejaAccueilli);
  const surBienvenue = chemin === '/bienvenue';
  const surEcranAuth = chemin === '/connexion' || chemin === '/bienvenue';

  // Tant qu'on ne SAIT pas, on ne montre rien plutôt que de faire clignoter
  // l'écran de connexion devant quelqu'un qui est déjà connecté.
  if (enAttente) return <div className="h-full bg-(--color-fond)" aria-busy="true" />;

  // Un visiteur déconnecté n'a rien à faire ailleurs qu'à l'entrée — et au
  // tout premier lancement, l'entrée c'est la promesse, pas un formulaire.
  if (!uid && !surEcranAuth) {
    return <Navigate to={accueilli ? '/connexion' : '/bienvenue'} replace />;
  }
  if (!uid && surBienvenue && accueilli) return <Navigate to="/connexion" replace />;
  // En production, quelqu'un de connecté n'a pas à voir l'écran d'entrée.
  // En développement on l'y laisse aller : la session y est simulée comme
  // connectée, et sans cette exception l'écran deviendrait inatteignable —
  // ni pour le travail visuel, ni pour le harnais qui le mesure.
  if (uid && surEcranAuth && !import.meta.env.DEV) return <Navigate to="/" replace />;

  return (
        <div className="flex h-full flex-col">
          <main className="min-h-0 flex-1">
            <Routes>
              <Route
                path="/"
                element={<Accueil pseudo={profil?.pseudo ?? '…'} xp={profil?.xp ?? 0} />}
              />
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
                    {profil && (
                      <Profil
                        j={{
                          pseudo: profil.pseudo,
                          poste: profil.posteFavori,
                          club: profil.club,
                          atouts: profil.atouts,
                          xp: profil.xp,
                          badges: profil.badges,
                          stats: profil.stats,
                        }}
                      />
                    )}
                  </Suspense>
                }
              />
              <Route
                path="/match/:id"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <DetailMatch uid="u1" />
                  </Suspense>
                }
              />
              <Route
                path="/match/:id/terminer"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <TerminerMatch uid="u1" pseudos={terminerDemo?.pseudos ?? {}} />
                  </Suspense>
                }
              />
              <Route
                path="/bienvenue"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Accueillir
                      onCommencer={() => {
                        marquerAccueilli();
                        setAccueilli(true);
                      }}
                    />
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
              <Route
                path="/terrains"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Terrains
                      domicile={
                        profil?.domicileLat != null && profil?.domicileLon != null
                          ? { lat: profil.domicileLat, lon: profil.domicileLon }
                          : MASSY
                      }
                    />
                  </Suspense>
                }
              />
              <Route
                path="/match/:id/apres"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    {apresDemo && <ApresMatch uid="u1" pseudos={apresDemo.pseudos} />}
                  </Suspense>
                }
              />
              <Route
                path="/creer"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <CreerMatch uid="u1" domicile={MASSY} />
                  </Suspense>
                }
              />
              <Route
                path="/joueurs"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    {amisDemo && (
                      <Amis uid="u1" relations={amisDemo.relations} annuaire={amisDemo.annuaire} />
                    )}
                  </Suspense>
                }
              />
              <Route
                path="/match/:id/chat"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    {chatDemo && <Chat uid="u1" pseudos={chatDemo.pseudos} />}
                  </Suspense>
                }
              />
              <Route
                path="/match/:id/composer"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <Composer uid="u1" pseudos={terminerDemo?.pseudos ?? {}} />
                  </Suspense>
                }
              />
              <Route
                path="/compte/mot-de-passe"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <MotDePasse fournisseurs={fournisseursDemo} />
                  </Suspense>
                }
              />
              <Route
                path="/compte/supprimer"
                element={
                  <Suspense fallback={<div className="p-4 text-(--color-encre-faible)">…</div>}>
                    <SupprimerCompte fournisseurs={fournisseursDemo} />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          {/* Pas de navigation tant qu'on n'est pas entré : proposer Matchs
              ou Classement à quelqu'un de déconnecté ne mène nulle part. */}
          {!surEcranAuth && (
            <>
              <button
                onClick={() => setReglages(true)}
                aria-label="Réglages"
                className="fixed top-3 right-3 z-30 grid size-10 place-items-center rounded-full bg-black/45 text-(--color-encre-sec) backdrop-blur-md"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
              >
                <span aria-hidden className="text-lg leading-none">⋯</span>
              </button>
              <Suspense fallback={null}>
                <Reglages
                  ouvert={reglages}
                  onFermer={() => setReglages(false)}
                  pseudo={profil?.pseudo ?? '…'}
                  fournisseurs={fournisseursDemo}
                  actions={{
                    onDeconnexion: () => import('./services/auth').then((m) => m.deconnecter()),
                    onMotDePasse: () => {
                      setReglages(false);
                      naviguer('/compte/mot-de-passe');
                    },
                    onSupprimerCompte: () => {
                      setReglages(false);
                      naviguer('/compte/supprimer');
                    },
                    onInviter: () => {},
                  }}
                />
              </Suspense>
              <BarreBasse />
            </>
          )}
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

      <div className="min-w-0 flex-1">
        <NavLink
          to="/creer"
          aria-label="Proposer un match"
          className="mx-auto -mt-6 grid size-14 place-items-center rounded-full bg-(--color-vert) text-3xl leading-none font-light text-(--color-fond) shadow-[0_8px_20px_-6px_rgba(93,214,44,.55)] transition-transform duration-(--duration-doigt) active:scale-95"
        >
          +
        </NavLink>
      </div>

      <NavLink to="/equipes" className={onglet}>
        Équipes
      </NavLink>
      <NavLink to="/joueurs" className={onglet}>
        Joueurs
      </NavLink>
    </nav>
  );
}
