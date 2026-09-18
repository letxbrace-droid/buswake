/* Réception des notifications quand l'app est FERMÉE ou en arrière-plan.
 *
 * Importé par le service worker généré par Workbox (`importScripts` dans la
 * configuration VitePWA), et non déposé dans un `firebase-messaging-sw.js`
 * séparé : deux workers enregistrés sur la même portée s'évincent l'un
 * l'autre, et c'est celui de l'app qui doit gagner — il sert le site.
 *
 * Les SDK sont chargés en version « compat » parce qu'un worker classique
 * n'a pas de résolution de modules. En cas d'échec réseau, on n'a pas de
 * push, mais le worker continue de servir le site hors ligne.
 */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  // Mêmes valeurs que `src/firebase/client.ts`, recopiées faute de pouvoir
  // les importer ici. Publiques par conception : ce sont les règles Firestore
  // qui protègent les données, pas le secret de ces chaînes.
  firebase.initializeApp({
    apiKey: 'AIzaSyDAtK1Yo0qg0zQsNNU19JFbqrBuFEfPRgc',
    authDomain: 'inrun-five.firebaseapp.com',
    projectId: 'inrun-five',
    storageBucket: 'inrun-five.firebasestorage.app',
    messagingSenderId: '942530257495',
    appId: '1:942530257495:web:c5ccdcf6d0de6ba2f27912',
  });

  firebase.messaging().onBackgroundMessage((payload) => {
    // Les Cloud Functions envoient DATA-ONLY : title et body sont dans
    // `data`. C'est voulu — un bloc `notification` ferait afficher une
    // notification par le navigateur ET une par ce code. Deux pour un match.
    const d = (payload && payload.data) || {};
    const titre = typeof d.title === 'string' && d.title.trim() ? d.title.trim() : 'Kolektif';
    const matchId = typeof d.matchId === 'string' ? d.matchId.trim() : '';
    self.registration.showNotification(titre, {
      body: typeof d.body === 'string' ? d.body.trim() : '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [80, 40, 80],
      // Une notification par match : la deuxième remplace la première au lieu
      // d'empiler trois bannières pour le même sondage.
      tag: matchId ? 'match-' + matchId : 'kolektif',
      data: { matchId: matchId },
    });
  });
} catch (e) {
  /* FCM indisponible (hors ligne, navigateur sans push) — le reste du worker
     fonctionne : le site se sert toujours depuis le cache. */
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const matchId = (e.notification.data && e.notification.data.matchId) || '';
  // ROUTE DE LA v2. La v1 ouvrait `#j=<id>` ; ici le routeur est un
  // HashRouter, et la route d'un match est `#/match/<id>`. Envoyer l'ancien
  // format ouvrirait l'accueil — la notification aurait l'air de marcher, et
  // n'amènerait nulle part.
  const cible = matchId ? './#/match/' + matchId : './#/';
  e.waitUntil(
    (async () => {
      const fenetres = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of fenetres) {
        if ('focus' in c) {
          // Une app déjà ouverte se déplace, elle ne se rouvre pas en double.
          if (matchId && 'navigate' in c) {
            const w = await c.navigate(cible).catch(() => null);
            return (w || c).focus();
          }
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(cible);
    })(),
  );
});
