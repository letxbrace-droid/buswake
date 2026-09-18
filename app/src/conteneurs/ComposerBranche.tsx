import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { ComposerEquipes } from '../ecrans/ComposerEquipes';
import { useAction } from '../services/useAction';
import { enregistrerComposition } from '../services/cycle';
import type { Camp } from '../domaine/composition';

export function ComposerBranche({
  uid, pseudos,
}: {
  uid: string;
  pseudos: Record<string, string>;
}) {
  const { id = '' } = useParams();
  const aller = useNavigate();

  const { data } = useQuery({
    queryKey: ['composer', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'matchs', id));
      const d = snap.data() ?? {};
      return {
        inscrits: (d.joueursInscrits ?? []) as string[],
        camps: (d.equipes ?? []) as Camp[],
      };
    },
  });

  const action = useAction((camps: Camp[]) => enregistrerComposition(id, camps), {
    succes: () => 'Équipes enregistrées.',
    invalider: [['composer', id], ['match', id], ['terminer', id], ['fil', uid]],
    apres: () => aller(`/match/${id}`, { replace: true }),
  });

  if (!data) return null;

  return (
    <ComposerEquipes
      inscrits={data.inscrits}
      pseudos={pseudos}
      campsInitiaux={data.camps}
      occupe={action.occupe}
      onEnregistrer={action.lancer}
    />
  );
}
