import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Accueil } from './ecrans/Accueil';

/** HashRouter et pas BrowserRouter : GitHub Pages ne sait pas réécrire les
 *  URL vers index.html, et l'app v1 utilise déjà des liens d'invitation en
 *  `#j=matchId`. Le hash évite la page 404 de secours et garde la
 *  compatibilité des liens déjà partagés par les joueurs. */
const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Accueil pseudo="Sam" xp={1240} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
