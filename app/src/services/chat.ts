import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { MESSAGES_GARDES, rangerMessages, type Message } from '../domaine/chat';

/** Les messages vivent dans une sous-collection `matchs/{id}/messages`.
 *
 *  Les noms de champs ne sont PAS négociables : la règle Firestore exige
 *  `uid` et `text`, et refuse l'écriture en bloc si l'un manque. Renommer
 *  ici pour faire plus joli casserait le chat sans aucun message d'erreur
 *  utile — juste un « permission denied ».
 */
export function ecouterMessages(
  matchId: string,
  onMessages: (m: Message[]) => void,
): () => void {
  // Borné, et borné DANS LE BON SENS. Une écoute temps réel sans plafond
  // relit tout l'historique du fil à chaque message ; sur un match bavard,
  // ça se facture et ça rame.
  //
  // Le tri est donc DESCENDANT avec `limit` — c'est ce qui garde les 100
  // messages les plus RÉCENTS. Trié ascendant, la même limite garderait les
  // 100 PREMIERS : le chat se figerait sur le début de la conversation et
  // les nouveaux messages n'arriveraient jamais. On remet dans l'ordre de
  // lecture ici, côté client, où ça ne coûte rien.
  const q = query(
    collection(db, 'matchs', matchId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(MESSAGES_GARDES),
  );
  return onSnapshot(
    q,
    (snap) => {
      onMessages(rangerMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    },
    () => onMessages([]),
  );
}

export async function envoyerMessage(
  matchId: string,
  uid: string,
  texte: string,
): Promise<void> {
  await addDoc(collection(db, 'matchs', matchId, 'messages'), {
    uid,
    text: texte,
    createdAt: serverTimestamp(),
  });
}
