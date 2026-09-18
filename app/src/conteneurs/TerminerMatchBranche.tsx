import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { TerminerMatch } from '../ecrans/TerminerMatch';
import { Plaque } from '../composants/Plaque';
import { useAction } from '../services/useAction';
import { terminer } from '../services/cycle';
import { peutTerminer, type Resultat } from '../domaine/fin';
import { lireMatch } from '../domaine/schemas';
import type { Camp } from '../domaine/composition';
import { usePseudos } from '../services/usePseudos';

export function TerminerMatchBranche({ uid }: { uid: string }) {
  const { id = '' } = useParams();
  const aller = useNavigate();

  const { data, isPending } = useQuery({
    queryKey: ['terminer', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'matchs', id));
      if (!snap.exists()) return null;
      const d = snap.data();
      const m = lireMatch(id, d);
      return m ? { m, camps: (d.equipes ?? []) as Camp[] } : null;
    },
  });


  // Les pseudos se lisent ICI, où l'on connaît la liste des joueurs. Le
  // shell passait une table venue des données de démonstration : vide en
  // production, elle faisait afficher des identifiants bruts.
  const pseudos = usePseudos(data?.m?.joueursInscrits ?? []);

  const action = useAction((r: Resultat) => terminer(id, r), {
    succes: () => 'Résultat enregistré. L’XP part du serveur.',
    invalider: [['match', id], ['fil', uid], ['apres', id]],
    // On enchaîne sur la notation : c'est le moment où les joueurs y
    // pensent encore. Le leur demander demain, c'est ne pas l'obtenir.
    apres: () => aller(`/match/${id}/apres`, { replace: true }),
  });

  if (isPending) return null;
  if (!data) return <Message titre="Match introuvable" />;
  if (!peutTerminer(data.m)) {
    return (
      <Message
        titre="Ce match ne peut pas être terminé"
        sous={
          data.m.statut === 'terminé'
            ? 'Il est déjà terminé.'
            : 'Seul un match confirmé se termine — celui-ci cherche encore son créneau.'
        }
      />
    );
  }

  return (
    <TerminerMatch
      inscrits={data.m.joueursInscrits ?? []}
      pseudos={pseudos}
      camps={data.camps.length ? data.camps : undefined}
      occupe={action.occupe}
      onValider={action.lancer}
    />
  );
}

function Message({ titre, sous }: { titre: string; sous?: string }) {
  return (
    <div className="terrain terrain-matchs min-h-full px-4 pt-6">
      <Plaque className="p-8 text-center">
        <p className="font-[family-name:var(--font-titre)] text-xl">{titre}</p>
        {sous && <p className="mt-2 text-sm text-(--color-encre-sec)">{sous}</p>}
      </Plaque>
    </div>
  );
}
