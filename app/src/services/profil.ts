import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { UtilisateurSchema, type Utilisateur } from '../domaine/schemas';

/** Le profil du joueur connecté, en TEMPS RÉEL.
 *
 *  C'est un onSnapshot et pas un getDoc, pour une raison précise : l'XP, les
 *  badges et les statistiques sont écrits par les Cloud Functions, APRÈS
 *  l'action du joueur. Avec une lecture ponctuelle, le profil resterait figé
 *  sur les valeurs d'avant-match jusqu'au prochain rechargement — et le
 *  joueur croirait n'avoir rien gagné.
 */
export function ecouterProfil(
  uid: string,
  onProfil: (u: Utilisateur | null) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return onProfil(null);
      const r = UtilisateurSchema.safeParse({ ...snap.data(), uid });
      // Un document écrit par une version plus ancienne peut manquer d'un
      // champ : on ne fait pas tomber l'écran pour autant.
      onProfil(r.success ? r.data : null);
    },
    () => onProfil(null),
  );
}

/** Champs que le joueur a le droit de modifier lui-même.
 *  Tout ce qui touche au jeu (xp, badges, stats, streak) en est absent, et
 *  les règles Firestore le refusent de toute façon — mais le dire ici évite
 *  d'écrire du code qui sera rejeté au dernier moment. */
export interface ModifProfil {
  pseudo?: string;
  posteFavori?: string;
  codePostal?: string | null;
  atouts?: { vitesse: number; dribble: number; frappe: number; defense: number; physique: number };
  profilComplet?: boolean;
}

export async function majProfil(uid: string, champs: ModifProfil): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...champs });
}
