/** Les cinq atouts de la carte joueur. Ils sont saisis par le joueur
 *  lui-même — c'est une carte d'identité, pas une évaluation. Rien ici
 *  n'alimente le classement : l'XP seule le fait, et elle vient du serveur. */
export interface Atouts {
  vitesse: number;
  dribble: number;
  frappe: number;
  defense: number;
  physique: number;
}

export const ATOUT_DEFAUT = 70;

export const ATOUTS_LABELS: Record<keyof Atouts, string> = {
  vitesse: 'Vitesse',
  dribble: 'Dribble',
  frappe: 'Frappe',
  defense: 'Défense',
  physique: 'Physique',
};

export function noteGlobale(a?: Partial<Atouts> | null): number {
  const v = {
    vitesse: ATOUT_DEFAUT, dribble: ATOUT_DEFAUT, frappe: ATOUT_DEFAUT,
    defense: ATOUT_DEFAUT, physique: ATOUT_DEFAUT, ...(a ?? {}),
  };
  return Math.round(
    (v.vitesse + v.dribble + v.frappe + v.defense + v.physique) / 5,
  );
}

export type Tier = 'or' | 'argent' | 'bronze';

export interface InfoTier {
  readonly cle: Tier;
  readonly label: string;
  readonly couleur: string;
  readonly fond: string;
}

/** Trois paliers, aux seuils de la v1. Le tier ne change QUE le chiffre et
 *  le liseré du bas : la carte reste la même carte, sinon on obtient trois
 *  produits différents au lieu de trois niveaux du même. */
export function tierDe(note: number): InfoTier {
  if (note >= 85) {
    return { cle: 'or', label: 'OR', couleur: '#FFD700', fond: 'linear-gradient(160deg,#4A3B00,#171307)' };
  }
  if (note >= 75) {
    return { cle: 'argent', label: 'ARGENT', couleur: '#C6D2D8', fond: 'linear-gradient(160deg,#2C343A,#12161A)' };
  }
  return { cle: 'bronze', label: 'BRONZE', couleur: '#D08A3C', fond: 'linear-gradient(160deg,#3D2410,#170F07)' };
}

export const POSTES = [
  { id: 'gardien', abbr: 'GK', label: 'Gardien' },
  { id: 'defenseur', abbr: 'DEF', label: 'Défenseur' },
  { id: 'milieu', abbr: 'MIL', label: 'Milieu' },
  { id: 'attaquant', abbr: 'ATT', label: 'Attaquant' },
] as const;

export type PosteId = (typeof POSTES)[number]['id'];

export function posteDe(id?: string) {
  return POSTES.find((p) => p.id === id) ?? POSTES[2];
}

export function initiales(pseudo: string): string {
  return (pseudo || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0] ?? '')
    .join('')
    .toUpperCase() || '?';
}
