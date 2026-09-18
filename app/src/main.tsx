import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { routeHeritee } from './domaine/push';

/**
 * Les liens d'invitation de la v1 (`#j=<id>`), traduits AVANT que React
 * monte.
 *
 * Ça ne peut pas se faire dans un effet du routeur : la route `j=abc` n'est
 * reconnue par personne, donc le fourre-tout `<Navigate to="/">` s'en empare
 * — et comme les effets des enfants s'exécutent avant ceux du parent, il a
 * déjà réécrit le hash quand le parent le lit. Mesuré : `#j=m1` arrivait sur
 * l'accueil malgré la traduction.
 *
 * Ici, rien n'a encore lu l'URL. `replaceState` plutôt qu'une affectation de
 * `hash` : pas de rechargement, et « retour » ne rebondit pas sur l'ancien
 * lien.
 */
const heritee = routeHeritee(window.location.hash);
if (heritee) history.replaceState(null, '', '#' + heritee);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
