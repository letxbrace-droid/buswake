import { useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import { Amis, type JoueurTrouve } from '../ecrans/Amis';
import { useAction } from '../services/useAction';
import * as social from '../services/social';
import type { RelationsJoueur } from '../domaine/social';
import { useQuery } from '@tanstack/react-query';

export function AmisBranche({
  uid, relations,
}: {
  uid: string;
  relations: RelationsJoueur;
}) {
  const [resultats, setResultats] = useState<JoueurTrouve[]>([]);

  // L'annuaire se construit ICI, à partir des relations du joueur. Le shell
  // passait celui des données de démonstration — `null` en production, si
  // bien que la route ne rendait RIEN DU TOUT : écran noir.
  const uids = [
    ...(relations.friends ?? []),
    ...(relations.friendRequestsSent ?? []),
    ...(relations.friendRequestsReceived ?? []),
  ];
  const { data: annuaire } = useQuery({
    queryKey: ['annuaire', [...new Set(uids)].sort().join(',')],
    enabled: uids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => (await import('../services/annuaire')).lireFiches(uids),
  });
  const rafraichir = [['profil', uid]] as const;

  /** Recherche par pseudo EXACT et bornée à dix. Les règles n'autorisent pas
   *  de balayer la collection des utilisateurs, et c'est heureux : une
   *  recherche floue sur tous les comptes serait un annuaire ouvert. */
  const chercher = useAction(
    async (terme: string) => {
      if (!terme) return [] as JoueurTrouve[];
      const snap = await getDocs(
        query(collection(db, 'users'), where('pseudo', '==', terme), limit(10)),
      );
      return snap.docs
        .map((d) => ({ uid: d.id, pseudo: d.data().pseudo ?? d.id, xp: d.data().xp ?? 0 }))
        .filter((j) => j.uid !== uid);
    },
    { apres: setResultats },
  );

  const ajouter = useAction((cible: string) => social.envoyerDemande(uid, cible), {
    succes: () => 'Demande envoyée.',
    invalider: rafraichir,
  });

  const accepter = useAction((depuis: string) => social.accepterDemande(uid, depuis), {
    succes: () => 'Vous êtes amis.',
    invalider: rafraichir,
  });

  const retirer = useAction((autre: string) => social.retirerAmi(uid, autre), {
    succes: () => 'Ami retiré.',
    invalider: rafraichir,
  });

  return (
    <Amis
      monUid={uid}
      relations={relations}
      annuaire={annuaire ?? {}}
      resultats={resultats}
      enRecherche={chercher.occupe}
      actions={{
        onChercher: chercher.lancer,
        onAjouter: ajouter.lancer,
        onAccepter: accepter.lancer,
        onRetirer: retirer.lancer,
      }}
    />
  );
}
