import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { basculerVoteMotm, type Notes, type VotesMotm } from '../domaine/social';

/** Écritures sociales.
 *
 *  Les règles Firestore n'autorisent un client à modifier chez QUELQU'UN
 *  D'AUTRE que `friends`, `friendRequestsSent` et `friendRequestsReceived`.
 *  Toute écriture d'un autre champ dans le document d'un tiers est refusée en
 *  bloc — c'est ce qui permet d'avoir des demandes d'ami sans ouvrir l'accès
 *  à l'XP de la personne.
 */

export async function envoyerDemande(monUid: string, cible: string): Promise<void> {
  // Deux écritures, deux documents. arrayUnion et non une réécriture : deux
  // personnes qui envoient une demande en même temps ne doivent pas
  // s'effacer l'une l'autre.
  await updateDoc(doc(db, 'users', monUid), { friendRequestsSent: arrayUnion(cible) });
  await updateDoc(doc(db, 'users', cible), { friendRequestsReceived: arrayUnion(monUid) });
}

export async function accepterDemande(monUid: string, depuis: string): Promise<void> {
  await updateDoc(doc(db, 'users', monUid), {
    friends: arrayUnion(depuis),
    friendRequestsReceived: arrayRemove(depuis),
  });
  await updateDoc(doc(db, 'users', depuis), {
    friends: arrayUnion(monUid),
    friendRequestsSent: arrayRemove(monUid),
  });
}

/** Retirer un ami se fait DES DEUX CÔTÉS. Ne nettoyer que son propre
 *  document laisserait l'autre avec un ami fantôme, et le lien réapparaîtrait
 *  au prochain calcul. */
export async function retirerAmi(monUid: string, autre: string): Promise<void> {
  await updateDoc(doc(db, 'users', monUid), { friends: arrayRemove(autre) });
  await updateDoc(doc(db, 'users', autre), { friends: arrayRemove(monUid) });
}

/** Les notes partent en UN SEUL champ `ratings.<monUid>` : c'est ce qui rend
 *  l'opération idempotente côté Cloud Function, qui n'accorde les 10 XP
 *  qu'une fois par joueur et par match. */
export async function envoyerNotes(matchId: string, monUid: string, notes: Notes): Promise<void> {
  await updateDoc(doc(db, 'matchs', matchId), { [`ratings.${monUid}`]: notes });
}

/** Le vote MOTM réécrit la carte complète des voix, et c'est délibéré : il
 *  faut retirer la voix précédente ET ajouter la nouvelle dans la même
 *  écriture, sinon un votant qui change d'avis compte deux fois le temps que
 *  la seconde écriture arrive. */
export async function voterMotm(matchId: string, monUid: string, cible: string): Promise<void> {
  const snap = await getDoc(doc(db, 'matchs', matchId));
  const votes = (snap.data()?.motmVotes ?? {}) as VotesMotm;
  await updateDoc(doc(db, 'matchs', matchId), {
    motmVotes: basculerVoteMotm(votes, cible, monUid),
  });
}
