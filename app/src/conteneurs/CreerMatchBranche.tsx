import { useNavigate } from 'react-router-dom';
import { CreerMatch } from '../ecrans/CreerMatch';
import { useAction } from '../services/useAction';
import { creer } from '../services/cycle';
import type { Position } from '../domaine/rayon';
import type { CreerMatch as Saisie } from '../domaine/schemas';

export function CreerMatchBranche({ uid, domicile }: { uid: string; domicile: Position | null }) {
  const aller = useNavigate();

  const action = useAction((v: Saisie) => creer(v, uid), {
    succes: () => 'Match proposé. Les autres peuvent voter.',
    invalider: [['fil', uid]],
    // On ouvre directement le match créé : le créateur veut le partager, pas
    // le retrouver dans une liste.
    apres: (id) => aller(`/match/${id}`, { replace: true }),
  });

  return (
    <CreerMatch domicile={domicile} occupe={action.occupe} onCreer={action.lancer} />
  );
}
