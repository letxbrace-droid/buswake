import { collection, getDocs, limit, orderBy, query, where, type Query } from 'firebase/firestore';
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
    // Les deux autres requêtes sont bornées par l'utilisateur : un joueur a
    // au plus une poignée de matchs. Celle-ci, non — elle grandit avec la
    // PLATEFORME. Sans plafond, le fil télécharge tous les matchs publics du
    // pays pour en montrer trois.
    //
    // Le tri est explicite pour que la coupe soit celle qu'on veut : les 60
    // matchs les PLUS PROCHES dans le temps. Firestore ordonne déjà par
    // `finVisible` à cause de l'inégalité — l'écrire rend la borne lisible et
    // ne change pas l'index (visibilite ASC + finVisible ASC, déjà déployé).
    //
    // Limite assumée : le rayon se filtre côté client, APRÈS cette coupe. Le
    // jour où 60 matchs imminents ne suffisent plus à couvrir un rayon, il
    // faudra une vraie requête géographique (geohash), pas un plafond plus
    // haut — un plafond plus haut ne fait que déplacer le trou.
    lire(
      query(
        matchs,
        where('visibilite', '==', 'public'),
        where('finVisible', '>', maintenant),
        orderBy('finVisible', 'asc'),
        limit(60),
      ),
    ),
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
