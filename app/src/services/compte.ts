import {
  deleteUser, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential,
  reauthenticateWithPopup, updatePassword,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { estCompteGooglePur, type ChangementMdp } from '../domaine/compte';

function utilisateur() {
  const u = auth.currentUser;
  if (!u) throw new Error('Tu n’es plus connecté.');
  return u;
}

export function fournisseurs(): string[] {
  return (auth.currentUser?.providerData ?? []).map((p) => p.providerId);
}

/** Se ré-authentifier. Firebase l'exige pour les actions sensibles quand la
 *  session date un peu — c'est ce qui empêche quelqu'un qui passe devant un
 *  téléphone déverrouillé de supprimer le compte. */
async function reauthentifier(motDePasse?: string): Promise<void> {
  const u = utilisateur();
  if (estCompteGooglePur(fournisseurs())) {
    await reauthenticateWithPopup(u, new GoogleAuthProvider());
    return;
  }
  if (!motDePasse) throw new Error('Entre ton mot de passe pour confirmer.');
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email ?? '', motDePasse));
}

export async function changerMotDePasse(v: ChangementMdp): Promise<void> {
  const u = utilisateur();
  // On se ré-authentifie systématiquement : l'utilisateur vient de taper son
  // mot de passe actuel, donc ça ne lui coûte rien — et ça évite de lui
  // renvoyer une erreur « reconnecte-toi » après coup.
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email ?? '', v.actuel));
  await updatePassword(u, v.nouveau);
}

/** Supprimer le compte, dans l'ordre qui ne laisse pas de ruine derrière lui.
 *  Voir domaine/compte.ts : on ré-authentifie D'ABORD, parce que c'est la
 *  seule étape qui peut échouer sur une action de l'utilisateur et la seule
 *  qui ne détruit rien. Ensuite seulement on efface. */
export async function supprimerCompte(motDePasse?: string): Promise<void> {
  const u = utilisateur();
  const uid = u.uid;

  // 1. Prouver que c'est bien lui. Rien n'est détruit à ce stade.
  await reauthentifier(motDePasse);

  // 2. Le document, tant qu'on en a encore le droit : une fois le compte
  //    supprimé, les règles refusent l'écriture et il resterait orphelin,
  //    avec l'XP et le pseudo de quelqu'un qui a demandé à disparaître.
  await deleteDoc(doc(db, 'users', uid));

  // 3. Le compte lui-même.
  await deleteUser(u);

  try {
    localStorage.removeItem(`cs5_photo_${uid}`);
  } catch {
    // Un stockage indisponible (navigation privée) ne doit pas faire échouer
    // une suppression déjà effective côté serveur.
  }
}
