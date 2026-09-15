import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  signInWithEmailAndPassword, signInWithPopup, signOut, type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { profilInitial, type Connexion, type Inscription } from '../domaine/auth';

export function surSession(f: (u: User | null) => void) {
  return onAuthStateChanged(auth, f);
}

export async function connecter(v: Connexion): Promise<void> {
  await signInWithEmailAndPassword(auth, v.email, v.motDePasse);
}

export async function inscrire(v: Inscription): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, v.email, v.motDePasse);
  await setDoc(doc(db, 'users', cred.user.uid), {
    ...profilInitial(v.email, v.pseudo, v.codePostal),
    createdAt: serverTimestamp(),
  });
}

/** Google. Le document `users` n'existe pas au premier passage : on le crée,
 *  mais on NE L'ÉCRASE PAS s'il existe — sinon se reconnecter avec Google
 *  remettrait le profil à zéro, XP comprise. C'est le piège classique du
 *  `setDoc` sans garde. */
export async function connecterAvecGoogle(): Promise<void> {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const ref = doc(db, 'users', cred.user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const pseudo = cred.user.displayName?.trim() || cred.user.email?.split('@')[0] || 'Joueur';
  await setDoc(ref, {
    ...profilInitial(cred.user.email ?? '', pseudo),
    createdAt: serverTimestamp(),
  });
}

export async function deconnecter(): Promise<void> {
  await signOut(auth);
}
