/**
 * NOTIFICATIONS PUSH — la partie qui se décide sans réseau.
 *
 * Le reste (jeton FCM, écriture Firestore, worker) vit dans `services/push`
 * et dans `public/push.js`. Ici on ne garde que ce qu'on peut éprouver : les
 * états possibles, et l'endroit où mène une notification.
 *
 * Le serveur envoie des messages DATA-ONLY (`data: { title, body, matchId }`,
 * voir `functions/index.js`). C'est délibéré : si le message portait un bloc
 * `notification`, le navigateur en afficherait une ET le worker une seconde.
 * C'est donc à nous d'afficher — et donc à nous de lire le payload.
 */

/** Les états d'une permission, du point de vue de ce qu'on peut PROPOSER.
 *
 *  `refuse` est distinct de `a-demander` parce qu'il est terminal : une fois
 *  refusée, la permission ne peut plus être redemandée par le site. Proposer
 *  à nouveau un bouton « Activer » qui ne peut rien faire est une promesse
 *  qu'on ne tient pas ; il faut dire d'aller dans les réglages du navigateur.
 */
export type EtatPush = 'indisponible' | 'a-demander' | 'refuse' | 'actif';

export interface ContextePush {
  /** L'API Notification existe-t-elle ? (absente sur iOS hors app installée) */
  readonly apiPresente: boolean;
  /** FCM se dit-il supporté ici ? (`isSupported()` du SDK) */
  readonly fcmSupporte: boolean;
  readonly permission: NotificationPermission | null;
}

export function etatPush(c: ContextePush): EtatPush {
  if (!c.apiPresente || !c.fcmSupporte) return 'indisponible';
  if (c.permission === 'granted') return 'actif';
  if (c.permission === 'denied') return 'refuse';
  return 'a-demander';
}

/** Ce qu'on écrit sur le bouton, et s'il fait quelque chose. */
export function libellePush(e: EtatPush): { texte: string; actif: boolean } {
  switch (e) {
    case 'actif':
      return { texte: 'Notifications activées', actif: false };
    case 'refuse':
      return { texte: 'Bloquées par le navigateur', actif: false };
    case 'indisponible':
      return { texte: 'Indisponible sur cet appareil', actif: false };
    case 'a-demander':
      return { texte: 'Activer les notifications', actif: true };
  }
}

/** L'explication sous le bouton quand il ne fait rien. Un bouton éteint sans
 *  raison se lit comme une panne. */
export function aidePush(e: EtatPush): string {
  switch (e) {
    case 'refuse':
      return 'Tu as refusé les notifications pour ce site. Elles se réactivent dans les réglages du navigateur, pas ici.';
    case 'indisponible':
      // Sur iPhone, le push web exige l'app installée sur l'écran d'accueil.
      return "Le push web demande l'app installée sur l'écran d'accueil (et iOS 16.4 ou plus récent).";
    default:
      return '';
  }
}

export interface DonneesNotification {
  readonly title?: unknown;
  readonly body?: unknown;
  readonly matchId?: unknown;
}

export interface Notif {
  readonly titre: string;
  readonly corps: string;
  /** La route interne où mène le clic. Jamais vide : une notification qui
   *  n'ouvre rien vaut moins qu'une notification qui ouvre l'accueil. */
  readonly cible: string;
}

/**
 * Lit un message reçu. Tolérant par construction : le payload vient du
 * réseau, et un champ manquant ne doit pas faire disparaître la notification.
 */
export function lireNotification(d: DonneesNotification | null | undefined): Notif {
  const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const id = txt(d?.matchId);
  return {
    titre: txt(d?.title) || 'Kolektif',
    corps: txt(d?.body),
    cible: id ? `/match/${id}` : '/',
  };
}

/**
 * Traduit les liens de la v1. Les invitations partagées par les joueurs
 * portent `#j=<id>` — elles circulent déjà dans des conversations, et rien
 * ne les rappellera. Avec HashRouter, `#j=abc` n'est aucune route connue :
 * elle tombe sur le fourre-tout et renvoie à l'accueil. Le joueur a cliqué
 * sur un match et arrive sur une liste, sans comprendre pourquoi.
 *
 * Rend `null` quand il n'y a rien à traduire — donc quand c'est déjà une
 * route de la v2.
 */
export function routeHeritee(hash: string): string | null {
  const m = /^#?j=([A-Za-z0-9_-]+)$/.exec(hash.trim());
  return m ? `/match/${m[1]}` : null;
}

/**
 * Où renvoyer quelqu'un après la connexion.
 *
 * Sans mémoire de la destination, une notification reçue déconnecté mène à
 * l'écran de connexion PUIS à l'accueil : le match est perdu, et c'était tout
 * l'intérêt de la notification. Même chose pour un lien d'invitation.
 *
 * On ne retient que des chemins internes : une valeur venue du hash est une
 * entrée non fiable, et `//ailleurs.example` est une URL absolue pour le
 * navigateur — la retenir telle quelle ferait de l'écran de connexion un
 * tremplin vers n'importe quel site.
 */
export function destinationSure(chemin: string | null | undefined): string | null {
  if (typeof chemin !== 'string') return null;
  const c = chemin.trim();
  if (!c.startsWith('/') || c.startsWith('//')) return null;
  if (c === '/connexion' || c === '/bienvenue') return null;
  return c;
}
