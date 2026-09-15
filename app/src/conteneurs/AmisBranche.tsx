import { useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import { Amis, type JoueurTrouve } from '../ecrans/Amis';
import { useAction } from '../services/useAction';
import * as social from '../services/social';
import type { RelationsJoueur } from '../domaine/social';

export function AmisBranche({
  uid, relations, annuaire,
}: {
  uid: string;
  relations: RelationsJoueur;
  annuaire: Record<string, JoueurTrouve>;
}) {
  const [resultats, setResultats] = useState<JoueurTrouve[]>([]);
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
      annuaire={annuaire}
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
