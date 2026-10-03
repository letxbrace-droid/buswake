import { Icone } from './Icone';
import type { Fiabilite } from '../domaine/fiabilite';

/** LE WIDGET LAPIN — et son contraire, « Fiable ».
 *
 *  Rien pour un joueur « neutre » ou nouveau : un badge partout ne signale
 *  plus rien. Seuls les deux extrêmes se montrent, là où un organisateur
 *  décide (la liste des inscrits) et sur la carte du joueur. */
export function BadgeFiabilite({ f, plein = false }: { f: Fiabilite | undefined; plein?: boolean }) {
  if (!f || (f.statut !== 'lapin' && f.statut !== 'fiable')) return null;
  const lapin = f.statut === 'lapin';
  return (
    <span
      title={lapin ? `${f.lapins} lapin(s) sur les ${f.matchs} derniers matchs` : 'Présent à 90 % ou plus'}
      className={`inline-flex shrink-0 items-center gap-1 rounded-(--radius-pill) px-2 py-0.5 text-xs font-semibold ${
        lapin
          ? 'bg-[color-mix(in_srgb,var(--color-feu)_16%,var(--color-fond))] text-(--color-feu)'
          : 'bg-[color-mix(in_srgb,var(--color-vert)_16%,var(--color-fond))] text-(--color-vert)'
      }`}
    >
      <Icone nom={lapin ? 'lapin' : 'verifie'} taille={plein ? 16 : 14} />
      {lapin ? 'Lapin' : 'Fiable'}
    </span>
  );
}
