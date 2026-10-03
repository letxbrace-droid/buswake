/**
 * Les icônes, en SVG inline.
 *
 * Inline et pas une police d'icônes ni un paquet : une police d'icônes est un
 * fichier de plus à charger avant le premier pixel, et un paquet amène
 * plusieurs centaines de glyphes pour en utiliser huit. Ici, ce qui n'est pas
 * rendu n'existe pas dans la page.
 *
 * `currentColor` partout : l'état actif de la barre change une couleur de
 * texte, l'icône suit — aucune règle en double.
 */
export type NomIcone =
  | 'accueil' | 'ballon' | 'blason' | 'message' | 'joueur'
  | 'plus' | 'calendrier' | 'recherche' | 'carte' | 'partage' | 'cloche'
  | 'toit' | 'verifie' | 'cadenas' | 'sortie' | 'poubelle' | 'crayon' | 'chevron' | 'cible' | 'lapin';

const CHEMINS: Record<NomIcone, string> = {
  accueil: 'M3 10.6 12 3l9 7.6M5.4 9.2V20a1 1 0 0 0 1 1h3.3v-5.4h4.6V21h3.3a1 1 0 0 0 1-1V9.2',
  ballon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.6 4.1 3-1.6 4.8H9.5L7.9 10.6l4.1-3Z',
  blason: 'M12 3l7 2.6v5.9c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V5.6L12 3Z',
  message: 'M4 5.5h16v10H8.6L4 19V5.5Z',
  joueur: 'M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.5 20.5a7.5 7.5 0 0 1 15 0',
  plus: 'M12 5v14M5 12h14',
  calendrier: 'M4.5 6.5h15v14h-15v-14Zm0 4.4h15M8.5 3.5v3m7-3v3',
  recherche: 'M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6Zm5-1.8L20 20',
  carte: 'M9 4.2 3.8 6.4v13.4L9 17.6l6 2.2 5.2-2.2V4.2L15 6.4 9 4.2Zm0 0v13.4m6-11v13.4',
  partage: 'M12 15.5V4m0 0L8.2 7.8M12 4l3.8 3.8M5 14v5.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V14',
  toit: 'M3.5 11 12 4.5l8.5 6.5M6 12.4v7.1h12v-7.1',
  verifie: 'M12 3.4 19 6v5.4c0 4-2.8 7.3-7 9.1-4.2-1.8-7-5.1-7-9.1V6l7-2.6Zm-2.8 8.5 2 2 3.6-3.7',
  cadenas: 'M6.5 10.5h11v9.5h-11v-9.5Zm2.5 0V7.8a3 3 0 0 1 6 0v2.7',
  sortie: 'M14 4.5H6v15h8M10.5 12H20m0 0-3.2-3.2M20 12l-3.2 3.2',
  poubelle: 'M5 7h14M9.5 7V4.8h5V7M7 7l.9 12.5h8.2L17 7M10.5 10.5v5.5m3-5.5v5.5',
  crayon: 'M4.5 19.5l1-4.2L15.8 5a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L8.7 18.5l-4.2 1Zm9.3-12.5 3.2 3.2',
  chevron: 'M9.5 6l6 6-6 6',
  cible: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Zm0-4.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3.2a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z',
  lapin: 'M9.6 10.6C8.2 8 7.6 4.4 8.8 3.5c1.3-.9 2.9 2.2 3.1 5.6m2.5 1.5c1.4-2.6 2-6.2.8-7.1-1.3-.9-2.9 2.2-3.1 5.6M12 21a5.4 5.4 0 1 0 0-10.8A5.4 5.4 0 0 0 12 21Zm-2.1-5.6h.01m4.2 0h.01M11 18.2h2',
  cloche: 'M12 3.5a5.5 5.5 0 0 0-5.5 5.5c0 5-2 6.5-2 6.5h15s-2-1.5-2-6.5A5.5 5.5 0 0 0 12 3.5ZM10.3 19a2 2 0 0 0 3.4 0',
};

/** `pleine` : l'onglet actif de la barre se remplit, comme dans la maquette —
 *  un trait qui change juste de couleur se distingue mal au pouce. */
export function Icone({
  nom, taille = 24, pleine = false, className = '',
}: {
  nom: NomIcone;
  taille?: number;
  pleine?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill={pleine ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={pleine ? 1.2 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={CHEMINS[nom]} />
    </svg>
  );
}
