import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreerClub } from '../ecrans/CreerClub';
import { useAction } from '../services/useAction';
import { peutCreerUnClub, type SaisieClub } from '../domaine/creationClub';

export function CreerClubBranche({ uid }: { uid: string | null }) {
  const aller = useNavigate();
  const { data: equipes } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => (await import('../services/annuaire')).listerEquipes(),
  });
  // En développement seulement : `?apercu` montre le formulaire même si le
  // joueur de démonstration a déjà un club — sinon les sondes ne mesurent
  // que le message de blocage, jamais les champs.
  const [params] = useSearchParams();
  const apercu = import.meta.env.DEV && params.has('apercu');
  const adhesion = apercu ? { peut: true as const } : peutCreerUnClub(equipes ?? [], uid);

  const action = useAction(
    async (s: SaisieClub) => (await import('../services/equipes')).creerClub(s, uid ?? ''),
    {
      succes: () => 'Club créé. Invite tes joueurs !',
      invalider: [['equipes']],
      apres: () => aller('/club', { replace: true }),
    },
  );

  return (
    <CreerClub
      occupe={action.occupe}
      bloque={adhesion.peut ? null : adhesion.pourquoi}
      onCreer={action.lancer}
      onVoirMonClub={() => aller('/club')}
    />
  );
}
