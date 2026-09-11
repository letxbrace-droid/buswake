// ============================================================
// Rattrapage unique : donner aux matchs existants les deux champs
// que le fil borné exige (visibilite, finVisible).
//
// Pourquoi c'est nécessaire : une requête Firestore ne peut pas
// ramener un document où le champ filtré est ABSENT. Sans ce
// rattrapage, les matchs créés avant cette version resteraient
// lisibles par leur lien, mais ne remonteraient plus dans aucun fil.
//
// À lancer UNE FOIS, depuis Cloud Shell, DANS le dossier functions/ :
// (c'est là que firebase-admin est installé — Node résout les modules
//  depuis le dossier du script, pas depuis le répertoire courant)
//   cd functions && npm install && node backfill-visibilite.js
//
// Sans risque : le script n'écrit que les champs manquants et
// n'écrase jamais une valeur déjà posée. Le relancer ne fait rien.
// ============================================================
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Date de référence d'un match : le créneau retenu, sinon le dernier proposé.
function dateDeReference(m) {
  const ts = x => (x && x.toDate) ? x.toDate().getTime() : (x ? new Date(x).getTime() : null);
  if (m.dateFinale) return ts(m.dateFinale);
  const dates = (m.creneauxProposes || []).map(c => ts(c && c.date)).filter(Boolean);
  if (dates.length) return Math.max(...dates);
  return ts(m.createdAt) || Date.now();
}

(async () => {
  const snap = await db.collection('matchs').get();
  let modifies = 0, intacts = 0;
  let lot = db.batch(), dansLeLot = 0;

  for (const d of snap.docs) {
    const m = d.data();
    const patch = {};
    // Les matchs d'avant étaient tous ouverts au dépôt : public.
    if (m.visibilite === undefined) patch.visibilite = 'public';
    if (m.finVisible === undefined) {
      patch.finVisible = new Date(dateDeReference(m) + 24 * 3600 * 1000);
    }
    if (Object.keys(patch).length === 0) { intacts++; continue; }

    lot.update(d.ref, patch);
    modifies++;
    if (++dansLeLot === 400) { await lot.commit(); lot = db.batch(); dansLeLot = 0; }
  }
  if (dansLeLot) await lot.commit();

  console.log(`${snap.size} matchs examinés — ${modifies} complétés, ${intacts} déjà à jour.`);
  process.exit(0);
})().catch(e => { console.error('Échec :', e.message); process.exit(1); });
