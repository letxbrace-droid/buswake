import { useQuery } from '@tanstack/react-query';
import { Equipes } from '../ecrans/Equipes';

/** L'écran Équipes recevait `equipesDemo`, qui vaut `[]` hors développement :
 *  « Aucune équipe » s'affichait donc toujours, même avec des équipes en
 *  base. */
export function EquipesBranche() {
  const { data } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => (await import('../services/annuaire')).listerEquipes(),
  });
  return <Equipes equipes={data ?? []} />;
}
