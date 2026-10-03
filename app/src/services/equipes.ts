import { addDoc, arrayRemove, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { documentClub, problemeClub, type SaisieClub } from '../domaine/creationClub';

/** Crée le club. Validation AVANT le réseau : un refus de règle est opaque,
 *  `problemeClub` dit quoi corriger. */
export async function creerClub(s: SaisieClub, uid: string): Promise<string> {
  const p = problemeClub(s);
  if (p) throw new Error(p);
  const ref = await addDoc(collection(db, 'equipes'), { ...documentClub(s, uid), creeLe: serverTimestamp() });
  return ref.id;
}

/** S'ajouter soi-même : `arrayUnion` ajoute exactement un uid, ce que la
 *  règle `rejointOuQuitte()` exige (taille + 1, le reste inchangé). */
export async function rejoindreClub(id: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'equipes', id), { membres: arrayUnion(uid) });
}

export async function quitterClub(id: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'equipes', id), { membres: arrayRemove(uid) });
}
