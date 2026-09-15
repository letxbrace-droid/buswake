import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/client';
import { versDate } from '../domaine/match';
import type { Message } from '../domaine/chat';

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
  const q = query(collection(db, 'matchs', matchId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onMessages(
        snap.docs.map((d) => ({
          id: d.id,
          auteur: String(d.data().uid ?? ''),
          texte: String(d.data().text ?? ''),
          quand: versDate(d.data().createdAt),
        })),
      );
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
