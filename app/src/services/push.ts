import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { app, db } from '../firebase/client';
import { etatPush, lireNotification, type EtatPush } from '../domaine/push';

/**
 * Jetons FCM : obtention, stockage, écoute.
 *
 * Ce module IMPORTE `firebase/messaging` DYNAMIQUEMENT et n'est lui-même
 * jamais importé en tête d'un écran. C'est la même leçon que pour `auth` :
 * un import statique depuis la racine fait entrer le SDK dans le chunk de
 * première peinture, pour une fonctionnalité que la plupart des visites
 * n'utilisent jamais.
 *
 * Rien ici ne fait tomber un écran. Une notification est un bonus : quand
 * elle échoue, on le dit, et l'app continue.
 */

/** Clé publique Web Push du projet (Console Firebase → Cloud Messaging →
 *  Certificats Web Push). Publique par nature : elle part dans le bundle et
 *  sert à chiffrer vers CE navigateur. C'est la clé PRIVÉE, côté Google, qui
 *  autorise l'envoi — elle n'est pas ici. */
const VAPID = 'BPk6nFFz8nWw1Zbypxn4q_qYYtjxTa-OsScNO1dCVscjn5IB6Sk3oSqHsWa-kvchj2EnL8qxxQhVbWPLQu0d2NQ';

async function messagerie() {
  const m = await import('firebase/messaging');
  if (!(await m.isSupported().catch(() => false))) return null;
  return m;
}

/** L'état courant, sans rien demander à personne. */
export async function lireEtatPush(): Promise<EtatPush> {
  const apiPresente = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
  const m = apiPresente ? await messagerie() : null;
  return etatPush({
    apiPresente,
    fcmSupporte: !!m,
    permission: apiPresente ? Notification.permission : null,
  });
}

/** Demande un jeton et le range. Appelée sur un clic — jamais au chargement :
 *  une fenêtre de permission qui surgit sans qu'on ait rien demandé se fait
 *  refuser, et un refus est définitif. */
export async function activerPush(uid: string): Promise<EtatPush> {
  const m = await messagerie();
  if (!m) return 'indisponible';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'a-demander';

  await enregistrerJeton(uid, m);
  return 'actif';
}

/**
 * Rafraîchit le jeton d'un joueur déjà autorisé.
 *
 * Les jetons FCM expirent. Sans ce rafraîchissement à la connexion, les
 * notifications s'éteignent toutes seules au bout de quelques semaines —
 * sans erreur, sans message, et le joueur croit que la fonctionnalité ne
 * marche pas.
 */
export async function rafraichirJeton(uid: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const m = await messagerie();
  if (!m) return;
  await enregistrerJeton(uid, m).catch(() => {
    /* silencieux : c'est un entretien de fond, pas une action du joueur. */
  });
}

type Messagerie = NonNullable<Awaited<ReturnType<typeof messagerie>>>;

async function enregistrerJeton(uid: string, m: Messagerie): Promise<void> {
  // Le worker est celui de l'app (Workbox), pas un `firebase-messaging-sw.js`
  // séparé : deux workers sur la même portée s'évincent l'un l'autre. C'est
  // `public/push.js`, importé par le worker généré, qui reçoit en arrière-plan.
  const registration = await navigator.serviceWorker.ready;
  const jeton = await m.getToken(m.getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: registration });
  if (!jeton) throw new Error('jeton indisponible');
  // `arrayUnion` : un joueur a plusieurs appareils, et le même jeton réécrit
  // ne doit pas se dupliquer. La purge des jetons morts est faite côté
  // serveur, à l'envoi, là où on apprend qu'ils sont morts.
  await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(jeton) });
}

/**
 * Messages reçus pendant que l'app est OUVERTE.
 *
 * Le système n'affiche rien dans ce cas — c'est à l'app de le faire, sinon
 * le joueur ne voit passer rien du tout pendant qu'il l'utilise. On le montre
 * en toast plutôt qu'en notification système : une bannière de l'OS par
 * dessus l'app qu'on est en train de regarder est du bruit.
 */
export async function ecouterAuPremierPlan(
  montrer: (titre: string, corps: string) => void,
): Promise<() => void> {
  const m = await messagerie();
  if (!m) return () => {};
  return m.onMessage(m.getMessaging(app), (p) => {
    const n = lireNotification(p.data);
    montrer(n.titre, n.corps);
  });
}
