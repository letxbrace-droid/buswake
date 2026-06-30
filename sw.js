const CACHE = 'cs5-v58';
const PRECACHE = ['./','./index.html','./manifest.json','./icon-512.png','./logo.png'];

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
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'Cap Saclay Five', {
      body: n.body || '',
      icon: './icon-512.png',
      badge: './icon-512.png',
      vibrate: [80, 40, 80],
      data: payload.data || {}
    });
  });
} catch (e) {
  // FCM indisponible (hors-ligne / non configuré) — le reste du SW fonctionne.
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
