import type { NomIcone } from '../composants/Icone';

/** CINQ ONGLETS — pas un de plus. Au-delà, chaque cible rétrécit sous les
 *  48 px qu'il faut au pouce, et plus rien n'est lisible d'un coup d'œil.
 *  « Créer un match » vit sur l'accueil, en toutes lettres : un « + » central
 *  coûterait une place dans une barre qui en a déjà cinq à tenir. */
export const ONGLETS: readonly {
  readonly to: string;
  readonly nom: NomIcone;
  readonly label: string;
  readonly exact?: boolean;
}[] = [
  { to: '/', nom: 'accueil', label: 'Accueil', exact: true },
  { to: '/matchs', nom: 'ballon', label: 'Matchs' },
  { to: '/club', nom: 'blason', label: 'Mon Club' },
  { to: '/messages', nom: 'message', label: 'Messages' },
  { to: '/profil', nom: 'joueur', label: 'Profil' },
];

/** L'onglet dont relève une adresse, ou -1. Pur, pour être testé sans
 *  navigateur : la pastille qui glisse se place sur CE chiffre. */
export function ongletActif(chemin: string): number {
  return ONGLETS.findIndex((o) =>
    o.exact ? chemin === o.to : chemin === o.to || chemin.startsWith(o.to + '/'),
  );
}

/** OÙ MÈNE « RETOUR ».
 *
 *  Installée sur l'écran d'accueil, l'app n'a plus de barre de navigateur :
 *  pas de flèche « précédent ». Depuis Composer, Terminer ou Noter, il ne
 *  restait que le dock — qui ramène à un onglet, pas à l'écran d'avant.
 *
 *  Le bouton remonte l'historique quand il existe. Quand il n'existe pas —
 *  on est arrivé par un lien partagé, ou par une notification — il remonte
 *  d'un cran dans l'arborescence : c'est ce chemin-là que rend la fonction.
 *  `null` : un onglet du dock, ou un écran d'entrée, n'a pas de retour. */
export function parentDe(chemin: string): string | null {
  if (ongletActif(chemin) >= 0) return null;
  if (chemin === '/connexion' || chemin === '/bienvenue') return null;
  const sousMatch = chemin.match(/^\/match\/([^/]+)\/[^/]+$/);
  if (sousMatch) return `/match/${sousMatch[1]}`;
  if (chemin.startsWith('/match/')) return '/matchs';
  if (chemin === '/equipes') return '/club';
  if (chemin.startsWith('/compte/')) return '/profil';
  return '/';
}
