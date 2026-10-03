import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Equipes } from '../ecrans/Equipes';
import { useAction } from '../services/useAction';

/** L'écran Équipes recevait `equipesDemo`, qui vaut `[]` hors développement :
 *  « Aucune équipe » s'affichait donc toujours, même avec des équipes en
 *  base. */
export function EquipesBranche({ uid }: { uid: string | null }) {
  const aller = useNavigate();
  const { data } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => (await import('../services/annuaire')).listerEquipes(),
  });

  const rejoindre = useAction(
    async (id: string) => (await import('../services/equipes')).rejoindreClub(id, uid ?? ''),
    {
      succes: () => 'Bienvenue dans ton nouveau club !',
      invalider: [['equipes']],
      apres: () => aller('/club'),
    },
  );

  return (
    <Equipes
      equipes={data ?? []}
      uid={uid}
      occupe={rejoindre.occupe}
      onCreer={() => aller('/club/creer')}
      onRejoindre={rejoindre.lancer}
    />
  );
}
