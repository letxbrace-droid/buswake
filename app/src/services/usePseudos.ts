import { useQuery } from '@tanstack/react-query';

/**
 * Les pseudos d'une liste de joueurs.
 *
 * Appelé par chaque conteneur qui connaît SA liste — le chat, la feuille de
 * match, la composition. Auparavant le shell passait une table de pseudos
 * venue des données de démonstration : en production elle était vide, et ces
 * écrans affichaient des identifiants bruts à la place des noms.
 *
 * La clé est triée pour que deux listes identiques ne se relisent pas.
 */
export function usePseudos(uids: readonly string[]): Record<string, string> {
  const cles = [...new Set(uids.filter(Boolean))].sort();
  const { data } = useQuery({
    queryKey: ['pseudos', cles.join(',')],
    enabled: cles.length > 0,
    // Un pseudo ne change presque jamais : inutile de le relire à chaque
    // ouverture d'écran.
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { lireFiches } = await import('./annuaire');
      const fiches = await lireFiches(cles);
      return Object.fromEntries(Object.entries(fiches).map(([u, f]) => [u, f.pseudo]));
    },
  });
  return data ?? {};
}
