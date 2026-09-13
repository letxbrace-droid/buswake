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

// ---------- Gamification : l'XP s'attribue ICI, et nulle part ailleurs ----------
// Le classement par équipe était déjà protégé ; celui des joueurs ne l'était
// pas : n'importe quel compte connecté pouvait écrire `xp` sur n'importe quel
// document `users/{uid}`. Trois lignes dans la console suffisaient à se mettre
// premier. Les règles refusent désormais ces champs à TOUS les clients, y
// compris au propriétaire du compte — comme `equipes/{id}.stats`.
//
// Le document match est la seule source : voter, créer, noter, élire l'homme
// du match et terminer sont tous des écritures dessus. Ce trigger les lit et
// en déduit l'XP. Il est naturellement idempotent : il compare l'avant et
// l'après, donc une écriture rejouée à l'identique ne donne rien.
const XP = { participer: 100, voter: 10, creer: 50, hdm: 200, noter: 10, motm: 15, lapin: -15 };

// Accumulateur : un seul update par joueur, même s'il gagne sur deux motifs.
function ajout(acc, uid, champs) {
  if (!uid) return;
  const cur = acc.get(uid) || {};
  for (const [k, v] of Object.entries(champs)) {
    if (typeof v === 'number') cur[k] = (cur[k] || 0) + v;
    else cur[k] = v;                       // valeur absolue (remise à zéro)
  }
  acc.set(uid, cur);
}

// Les uids présents dans une carte { cleCreneau: [uid, ...] }.
function uidsDeCarte(carte) {
  const out = new Set();
  Object.values(carte || {}).forEach(a => (a || []).forEach(u => u && out.add(u)));
  return out;
}

async function appliquer(acc) {
  const ecritures = [...acc.entries()].map(async ([uid, champs]) => {
    const maj = {};
    for (const [k, v] of Object.entries(champs)) {
      maj[k] = (k === 'streak' && v === 0) ? 0 : FieldValue.increment(v);
    }
    await db.doc('users/' + uid).update(maj).catch(() => {});
  });
  await Promise.all(ecritures);
}

// Badges : déduits des statistiques, jamais annoncés par le client.
async function majBadges(uids) {
  await Promise.all([...new Set(uids)].filter(Boolean).map(async (uid) => {
    const ref = db.doc('users/' + uid);
    const snap = await ref.get().catch(() => null);
    if (!snap || !snap.exists) return;
    const d = snap.data() || {};
    const deja = d.badges || [];
    const st = d.stats || {};
    const gagnes = [];
    if ((st.matchsJoues || 0) >= 1  && !deja.includes('premier_match')) gagnes.push('premier_match');
    if ((st.matchsJoues || 0) >= 5  && !deja.includes('cinq_matchs'))   gagnes.push('cinq_matchs');
    if ((st.matchsJoues || 0) >= 10 && !deja.includes('dix_matchs'))    gagnes.push('dix_matchs');
    if ((st.hommeDuMatch || 0) >= 1 && !deja.includes('hdm'))           gagnes.push('hdm');
    if ((d.streak || 0) >= 3        && !deja.includes('assidu'))        gagnes.push('assidu');
    if (gagnes.length) await ref.update({ badges: FieldValue.arrayUnion(...gagnes) }).catch(() => {});
  }));
}

// Tout ce qui se gagne AVANT la fin du match : créer, voter, noter, élire.
//
// Chaque gain est payé UNE FOIS par joueur et par match. Sans ça, voter,
// retirer son vote et revoter rapporte dix XP à chaque aller-retour — le
// classement se farme en cliquant. Comparer l'avant et l'après ne suffit
// pas : il faut se souvenir de qui a déjà été payé. C'est le rôle de `_xp`,
// écrit par l'Admin SDK sur le document match, comme les marqueurs `_notifs`.
async function gainsCourants(before, after, ref) {
  const acc = new Map();
  const paye = after._xp || {};
  const nouveaux = { votes: [], motm: [], notes: [] };
  const dejaPaye = (cle, uid) => (paye[cle] || []).includes(uid)
    || nouveaux[cle].includes(uid);

  // Création : +50 au créateur, et le badge organisateur.
  if (!before && after.createurUid) {
    ajout(acc, after.createurUid, { xp: XP.creer });
    await db.doc('users/' + after.createurUid)
      .update({ badges: FieldValue.arrayUnion('organisateur') }).catch(() => {});
  }
  if (before) {
    // Vote de créneau : +10 au premier vote, et au premier seulement.
    const av = uidsDeCarte(before.votes), ap = uidsDeCarte(after.votes);
    ap.forEach(u => {
      if (av.has(u) || dejaPaye('votes', u)) return;
      ajout(acc, u, { xp: XP.voter }); nouveaux.votes.push(u);
    });

    // Vote homme du match : +15, une fois. Changer d'avis ne repaie pas.
    const mv = uidsDeCarte(before.motmVotes), mp = uidsDeCarte(after.motmVotes);
    mp.forEach(u => {
      if (mv.has(u) || dejaPaye('motm', u)) return;
      ajout(acc, u, { xp: XP.motm }); nouveaux.motm.push(u);
    });

    // Notes : +10 au noteur, et la note va sur les notés.
    // Une fiche de notes ne s'écrit qu'une fois — les règles n'autorisent
    // un joueur qu'à toucher `ratings.{son uid}`.
    const rAv = before.ratings || {}, rAp = after.ratings || {};
    for (const [noteur, fiche] of Object.entries(rAp)) {
      if (rAv[noteur] || dejaPaye('notes', noteur)) continue;
      ajout(acc, noteur, { xp: XP.noter }); nouveaux.notes.push(noteur);
      for (const [note, etoiles] of Object.entries(fiche || {})) {
        const n = Number(etoiles);
        if (!Number.isFinite(n) || n < 1 || n > 5) continue;   // note aberrante : ignorée
        ajout(acc, note, { noteSum: n, noteCount: 1 });
      }
    }
  }
  if (!acc.size) return;
  await appliquer(acc);
  // On note qui vient d'être payé, pour ne pas le repayer.
  const maj = {};
  for (const [cle, uids] of Object.entries(nouveaux)) {
    if (uids.length) maj['_xp.' + cle] = FieldValue.arrayUnion(...uids);
  }
  if (Object.keys(maj).length && ref) await ref.update(maj).catch(() => {});
}

// Fin de match : présents, absents, homme du match. Protégé par le marqueur
// `termine`, donc compté une seule fois même si le document est réécrit.
async function gainsFinDeMatch(m) {
  const acc = new Map();
  const inscrits = m.joueursInscrits || [];
  const att = m.attendance || {};
  const presents = inscrits.filter(u => att[u] !== false);
  const absents = inscrits.filter(u => att[u] === false);

  presents.forEach(u => ajout(acc, u, {
    xp: XP.participer, 'stats.matchsJoues': 1, presences: 1, streak: 1,
  }));
  // Le lapin coûte. C'est le seul malus du jeu, et il tient le produit :
  // sans lui, s'inscrire puis ne pas venir est gratuit.
  absents.forEach(u => ajout(acc, u, { xp: XP.lapin, lapins: 1, streak: 0 }));
  if (m.hommeDuMatchUid) ajout(acc, m.hommeDuMatchUid, { xp: XP.hdm, 'stats.hommeDuMatch': 1 });

  await appliquer(acc);
  await majBadges([...acc.keys()]);
}

// ---------- Trigger : le match bouge ----------
// `_notifs` et `_xp` sont des marqueurs techniques écrits par ce trigger
// lui-même : une écriture qui ne change qu'eux ne doit pas le relancer.
const stripNotifs = (o) => { if (!o) return o; const { _notifs, _xp, ...rest } = o; return rest; };

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

  // L'XP d'abord : les branches de notification se terminent par `return`,
  // et une écriture qui déclenche une notif donne souvent aussi de l'XP.
  await gainsCourants(before, after, ref).catch(() => {});

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
    await gainsFinDeMatch(after);
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
