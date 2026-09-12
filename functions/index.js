// ============================================================
// Kolektif — Cloud Functions (notifications push FCM)
// Déploiement : firebase deploy --only functions  (plan Blaze requis)
//
// Principe : le téléphone vibre quand ça compte —
//   1. nouveau sondage            → tout le monde sauf le créateur
//   2. match confirmé             → votants + inscrits
//   3. désistement (manque 1-3)   → les non-inscrits, si match < 48 h
//   4. match terminé              → les joueurs (notes + vote MOTM)
//   5. rappels programmés         → J-1 et H-2 aux inscrits,
//                                   dernier appel aux non-inscrits
//
// Messages DATA-ONLY : le service worker affiche lui-même la notif
// (payload "notification" + onBackgroundMessage = doublons).
// Anti-spam : marqueurs _notifs sur le doc match (écrits par Admin SDK,
// hors des règles Firestore ; le trigger ignore ces écritures techniques).
// ============================================================
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });
const db = getFirestore();

// Repli pour les matchs d'avant le multi-sport (tous du foot à 5).
// L'effectif appartient au match, pas au serveur.
const MIN_CONFIRM = 10;
function maxJoueurs(m) {
  const n = m && m.joueursMax;
  return (typeof n === 'number' && n >= 2 && n <= 40) ? n : MIN_CONFIRM;
}

// ---------- Temps (le runtime tourne en UTC, les matchs vivent à Paris) ----------
function tzOffsetMin(ms) {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .format(new Date(ms));
  const m = s.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!m) return 60;
  const h = parseInt(m[1], 10);
  return h * 60 + (m[2] ? Math.sign(h) * parseInt(m[2], 10) : 0);
}
// 'YYYY-MM-DD' + 'HH:MM' (heure de Paris) -> timestamp ms
function parisMs(dateStr, heure) {
  const [y, mo, da] = String(dateStr).split('-').map(Number);
  const [h, mi] = String(heure || '20:00').split(':').map(Number);
  if (!y || !mo || !da) return 0;
  const utcGuess = Date.UTC(y, mo - 1, da, h || 20, mi || 0);
  return utcGuess - tzOffsetMin(utcGuess) * 60000;
}
function parisYMD(ms) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms));
}
// Quand joue-t-on ? dateFinale est une CHAÎNE 'YYYY-MM-DD' (l'heure est
// dans le créneau confirmé) ; on gère aussi un éventuel Timestamp hérité.
function matchWhen(m) {
  const df = m.dateFinale;
  if (!df) return { ms: 0, heure: '' };
  if (typeof df === 'object' && typeof df.toMillis === 'function') return { ms: df.toMillis(), heure: '' };
  const crs = m.creneauxProposes || [];
  const cr = crs.find(c => c.date === df && (!m.lieuFinal || String(m.lieuFinal).startsWith(c.lieu) || c.lieu === m.lieuFinal))
    || crs.find(c => c.date === df);
  const heure = (cr && cr.heure) || '';
  return { ms: parisMs(df, heure || '20:00'), heure };
}
// « ce soir à 19h » / « demain à 19h » / « samedi 5 à 11h »
function quandLabel(ms, heure) {
  const h = heure ? ' à ' + heure.replace(':', 'h') : '';
  const d = parisYMD(ms);
  if (d === parisYMD(Date.now())) return 'ce soir' + h;
  if (d === parisYMD(Date.now() + 86400000)) return 'demain' + h;
  const wd = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric' })
    .format(new Date(ms));
  return wd + h;
}

// ---------- Destinataires & envoi ----------
// Map token -> uid (pour purger les jetons morts chez leur propriétaire).
// uids = liste ciblée, ou null = tous les utilisateurs. excludeUids toujours retirés.
async function collectTokens(uids, excludeUids = []) {
  const ex = new Set(excludeUids.filter(Boolean));
  const map = new Map();
  let docs;
  if (uids) {
    const refs = [...new Set(uids.filter(u => u && !ex.has(u)))].map(u => db.doc('users/' + u));
    docs = refs.length ? await db.getAll(...refs) : [];
  } else {
    docs = (await db.collection('users').get()).docs;
  }
  for (const d of docs) {
    if (!d.exists || ex.has(d.id)) continue;
    for (const t of (d.get('fcmTokens') || [])) { if (t) map.set(t, d.id); }
  }
  return map;
}

async function send(map, { title, body, matchId }) {
  const tokens = [...map.keys()];
  if (!tokens.length) return 0;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title, body, matchId: matchId || '' },
    webpush: { headers: { Urgency: 'high', TTL: '43200' } },
  });
  // Purge des jetons morts, directement chez leur propriétaire.
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument') dead.push(tokens[i]);
  });
  await Promise.all(dead.map(t =>
    db.doc('users/' + map.get(t)).update({ fcmTokens: FieldValue.arrayRemove(t) }).catch(() => {})
  ));
  return res.successCount;
}

// ---------- Trigger : le match bouge ----------
const stripNotifs = (o) => { if (!o) return o; const { _notifs, ...rest } = o; return rest; };

exports.onMatchEcrit = onDocumentWritten('matchs/{matchId}', async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!after) return; // suppression
  // Écriture purement technique (marqueurs _notifs) : on ignore.
  if (before && JSON.stringify(stripNotifs(before)) === JSON.stringify(stripNotifs(after))) return;

  const matchId = event.params.matchId;
  const ref = event.data.after.ref;
  const notifs = after._notifs || {};
  const mark = (k) => ref.update({ ['_notifs.' + k]: Date.now() }).catch(() => {});

  // 1. Nouveau sondage → tout le monde sauf le créateur.
  if (!before && after.statut === 'sondage') {
    let pseudo = 'Un joueur';
    if (after.createurUid) {
      const u = await db.doc('users/' + after.createurUid).get().catch(() => null);
      if (u && u.exists && u.get('pseudo')) pseudo = u.get('pseudo');
    }
    const map = await collectTokens(null, [after.createurUid]);
    // Le mot du créateur devient le corps de la notif : plus humain qu'un texte générique.
    const mot = String(after.message || '').trim();
    await send(map, {
      title: 'Nouveau match proposé ⚽',
      body: mot ? pseudo + ' : « ' + mot.slice(0, 90) + ' »' : pseudo + ' lance un match — vote pour ton créneau.',
      matchId,
    });
    return;
  }
  if (!before) return;

  // 2. Sondage → confirmé : votants + inscrits.
  if (before.statut !== 'confirmé' && after.statut === 'confirmé' && !notifs.confirme) {
    await mark('confirme');
    const w = matchWhen(after);
    const dest = new Set(after.joueursInscrits || []);
    Object.values(after.votes || {}).forEach(arr => (arr || []).forEach(u => dest.add(u)));
    const map = await collectTokens([...dest]);
    await send(map, {
      title: "C'est calé ✅",
      body: 'Match ' + quandLabel(w.ms, w.heure) + (after.lieuFinal ? ' · ' + after.lieuFinal : '') + '.',
      matchId,
    });
    return;
  }

  // 3. Désistement sur un match confirmé imminent → non-inscrits.
  if (before.statut === 'confirmé' && after.statut === 'confirmé') {
    const nAvant = (before.joueursInscrits || []).length;
    const inscrits = after.joueursInscrits || [];
    const manque = maxJoueurs(after) - inscrits.length;
    const w = matchWhen(after);
    const dans = w.ms - Date.now();
    const dernierEnvoi = notifs.manque || 0;
    if (inscrits.length < nAvant && manque >= 1 && manque <= 3 &&
        dans > 0 && dans < 48 * 3600000 && Date.now() - dernierEnvoi > 3600000) {
      await mark('manque');
      const map = await collectTokens(null, inscrits);
      await send(map, {
        title: 'Il manque ' + manque + ' joueur' + (manque > 1 ? 's' : '') + ' ⚡',
        body: 'Match ' + quandLabel(w.ms, w.heure) + (after.lieuFinal ? ' · ' + after.lieuFinal : '') + ' — prends ta place.',
        matchId,
      });
    }
    return;
  }

  // 4. Match terminé → les joueurs (notes + homme du match).
  if (before.statut !== 'terminé' && after.statut === 'terminé' && !notifs.termine) {
    await mark('termine');
    // Le bilan des équipes se met à jour ICI, côté serveur, et nulle part
    // ailleurs. Un client ne peut pas écrire dans `stats` (les règles le lui
    // interdisent) : sans ça, gonfler le palmarès de son équipe se ferait en
    // trois lignes dans la console du navigateur. Le marqueur `termine`
    // garantit aussi qu'on ne compte le match qu'UNE fois, même si le
    // document est réécrit ensuite.
    await majBilanEquipes(after);
    const map = await collectTokens(after.joueursInscrits || []);
    await send(map, {
      title: 'Match terminé 🏁',
      body: "Note tes coéquipiers et vote l'homme du match.",
      matchId,
    });
  }
});

// ---------- Bilan des équipes après un match ----------
// N'agit que sur les matchs nés d'un DÉFI : eux seuls portent les deux
// identifiants d'équipe. Un match ordinaire ne touche à aucun palmarès.
async function majBilanEquipes(m) {
  const idA = m.equipeAId, idB = m.equipeBId;
  if (!idA || !idB || idA === idB) return;
  const a = Number(m.scoreA), b = Number(m.scoreB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return;
  // Un score aberrant est ignoré plutôt que reporté : mieux vaut un bilan
  // incomplet qu'un bilan faux.
  if (a < 0 || b < 0 || a > 99 || b > 99) return;

  const bilan = (pour, contre) => ({
    'stats.matchs': FieldValue.increment(1),
    'stats.butsPour': FieldValue.increment(pour),
    'stats.butsContre': FieldValue.increment(contre),
    'stats.victoires': FieldValue.increment(pour > contre ? 1 : 0),
    'stats.nuls': FieldValue.increment(pour === contre ? 1 : 0),
    'stats.defaites': FieldValue.increment(pour < contre ? 1 : 0),
  });
  // La série compte les victoires consécutives : elle s'incrémente ou
  // retombe à zéro, donc elle ne peut pas s'exprimer avec un increment.
  const ecrire = async (id, pour, contre) => {
    const ref = db.doc('equipes/' + id);
    const snap = await ref.get().catch(() => null);
    if (!snap || !snap.exists) return;
    const serie = pour > contre ? (Number(snap.get('stats.serie')) || 0) + 1 : 0;
    await ref.update({ ...bilan(pour, contre), 'stats.serie': serie }).catch(() => {});
  };
  await Promise.all([ecrire(idA, a, b), ecrire(idB, b, a)]);
}

// ---------- Rappels programmés (toutes les 30 min, heure de Paris) ----------
exports.rappels = onSchedule({ schedule: 'every 30 minutes', timeZone: 'Europe/Paris' }, async () => {
  const snap = await db.collection('matchs').where('statut', '==', 'confirmé').get();
  const now = Date.now();
  for (const d of snap.docs) {
    const m = d.data();
    const notifs = m._notifs || {};
    const w = matchWhen(m);
    if (!w.ms) continue;
    const dans = w.ms - now;
    if (dans <= 0) continue;
    const inscrits = m.joueursInscrits || [];
    const manque = maxJoueurs(m) - inscrits.length;
    const lieu = m.lieuFinal ? ' · ' + m.lieuFinal : '';
    const mark = (k) => d.ref.update({ ['_notifs.' + k]: now }).catch(() => {});

    // H-2 : rappel aux inscrits.
    if (dans <= 2.5 * 3600000 && !notifs.rappelH2) {
      await mark('rappelH2');
      const map = await collectTokens(inscrits);
      await send(map, {
        title: "Coup d'envoi " + (w.heure ? 'à ' + w.heure.replace(':', 'h') : 'bientôt') + ' ⚽',
        body: (m.lieuFinal || 'Ton match') + ' — sois-y 10 min avant.',
        matchId: d.id,
      });
    }
    // J-1 : rappel aux inscrits (fenêtre 20 h – 28 h avant).
    else if (dans > 20 * 3600000 && dans <= 28 * 3600000 && !notifs.rappelJ1) {
      await mark('rappelJ1');
      const map = await collectTokens(inscrits);
      await send(map, {
        title: 'Demain, on joue 📅',
        body: 'Match ' + quandLabel(w.ms, w.heure) + lieu + ' — ' + inscrits.length + '/' + maxJoueurs(m) + ' inscrits.',
        matchId: d.id,
      });
    }

    // Dernier appel aux non-inscrits si le match n'est pas plein (< 24 h),
    // sauf si une alerte « manque » vient de partir (trigger désistement).
    if (dans <= 24 * 3600000 && manque >= 1 && manque <= 3 &&
        !notifs.dernierAppel && now - (notifs.manque || 0) > 3600000) {
      await mark('dernierAppel');
      const map = await collectTokens(null, inscrits);
      await send(map, {
        title: 'Il manque ' + manque + ' joueur' + (manque > 1 ? 's' : '') + ' ⚡',
        body: 'Match ' + quandLabel(w.ms, w.heure) + lieu + ' — dernier appel.',
        matchId: d.id,
      });
    }
  }
});
