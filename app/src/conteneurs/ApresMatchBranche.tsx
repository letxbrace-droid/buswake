import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { ApresMatch } from '../ecrans/ApresMatch';
import { useAction } from '../services/useAction';
import * as social from '../services/social';
import type { Notes, VotesMotm } from '../domaine/social';

export function ApresMatchBranche({
  uid, pseudos,
}: {
  uid: string;
  pseudos: Record<string, string>;
}) {
  const { id = '' } = useParams();

  const { data } = useQuery({
    queryKey: ['apres', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'matchs', id));
      const d = snap.data() ?? {};
      return {
        inscrits: (d.joueursInscrits ?? []) as string[],
        ratings: (d.ratings ?? {}) as Record<string, Notes>,
        votes: (d.motmVotes ?? {}) as VotesMotm,
      };
    },
  });

  const rafraichir = [['apres', id]] as const;

  const noter = useAction((n: Notes) => social.envoyerNotes(id, uid, n), {
    succes: () => 'Notes envoyées — 10 XP en route.',
    invalider: rafraichir,
  });

  const voter = useAction((cible: string) => social.voterMotm(id, uid, cible), {
    invalider: rafraichir,
  });

  if (!data) return null;

  return (
    <ApresMatch
      inscrits={data.inscrits}
      pseudos={pseudos}
      monUid={uid}
      ratings={data.ratings}
      votesInitiaux={data.votes}
      onNoter={noter.lancer}
      onVoterMotm={voter.lancer}
    />
  );
}
