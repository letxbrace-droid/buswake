// ============================================================
// Cap Saclay Five — Cloud Functions (notifications push FCM)
// Déploiement : firebase deploy --only functions  (plan Blaze requis)
// ============================================================
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

// Récupère tous les jetons FCM enregistrés (dédupliqués).
async function allTokens() {
  const snap = await db.collection('users').get();
  const set = new Set();
  snap.forEach(d => (d.data().fcmTokens || []).forEach(t => t && set.add(t)));
  return [...set];
}

// Envoie une notif à tout le monde, et nettoie les jetons invalides.
async function notifyAll(title, body, data = {}) {
  const tokens = await allTokens();
  if (!tokens.length) return;
  const res = await getMessaging().sendEachForMulticast({
    notification: { title, body },
    data,
    tokens,
  });
  // Purge des jetons morts
  const dead = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error && r.error.code;
      if (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token') {
        dead.push(tokens[i]);
      }
    }
  });
  if (dead.length) {
    const users = await db.collection('users').get();
    const batch = db.batch();
    const { FieldValue } = require('firebase-admin/firestore');
    users.forEach(d => {
      const t = d.data().fcmTokens || [];
      const bad = t.filter(x => dead.includes(x));
      if (bad.length) batch.update(d.ref, { fcmTokens: FieldValue.arrayRemove(...bad) });
    });
    await batch.commit();
  }
}

// Nouveau sondage créé -> notifie la communauté.
exports.onMatchCreated = onDocumentCreated('matchs/{id}', async (event) => {
  const m = event.data.data();
  if (m && m.statut === 'sondage') {
    await notifyAll('🗳️ Nouveau sondage', 'Vote pour le prochain foot à 5 !', { type: 'sondage' });
  }
});

// Match confirmé -> notifie la communauté.
exports.onMatchConfirmed = onDocumentUpdated('matchs/{id}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.statut !== 'confirmé' && after.statut === 'confirmé') {
    const when = after.dateFinale && after.dateFinale.toDate
      ? after.dateFinale.toDate().toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    await notifyAll('⚽ Match confirmé !', `${when}${after.lieuFinal ? ' · ' + after.lieuFinal : ''} — inscris-toi !`, { type: 'confirme' });
  }
});
