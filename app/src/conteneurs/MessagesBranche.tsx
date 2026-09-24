import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Messages } from '../ecrans/Messages';
import { mesFils } from '../domaine/messagerie';

/** Même clé de cache que l'accueil et l'écran Matchs : une seule lecture du
 *  fil pour les trois, et surtout pas trois vérités. */
export function MessagesBranche({ uid }: { uid: string | null }) {
  const aller = useNavigate();
  const { data } = useQuery({
    queryKey: ['fil', uid],
    queryFn: async () => (await import('../services/fil')).filDeMatchs(uid),
  });
  const fils = useMemo(() => mesFils(data ?? [], uid), [data, uid]);

  return <Messages fils={fils} onOuvrir={(id) => aller(`/match/${id}/chat`)} />;
}
