import { useQuery } from '@tanstack/react-query';
import { Classement } from '../ecrans/Classement';

/** Même défaut que les équipes : le classement recevait des listes de
 *  démonstration, vides en production. */
export function ClassementBranche({ uid }: { uid: string }) {
  const { data: joueurs } = useQuery({
    queryKey: ['joueurs'],
    queryFn: async () => (await import('../services/annuaire')).listerJoueurs(),
  });
  const { data: equipes } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => (await import('../services/annuaire')).listerEquipes(),
  });
  return <Classement uid={uid} joueurs={joueurs ?? []} equipes={equipes ?? []} />;
}
