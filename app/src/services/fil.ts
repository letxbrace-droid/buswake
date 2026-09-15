import { collection, getDocs, limit, query, where, type Query } from 'firebase/firestore';
import { db } from '../firebase/client';
import { lireMatch, type Match } from '../domaine/schemas';

/**
 * Le fil de matchs — TROIS REQUÊTES BORNÉES, jamais un balayage.
 *
 * Deux principes, sans lesquels le produit ne dépasse pas le stade du dépôt :
 *   1. on ne lit que les matchs encore d'actualité (finVisible > maintenant) ;
 *   2. la découverte ne voit que les matchs 'public' — les matchs privés
 *      n'arrivent que par la requête de participation.
 *
 * Ce sont exactement les requêtes que les règles autorisent. Une requête plus
 * large serait refusée EN BLOC par Firestore : `allow list` exige que chaque
 * document rendu soit lisible, donc un seul match privé d'un tiers dans la
 * portée fait échouer le tout.
 */
export async function filDeMatchs(uid: string | null): Promise<Match[]> {
  const maintenant = new Date();
  const matchs = collection(db, 'matchs');

  // Une requête refusée rend une liste vide plutôt que de faire tomber
  // l'écran : les deux autres piles restent utiles.
  const lire = async (q: Query): Promise<Match[]> => {
    try {
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => lireMatch(d.id, d.data()))
        .filter((m): m is Match => m !== null);
    } catch {
      return [];
    }
  };

  const [publics, miens, histo] = await Promise.all([
    lire(query(matchs, where('visibilite', '==', 'public'), where('finVisible', '>', maintenant))),
    uid
      ? lire(
          query(
            matchs,
            where('joueursInscrits', 'array-contains', uid),
            where('finVisible', '>', maintenant),
          ),
        )
      : Promise.resolve([]),
    uid
      ? lire(
          query(
            matchs,
            where('joueursInscrits', 'array-contains', uid),
            where('statut', '==', 'terminé'),
            limit(20),
          ),
        )
      : Promise.resolve([]),
  ]);

  // Un match public où je joue remonte dans les deux premières requêtes.
  const parId = new Map<string, Match>();
  for (const m of [...publics, ...miens, ...histo]) parId.set(m.id, m);
  return [...parId.values()];
}
