import { collection, doc, documentId, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { JoueurClasse } from '../domaine/classement';
import type { Equipe } from '../domaine/equipe';

/**
 * Les trois lectures collectives : les équipes, le classement, et les pseudos.
 *
 * Elles manquaient — et c'est ce qui rendait la moitié de l'app vide sur un
 * vrai téléphone : les écrans recevaient les données de DÉMONSTRATION, qui
 * n'existent qu'en développement. En production `equipesDemo` valait `[]` et
 * `amisDemo` valait `null` : « Aucune équipe » s'affichait toujours, et
 * l'onglet Joueurs ne rendait rien du tout.
 */

/** Toutes les équipes. Les règles autorisent `list` à tout connecté.
 *  Bornée : le jour où il y en a mille, on n'en télécharge pas mille. */
export async function listerEquipes(): Promise<Equipe[]> {
  const snap = await getDocs(query(collection(db, 'equipes'), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Equipe);
}

/**
 * Le classement des joueurs.
 *
 * Bornée à 200, comme en v1 : lire la collection `users` entière pour en
 * afficher dix, c'est mille documents téléchargés à mille inscrits.
 *
 * Limite assumée et VISIBLE dans le produit : au-delà de 200 comptes, ce
 * classement n'est plus celui de tous les joueurs. Le corriger demande un
 * tri côté serveur (`orderBy('xp','desc')`) — qui exige un index et de
 * décider ce qu'on fait des comptes sans XP. À trancher avant d'y arriver,
 * pas après.
 */
export async function listerJoueurs(): Promise<JoueurClasse[]> {
  const snap = await getDocs(query(collection(db, 'users'), limit(200)));
  return snap.docs.map((d) => {
    const v = d.data();
    return {
      id: d.id,
      pseudo: typeof v.pseudo === 'string' ? v.pseudo : 'Joueur',
      xp: typeof v.xp === 'number' ? v.xp : 0,
      streak: typeof v.streak === 'number' ? v.streak : 0,
      stats: { hommeDuMatch: Number(v.stats?.hommeDuMatch ?? 0) },
    };
  });
}

export interface FicheJoueur {
  readonly uid: string;
  readonly pseudo: string;
  readonly xp: number;
}

/** Firestore refuse plus de 30 valeurs dans un `in`. On découpe. */
const PAR_LOT = 30;

/**
 * Les pseudos d'un ensemble d'identifiants — pour le chat, la feuille de
 * match, la composition, la liste d'amis.
 *
 * Sans ça, ces écrans affichaient des identifiants bruts, ou rien.
 */
export async function lireFiches(uids: readonly string[]): Promise<Record<string, FicheJoueur>> {
  const uniques = [...new Set(uids.filter(Boolean))];
  if (!uniques.length) return {};

  const lots: string[][] = [];
  for (let i = 0; i < uniques.length; i += PAR_LOT) lots.push(uniques.slice(i, i + PAR_LOT));

  const fiches: Record<string, FicheJoueur> = {};
  await Promise.all(
    lots.map(async (lot) => {
      // Une requête refusée ne doit pas vider tout l'annuaire : les autres
      // lots restent utiles, et un pseudo manquant vaut mieux qu'un écran
      // vide.
      const snap = await getDocs(
        query(collection(db, 'users'), where(documentId(), 'in', lot)),
      ).catch(() => null);
      for (const d of snap?.docs ?? []) {
        const v = d.data();
        fiches[d.id] = {
          uid: d.id,
          pseudo: typeof v.pseudo === 'string' ? v.pseudo : d.id,
          xp: typeof v.xp === 'number' ? v.xp : 0,
        };
      }
    }),
  );
  return fiches;
}

/** Une fiche seule — pour un joueur qu'on vient de trouver par pseudo. */
export async function lireFiche(uid: string): Promise<FicheJoueur | null> {
  const d = await getDoc(doc(db, 'users', uid)).catch(() => null);
  if (!d?.exists()) return null;
  const v = d.data();
  return {
    uid: d.id,
    pseudo: typeof v.pseudo === 'string' ? v.pseudo : d.id,
    xp: typeof v.xp === 'number' ? v.xp : 0,
  };
}
