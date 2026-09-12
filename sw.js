const CACHE = 'cs5-v76';
// `og-*.jpg` n'est volontairement PAS ici : ces bannières ne sont lues que
// par les robots d'aperçu (WhatsApp, iMessage), jamais par l'app. Les
// précharger coûtait 128 ko à chaque installation pour rien.
// `m/*.html` y est, en revanche : hors-ligne, un lien de partage doit
// pouvoir exécuter sa redirection, sinon le `#j=<id>` est perdu.
const PRECACHE = [
  './','./index.html','./manifest.json',
  './icon-512.png','./icon-192.png','./logo.png',
  './art-bolt.png','./art-goal.png','./art-player.png',
  './art-empty-histo.png','./art-empty-amis.png','./art-empty-vestiaire.png','./art-podium.png',
  './texture-turf.jpg','./art-hero-jouer.jpg',
  './fonts/anton-latin.woff2','./fonts/anton-latin-ext.woff2',
  './fonts/spacegrotesk-latin.woff2','./fonts/spacegrotesk-latin-ext.woff2',
  './sport-foot5.jpg','./sport-foot7.jpg','./sport-basket3.jpg','./sport-padel.jpg','./sport-tennis.jpg',
  './m/foot5.html','./m/foot7.html','./m/basket3.html','./m/padel.html','./m/tennis.html',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // La PAGE (navigation + index.html) : network-first → toujours la
  // dernière version quand on est en ligne, repli sur le cache hors-ligne.
  // Évite que les correctifs restent invisibles à cause d'un cache figé.
  const isDoc = e.request.mode === 'navigate'
    || url.pathname === '/' || url.pathname.endsWith('/')
    || url.pathname.endsWith('index.html');
  if (isDoc) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Le reste (assets statiques) : cache-first, mise à jour en arrière-plan.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || network;
    })
  );
});

// ===== NOTIFICATIONS PUSH (Firebase Cloud Messaging) =====
// Chargé en compat dans le SW. En cas d'échec réseau, le cache reste fonctionnel.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey: "AIzaSyDAtK1Yo0qg0zQsNNU19JFbqrBuFEfPRgc",
    authDomain: "inrun-five.firebaseapp.com",
    projectId: "inrun-five",
    storageBucket: "inrun-five.firebasestorage.app",
    messagingSenderId: "942530257495",
    appId: "1:942530257495:web:c5ccdcf6d0de6ba2f27912"
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    // Les Cloud Functions envoient des messages DATA-ONLY (title/body dans
    // data) : c'est nous qui affichons — jamais de notification en double.
    const d = payload.data || {};
    const n = payload.notification || {};
    self.registration.showNotification(d.title || n.title || 'Kolektif', {
      body: d.body || n.body || '',
      icon: './icon-512.png',
      badge: './icon-512.png',
      vibrate: [80, 40, 80],
      data: { matchId: d.matchId || '' }
    });
  });
} catch (e) {
  // FCM indisponible (hors-ligne / non configuré) — le reste du SW fonctionne.
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  // Deep-link : la notif d'un match ouvre directement ce match (#j=id).
  const matchId = (e.notification.data && e.notification.data.matchId) || '';
  const target = matchId ? './#j=' + matchId : './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) {
        if ('focus' in c) {
          if (matchId && 'navigate' in c) return c.navigate(target).then(w => (w || c).focus());
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
