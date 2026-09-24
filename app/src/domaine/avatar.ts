/**
 * LES AVATARS, SANS PHOTO.
 *
 * La maquette montre des photos de joueurs. Il n'existe ni champ ni stockage
 * pour ça, et en inventer serait pire que de s'en passer. On pose donc des
 * initiales sur une pastille colorée — c'est ce que fait déjà la carte FUT.
 *
 * La couleur est DÉRIVÉE de l'identifiant, pas tirée au sort : le même joueur
 * doit avoir la même pastille d'un écran à l'autre et d'une session à
 * l'autre. Une couleur aléatoire ferait clignoter les visages de la liste à
 * chaque rendu.
 */

/** Teintes espacées sur le cercle chromatique, toutes assez sombres pour que
 *  du blanc passe dessus. Le contraste est mesuré par le test. */
export const TEINTES = [
  '#2F6F4E', '#1F5673', '#6A3E7A', '#7A4A2B',
  '#2E4C8A', '#7A3244', '#3E6B2A', '#5A4B1F',
] as const;

/** Hachage stable et court — on ne cherche pas à être cryptographique, on
 *  cherche à rendre TOUJOURS la même couleur pour la même personne. */
function empreinte(cle: string): number {
  let h = 0;
  for (let i = 0; i < cle.length; i++) h = (h * 31 + cle.charCodeAt(i)) >>> 0;
  return h;
}

export function couleurAvatar(cle: string): string {
  return TEINTES[empreinte(cle || '?') % TEINTES.length];
}

/**
 * Une ou deux lettres. Deux mots donnent leurs deux initiales (« Jean
 * Dupont » → JD) ; un seul mot donne ses deux premières lettres, ce qui
 * distingue « Sam » de « Sasha » là où une seule lettre les confondrait.
 */
export function initiales(nom: string): string {
  const mots = (nom ?? '').trim().split(/[\s-]+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

export interface Place {
  readonly uid: string;
  readonly pseudo: string;
}

export interface RangeeAvatars {
  readonly montres: readonly Place[];
  /** Combien ne tiennent pas dans la rangée — affichés en « +N ». */
  readonly reste: number;
  /** Places encore libres, en pastilles vides : la maquette les montre, et
   *  c'est ce qui donne envie de les prendre. */
  readonly libres: number;
}

export function rangerAvatars(
  joueurs: readonly Place[],
  total: number,
  maxVisibles = 4,
): RangeeAvatars {
  const montres = joueurs.slice(0, maxVisibles);
  return {
    montres,
    reste: Math.max(0, joueurs.length - montres.length),
    libres: Math.max(0, Math.min(3, total - joueurs.length)),
  };
}
