// Purge des caches de la v1.
//
// Workbox ne supprime que SES caches. Ceux de la v1 s'appellent « cs5-vNN »
// et resteraient sur l'appareil des joueurs déjà venus : plusieurs mégaoctets
// de fichiers qu'aucun service worker ne sert plus. Ce n'est pas un problème
// de correction, c'est de la place prise pour rien — et elle ne se libérerait
// jamais toute seule.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n.startsWith('cs5-')).map((n) => caches.delete(n))),
    ),
  );
});
