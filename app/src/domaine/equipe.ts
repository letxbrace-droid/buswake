/** Une équipe, c'est une MOITIÉ de match : cinq joueurs affrontent cinq
 *  joueurs. L'effectif se DÉDUIT du sport, il ne se saisit pas — foot à 5 → 5,
 *  basket 3×3 → 3, padel → 2. C'est ce qui garde le modèle multi-sport alors
 *  que le produit ne parle aujourd'hui que de foot à 5. */

export const NIVEAUX = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  confirme: 'Confirmé',
} as const;
export type Niveau = keyof typeof NIVEAUX;

/** Valeurs STOCKÉES EN BASE et validées telles quelles par les règles
 *  Firestore : ce sont des littéraux, jamais des variables CSS. */
export const COULEURS_EQUIPE = [
  '#5DD62C', '#00B0FF', '#FF8A3D', '#B36BFF', '#FFD24A', '#FF5A6E',
] as const;
export type CouleurEquipe = (typeof COULEURS_EQUIPE)[number];

/** Emblèmes — des TRACÉS, pas des images, et pour une raison précise :
 *  l'emblème doit prendre la couleur de l'équipe. Une image devrait être
 *  livrée en six versions ; un tracé se recolore. Quatorze emblèmes × six
 *  couleurs = 84 fichiers évités. */
export const EMBLEMES: Record<string, string> = {
  eclair: 'M13.6 2 6 13.2h4.6L9.8 22l7.8-11.6h-4.8z',
  couronne: 'M3 8.2l4.4 3.1L12 4l4.6 7.3L21 8.2l-1.6 10.1a1.1 1.1 0 0 1-1.1 1H5.7a1.1 1.1 0 0 1-1.1-1z',
  etoile: 'M12 2.6l2.85 6.05 6.35.8-4.7 4.4 1.25 6.35L12 16.9l-5.75 3.3 1.25-6.35-4.7-4.4 6.35-.8z',
  flamme: 'M12.4 1.6c.6 3.4 3 5 4.6 7.4 1.8 2.6 1.8 6.2-.4 8.6-1.6 1.8-4 2.6-6.2 2.2 1.4-1.2 2-3 1.4-4.6-.5-1.4-1.8-2.3-2.2-3.8-.9 1.1-1.2 2.6-.9 4-1.4-1-2.3-2.7-2.3-4.5 0-2.6 1.8-4.2 3.4-6 1.2-1.3 2.2-2.3 2.6-3.3z',
  ancre: 'M12 2.2a3 3 0 0 1 1.4 5.7V10h3.2v2.6h-3.2v5.7c2.5-.5 4.3-2.3 4.8-5h2.6C20.2 18 16.6 21.8 12 21.8S3.8 18 3.2 13.3h2.6c.5 2.7 2.3 4.5 4.8 5v-5.7H7.4V10h3.2V7.9A3 3 0 0 1 12 2.2zm0 2.2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z',
  fleche: 'M12 2.4 21.6 12h-5.2v9.6H7.6V12H2.4z',
  tour: 'M4 3h3v2.4h3V3h4v2.4h3V3h3v7.2l-2 1.6V21h-4v-5.2h-4V21H6v-9.2l-2-1.6z',
  cible: 'M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zm0 3.6a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z',
  montagne: 'M2 20 9 6.4l4 7 2.2-3.6L22 20z',
  diamant: 'M6.4 2.8h11.2L22 9.2 12 21.6 2 9.2zM7.6 5.2 5 8.6h5.2zm8.8 0-2.6 3.4H19zM12 5.6 9.4 8.6h5.2zM5.6 11 12 18.9 18.4 11z',
  ballon: 'M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6zm0 5.6-3.8 2.8 1.5 4.5h4.6l1.5-4.5z',
  croix: 'M9.4 2.4h5.2v7h7v5.2h-7v7H9.4v-7h-7V9.4h7z',
};

export interface Equipe {
  readonly id: string;
  readonly nom: string;
  readonly sport?: string;
  readonly couleur?: string;
  readonly embleme?: string;
  readonly niveau?: Niveau;
  readonly membres?: readonly string[];
  readonly stats?: { victoires?: number; nuls?: number; defaites?: number; serie?: number };
}

const EFFECTIFS: Record<string, number> = { foot5: 5, foot7: 7, basket3: 3, padel: 2 };

export function effectifEquipe(e: Pick<Equipe, 'sport'>): number {
  return EFFECTIFS[e.sport ?? 'foot5'] ?? 5;
}

export type CleEtat = 'prete' | 'incomplete' | 'recherche';

/** Trois états, et c'est LE MANQUE qui les sépare — pas un pourcentage.
 *  « 80 % » ne dit rien à personne ; « il manque 1 joueur » fait décrocher
 *  le téléphone. */
export function etatEquipe(e: Equipe): { cle: CleEtat; label: string; manque: number } {
  const manque = Math.max(0, effectifEquipe(e) - (e.membres?.length ?? 0));
  if (manque === 0) return { cle: 'prete', label: 'Prête', manque: 0 };
  if (manque === 1) return { cle: 'incomplete', label: 'Il manque 1 joueur', manque: 1 };
  return { cle: 'recherche', label: `Il manque ${manque} joueurs`, manque };
}

export function initialesEquipe(nom: string): string {
  return (
    (nom || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((m) => m[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

export function couleurEquipe(e: Pick<Equipe, 'couleur'>): string {
  return e.couleur && (COULEURS_EQUIPE as readonly string[]).includes(e.couleur)
    ? e.couleur
    : COULEURS_EQUIPE[0];
}

function luminance(hex: string): number {
  const h = String(hex ?? '').replace('#', '');
  if (h.length !== 6) return 0;
  const v = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** L'encre du symbole s'adapte au fond — et on ne choisit PAS par seuil :
 *  on prend celle des deux encres qui contraste LE PLUS. Un seuil fixe
 *  laissait six blasons sur dix sous 3:1. */
export function encreBlason(fond: string): '#FFFFFF' | '#0B0E12' {
  const L = luminance(fond);
  const ct = (x: number) => (Math.max(L, x) + 0.05) / (Math.min(L, x) + 0.05);
  return ct(luminance('#FFFFFF')) >= ct(luminance('#0B0E12')) ? '#FFFFFF' : '#0B0E12';
}

export function bilanEquipe(e: Equipe) {
  const s = e.stats ?? {};
  return { v: s.victoires ?? 0, n: s.nuls ?? 0, d: s.defaites ?? 0, serie: s.serie ?? 0 };
}
