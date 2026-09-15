import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import { lireMatch, type Match } from '../domaine/schemas';
import { peutCreerUnMatch, type Eligibilite } from '../domaine/match';

/** Couche service : elle parle à Firestore et rend des objets du domaine.
 *  Aucun composant React n'importe `firebase/firestore` directement — c'est
 *  ce qui garde la logique testable sans réseau et remplaçable sans toucher
 *  à l'interface. */

/** Mes matchs encore à l'horizon. Requête BORNÉE, jamais la collection :
 *  `allow list` exige que chaque document rendu soit autorisé, donc lire tout
 *  échoue dès qu'un match d'un tiers existe. L'index composite
 *  (joueursInscrits CONTAINS + finVisible ASC) est déjà déployé. */
export async function mesMatchsAVenir(uid: string): Promise<Match[]> {
  if (!uid) return [];
  const q = query(
    collection(db, 'matchs'),
    where('joueursInscrits', 'array-contains', uid),
    where('finVisible', '>', new Date()),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => lireMatch(d.id, d.data()))
    .filter((m): m is Match => m !== null);
}

export async function eligibiliteCreation(
  uid: string,
  formaterDate?: (d: unknown) => string,
): Promise<Eligibilite> {
  const mes = await mesMatchsAVenir(uid);
  return peutCreerUnMatch(uid, mes, new Date(), formaterDate);
}
