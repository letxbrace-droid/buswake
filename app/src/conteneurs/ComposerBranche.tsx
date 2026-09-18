import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { ComposerEquipes } from '../ecrans/ComposerEquipes';
import { useAction } from '../services/useAction';
import { enregistrerComposition } from '../services/cycle';
import type { Camp } from '../domaine/composition';
import { usePseudos } from '../services/usePseudos';

export function ComposerBranche({ uid }: { uid: string }) {
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


  // Les pseudos se lisent ICI, où l'on connaît la liste des joueurs. Le
  // shell passait une table venue des données de démonstration : vide en
  // production, elle faisait afficher des identifiants bruts.
  const pseudos = usePseudos(data?.inscrits ?? []);

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
