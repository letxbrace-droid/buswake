import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { documentClub, problemeClub, sortieDuClub, type SaisieClub } from '../domaine/creationClub';
import type { Equipe } from '../domaine/equipe';

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

/** Quitter son club, quel que soit son rôle — voir `sortieDuClub`. Le
 *  capitaine qui transmet le fait en UNE écriture (brassard + départ) : la
 *  règle du capitaine l'autorise, et deux écritures laisseraient un instant
 *  un club sans capitaine si la seconde échouait. */
export async function sortirDuClub(e: Equipe, uid: string): Promise<'quitte' | 'supprime'> {
  const s = sortieDuClub(e, uid);
  const ref = doc(db, 'equipes', e.id);
  switch (s.type) {
    case 'quitter':
      await updateDoc(ref, { membres: arrayRemove(uid) });
      return 'quitte';
    case 'transmettre':
      await updateDoc(ref, { capitaineUid: s.vers, membres: arrayRemove(uid) });
      return 'quitte';
    case 'supprimer':
      await deleteDoc(ref);
      return 'supprime';
    case 'aucune':
      throw new Error('Tu ne fais pas partie de ce club.');
  }
}
