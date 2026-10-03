/** LA FIABILITÉ — pour repérer les poseurs de lapin.
 *
 *  Pas un seuil d'XP : un habitué à 5000 XP qui pose des lapins resterait
 *  tout en haut. On regarde les DIX DERNIERS matchs, écrits par le serveur
 *  dans `historique` : J joué, L lapin, D désistement tardif (< 24 h).
 *
 *  La fenêtre glisse : quelques matchs honorés effacent le widget. Une marque
 *  définitive décourage au lieu de corriger. */
export type Issue = 'J' | 'L' | 'D';

export const SEUILS = {
  /** En dessous de ce nombre de matchs, on ne juge pas. */
  minimum: 3,
  fiable: 0.9,
  lapin: 0.7,
  /** Deux lapins sur les dix derniers suffisent, même avec un bon taux. */
  lapinsRecents: 2,
} as const;

export type StatutFiabilite = 'nouveau' | 'fiable' | 'neutre' | 'lapin';

export interface Fiabilite {
  readonly statut: StatutFiabilite;
  /** De 0 à 1 ; `null` sous le minimum. */
  readonly taux: number | null;
  readonly lapins: number;
  readonly matchs: number;
}

export function fiabilite(historique: readonly string[] | undefined): Fiabilite {
  const h = (historique ?? []).filter((x): x is Issue => x === 'J' || x === 'L' || x === 'D').slice(-10);
  const joues = h.filter((x) => x === 'J').length;
  const lapins = h.filter((x) => x === 'L').length;
  if (h.length < SEUILS.minimum) return { statut: 'nouveau', taux: null, lapins, matchs: h.length };
  const taux = joues / h.length;
  const statut: StatutFiabilite =
    taux < SEUILS.lapin || lapins >= SEUILS.lapinsRecents ? 'lapin' : taux >= SEUILS.fiable ? 'fiable' : 'neutre';
  return { statut, taux, lapins, matchs: h.length };
}

export function libelleFiabilite(f: Fiabilite): string {
  if (f.statut === 'nouveau') return 'Pas encore assez de matchs';
  const pct = Math.round((f.taux ?? 0) * 100);
  if (f.statut === 'lapin') return `${f.lapins} lapin${f.lapins > 1 ? 's' : ''} récent${f.lapins > 1 ? 's' : ''} · ${pct} % de présence`;
  return `${pct} % de présence sur ${f.matchs} matchs`;
}
