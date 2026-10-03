#!/usr/bin/env node
// Test des Cloud Functions SANS Firebase : on remplace les modules par des
// bouchons dans une copie du fichier, comme le harnais du navigateur.
// Les fonctions serveur n'avaient aucun test — et c'est là que vit l'XP.
import fs from 'fs';
import path from 'path';
const RACINE = process.env.KOLEKTIF_RACINE || process.cwd();
const SRC = path.join(RACINE, 'functions', 'index.js');
const TMP = path.join(RACINE, '_fn-harnais.cjs');   // supprimé à la fin

let src = fs.readFileSync(SRC, 'utf8');
src = src.replace(/^const \{[^}]*\} = require\([^)]*\);$/gm, '');

const ecrits = [];            // journal de toutes les écritures
const BASE = {};              // users/<uid> -> doc

const bouchons = `
const FieldValue = {
  increment: (n) => ({ __inc: n }),
  arrayUnion: (...a) => ({ __union: a }),
  arrayRemove: (...a) => ({ __remove: a }),
};
const __ecrits = globalThis.__ecrits;
const __base = globalThis.__base;
const _applique = (cible, maj) => {
  for (const [k, v] of Object.entries(maj)) {
    if (v && v.__inc !== undefined) {
      const p = k.split('.'); let o = cible;
      for (let i = 0; i < p.length - 1; i++) o = (o[p[i]] ||= {});
      o[p.at(-1)] = (o[p.at(-1)] || 0) + v.__inc;
    } else if (v && v.__union) {
      const p = k.split('.'); let o = cible;
      for (let i = 0; i < p.length - 1; i++) o = (o[p[i]] ||= {});
      o[p.at(-1)] = [...new Set([...(o[p.at(-1)] || []), ...v.__union])];
    } else if (v && v.__remove) {
      const p = k.split('.'); let o = cible;
      for (let i = 0; i < p.length - 1; i++) o = (o[p[i]] ||= {});
      o[p.at(-1)] = (o[p.at(-1)] || []).filter((x) => !v.__remove.includes(x));
    } else {
      const p = k.split('.'); let o = cible;
      for (let i = 0; i < p.length - 1; i++) o = (o[p[i]] ||= {});
      o[p.at(-1)] = v;
    }
  }
};
const __db = {
  doc: (chemin) => ({
    _chemin: chemin,
    get: async () => { const d = __base[chemin]; return { exists: !!d, data: () => d,
      get: (k) => (d ? k.split('.').reduce((o, x) => (o || {})[x], d) : undefined) }; },
    update: async (maj) => { __ecrits.push({ chemin, maj });
      _applique((__base[chemin] ||= {}), maj); },
  }),
  collection: () => ({ get: async () => ({ docs: [] }), where: () => ({ get: async () => ({ docs: [] }) }) }),
  getAll: async () => [],
};
const initializeApp = () => ({});
const setGlobalOptions = () => {};
const getFirestore = () => __db;
const getMessaging = () => ({ sendEachForMulticast: async () => ({ responses: [], successCount: 0 }) });
const onDocumentWritten = (chemin, fn) => { globalThis.__onEcrit = fn; return fn; };
const onDocumentWrittenWithAuthContext = (chemin, fn) => { globalThis.__onDesist = fn; return fn; };
const onSchedule = (opt, fn) => fn;
`;
globalThis.__ecrits = ecrits; globalThis.__base = BASE;
fs.writeFileSync(TMP, bouchons + src.replace(/^exports\./gm, 'globalThis.__exp_'));
const { createRequire } = await import('module');
const require_ = createRequire(import.meta.url);
require_(TMP);
const trigger = globalThis.__onEcrit;
const desist = globalThis.__onDesist;

// `createTime` : la date de création posée par Firestore. Par défaut, le
// document a deux jours — un match ordinaire, créé avant d'être joué.
const IL_Y_A = (h) => ({ toMillis: () => Date.now() - h * 3600000 });
const ev = (before, after, id='m1', createTime = IL_Y_A(48)) => ({
  params: { matchId: id },
  data: {
    before: { exists: !!before, data: () => before },
    after: { exists: !!after, data: () => after, createTime,
      ref: { update: async (maj) => { ecrits.push({ chemin: 'matchs/'+id, maj });
        // on répercute sur l'objet `after` pour simuler Firestore
        const cible = after; const F = globalThis.__base;
        for (const [k, v] of Object.entries(maj)) {
          const p = k.split('.'); let o = cible;
          for (let i = 0; i < p.length - 1; i++) o = (o[p[i]] ||= {});
          if (v && v.__inc !== undefined) o[p.at(-1)] = (o[p.at(-1)] || 0) + v.__inc;
          else if (v && v.__union) o[p.at(-1)] = [...new Set([...(o[p.at(-1)] || []), ...v.__union])];
          else if (v && v.__remove) o[p.at(-1)] = (o[p.at(-1)] || []).filter((x) => !v.__remove.includes(x));
          else o[p.at(-1)] = v;
        } } } },
  },
});

const xp = (uid) => (BASE['users/' + uid] || {}).xp || 0;
let ko = 0;
const test = (nom, attendu, obtenu) => {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) ko++;
  console.log(`${ok ? '✓' : '✗'} ${nom}${ok ? '' : `  attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)}`}`);
};

// ---- 1. créer rapporte 50 ----
const m = { statut:'sondage', createurUid:'u1', votes:{}, creneauxProposes:[] };
await trigger(ev(null, m));
test('création : +50 au créateur', 50, xp('u1'));

// ---- 2. voter rapporte 10, une seule fois ----
const m2 = { ...m, votes:{ c1:['u2'] } };
await trigger(ev(m, m2));
test('vote : +10', 10, xp('u2'));
const m3 = { ...m2, votes:{ c1:[] } };
await trigger(ev(m2, m3));
const m4 = { ...m3, votes:{ c1:['u2'] }, _xp: m2._xp };
await trigger(ev(m3, m4));
test('dévoter puis revoter : toujours 10', 10, xp('u2'));

// ---- 3. supprimer rembourse ----
const avantSuppr = { ...m4, _xp: m2._xp || m4._xp };
await trigger(ev(avantSuppr, null));
test('suppression : créateur remboursé', 0, xp('u1'));
test('suppression : votant remboursé', 0, xp('u2'));

// ---- 4. la boucle créer/supprimer ne rapporte rien ----
for (let i = 0; i < 5; i++) {
  const mm = { statut:'sondage', createurUid:'u3', votes:{}, creneauxProposes:[] };
  await trigger(ev(null, mm));
  await trigger(ev(mm, null));
}
test('cinq cycles créer/supprimer : solde nul', 0, xp('u3'));

// Un jour de Paris, en 'YYYY-MM-DD', décalé de `j` jours.
const jourParis = (j) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + j * 86400000));
const HIER = jourParis(-1), DEMAIN = jourParis(1);
const creneauHier = [{ date: HIER, heure: '20:00', lieu: 'Five' }];

// ---- 5. le gros trou : terminer à dix joueurs puis supprimer ----
const joueurs = Array.from({length:10}, (_,i)=>'p'+i);
let conf = { statut:'confirmé', createurUid:'p0', joueursInscrits:joueurs,
             votes:{}, creneauxProposes:creneauHier, dateFinale:HIER, equipes:[] };
await trigger(ev(null, conf));                       // création
// Buts et passes : saisis par le créateur sur le match, transformés en
// statistiques de joueur par le trigger — le client n'a pas le droit
// d'écrire `stats`.
const fini = { ...conf, statut:'terminé', scoreA:3, scoreB:2,
               hommeDuMatchUid:'p1', attendance:{ p9:false },
               buts:{ p1:2, p2:1, p9:5 }, passes:{ p3:2 } };
await trigger(ev(conf, fini));                       // fin de match
const stat = (u,c) => (((BASE['users/'+u]||{}).stats||{})[c]||0);

test('buts crédités au bon joueur', 2, stat('p1','buts'));
test('passes créditées', 2, stat('p3','passes'));
// Le trigger ne fait confiance à personne : il lit un document que
// n'importe quel créateur a pu écrire, y compris avec un buteur absent.
test('un absent ne marque pas, même si le document le dit', 0, stat('p9','buts'));
// Aucune XP n'est attachée aux buts : en donner changerait le sens du
// classement, qui récompense la présence et l'organisation.
const totalApresFin = joueurs.reduce((n,u)=>n+xp(u), 0);
// Le lapin coûte −30, mais p9 n'avait rien : l'XP ne descend pas sous 0.
test('fin de match : 9×100 + 200 MVP + 50 création, lapin plafonné à 0', 1150, totalApresFin);

await trigger(ev(fini, null));                       // suppression
test('suppression après fin : tout repris', 0, joueurs.reduce((n,u)=>n+xp(u), 0));
test('statistiques reprises aussi', 0,
  joueurs.reduce((n,u)=>n + stat(u,'matchsJoues'), 0));
// Le grand livre `_xp` retient chaque `stats.*` crédité : les buts se
// reprennent donc tout seuls, sans une ligne de plus dans `rembourser`.
test('buts et passes repris aussi', 0,
  joueurs.reduce((n,u)=>n + stat(u,'buts') + stat(u,'passes'), 0));

// ---- 6. le farm : les garde-fous de fin de match ----
// Chaque scénario part d'un match neuf, avec des joueurs neufs, et ne
// change qu'UNE condition par rapport au cas qui paie.
let n = 0;
const scenario = async (modif = {}, createTime) => {
  const id = 'g' + (++n);
  const qui = Array.from({ length: 6 }, (_, i) => id + 'j' + i);
  const base = { statut:'confirmé', createurUid:qui[0], joueursInscrits:qui, votes:{},
                 creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:10, ...modif.avant };
  const fin = { ...base, statut:'terminé', scoreA:2, scoreB:1, hommeDuMatchUid:qui[1],
                attendance:{}, ...modif.fin };
  await trigger(ev(base, fin, id, createTime));
  return { qui, fin, total: qui.reduce((t, u) => t + xp(u), 0) };
};

let r = await scenario();
test('garde : un vrai match paie (6×100 + 200)', 800, r.total);

r = await scenario({ avant: { creneauxProposes:[{ date:DEMAIN, heure:'20:00', lieu:'Five' }], dateFinale:DEMAIN } });
test('garde : terminé AVANT le coup d’envoi, rien', 0, r.total);
test('garde : la raison est notée sur le match', 'avance', r.fin._xp && r.fin._xp.refus);

r = await scenario({}, IL_Y_A(1));
test('garde : match créé il y a une heure pour hier, rien', 0, r.total);
test('garde : raison « antidate »', 'antidate', r.fin._xp && r.fin._xp.refus);

r = await scenario({ avant: { dateFinale: null } });
test('garde : sans coup d’envoi connu, rien', 0, r.total);

{
  const id = 'g' + (++n);
  const qui = [id + 'a', id + 'b', id + 'c'];
  const base = { statut:'confirmé', createurUid:qui[0], joueursInscrits:qui, votes:{},
                 creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:10 };
  await trigger(ev(base, { ...base, statut:'terminé', scoreA:1, scoreB:0, attendance:{} }, id));
  test('garde : trois présents pour un match à dix, rien', 0, qui.reduce((t, u) => t + xp(u), 0));
  const deux = [id + 'x', id + 'y'];
  const petit = { ...base, joueursInscrits:deux, joueursMax:2 };
  await trigger(ev(petit, { ...petit, statut:'terminé', scoreA:1, scoreB:0, attendance:{} }, id + 'p'));
  test('garde : un match à deux places, complet, paie', 200, deux.reduce((t, u) => t + xp(u), 0));
}

// Le plafond : un même joueur, quatre vrais matchs le même jour.
{
  const fidele = 'fidele';
  for (let i = 0; i < 4; i++) {
    const id = 'q' + i;
    const qui = [fidele, id + 'b', id + 'c', id + 'd'];
    const base = { statut:'confirmé', createurUid:id + 'b', joueursInscrits:qui, votes:{},
                   creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:4 };
    await trigger(ev(base, { ...base, statut:'terminé', scoreA:1, scoreB:0,
      hommeDuMatchUid: fidele, attendance:{}, buts:{ [fidele]:1 } }, id));
  }
  test('plafond : trois fins de match payées par 24 h, pas quatre', 3 * 300, xp(fidele));
  test('plafond : la statistique aussi', 3, stat(fidele, 'matchsJoues'));
  test('plafond : les buts aussi', 3, stat(fidele, 'buts'));
}
{
  const orga = 'orga-farm';
  for (let i = 0; i < 5; i++) {
    await trigger(ev(null, { statut:'sondage', createurUid:orga, votes:{}, creneauxProposes:[] }, 'c' + i));
  }
  test('plafond : trois créations payées par 24 h, pas cinq', 3 * 50, xp(orga));
}
// Le lapin n'est jamais plafonné : le quota ne protège pas un absent.
{
  const id = 'lap';
  const qui = [id + 'a', id + 'b', id + 'c', id + 'd', 'fidele'];
  const base = { statut:'confirmé', createurUid:qui[0], joueursInscrits:qui, votes:{},
                 creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:10 };
  const avant = xp('fidele');
  await trigger(ev(base, { ...base, statut:'terminé', scoreA:0, scoreB:0,
    attendance:{ fidele:false } }, id));
  test('plafond : le lapin coûte même au-delà du quota', avant - 30, xp('fidele'));
}

// Buts : jamais plus qu'au score.
{
  const id = 'b1';
  const qui = [id + 'a', id + 'b', id + 'c', id + 'd'];
  const base = { statut:'confirmé', createurUid:qui[0], joueursInscrits:qui, votes:{},
                 creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:4 };
  await trigger(ev(base, { ...base, statut:'terminé', scoreA:1, scoreB:1, attendance:{},
    buts:{ [qui[0]]:15, [qui[1]]:1 }, passes:{ [qui[2]]:2 } }, id));
  test('buts : 16 attribués pour 2 au score, la table est refusée', 0, stat(qui[0], 'buts') + stat(qui[1], 'buts'));
  test('buts : le reste du match paie quand même', 400, qui.reduce((t, u) => t + xp(u), 0));
  test('passes : 2 pour 2 buts, acceptées', 2, stat(qui[2], 'passes'));
}

// ---- 7. la fiabilité : rendre d'abord, punir ce qui gêne ----
const hist = (u) => (BASE['users/' + u] || {}).historique || [];
// Un événement « écrit par » un joueur.
const evAuteur = (before, after, auteur, id) => ({ ...ev(before, after, id), authType: 'unknown', authId: auteur });
const dans = (h) => { const d = new Date(Date.now() + h * 3600000);
  return { dateFinale: { toMillis: () => d.getTime() }, creneauxProposes: [] }; };
{
  // Retirer son vote rend les +10 ; revoter repaie ; la boucle vaut +10.
  BASE['users/v1'] = { xp: 0 };
  const a = { statut:'sondage', createurUid:'o', votes:{ c0:[] }, creneauxProposes:[] };
  const b = { ...a, votes:{ c0:['v1'] } };
  await trigger(ev(a, b, 'vv'));
  const c = { ...b, votes:{ c0:[] }, _xp: b._xp };
  await trigger(ev(b, c, 'vv'));
  test('retirer son vote rend les 10 XP', 0, xp('v1'));
  const d = { ...c, votes:{ c0:['v1'] }, _xp: c._xp };
  await trigger(ev(c, d, 'vv'));
  test('revoter repaie : voter/retirer/revoter vaut +10, jamais plus', 10, xp('v1'));
}
{
  const base = (h, extra = {}) => ({ statut:'confirmé', createurUid:'o', joueursInscrits:['o','dp'], waitlist:[], ...dans(h), ...extra });
  BASE['users/dp'] = { xp: 100 };
  await desist(evAuteur(base(72), { ...base(72), joueursInscrits:['o'] }, 'dp', 'd1'));
  test('désistement à plus de 48 h : gratuit', 100, xp('dp'));
  await desist(evAuteur(base(30), { ...base(30), joueursInscrits:['o'] }, 'dp', 'd2'));
  test('désistement entre 48 h et 24 h : −10', 90, xp('dp'));
  await desist(evAuteur(base(5), { ...base(5), joueursInscrits:['o'] }, 'dp', 'd3'));
  test('désistement à moins de 24 h : −25', 65, xp('dp'));
  test('… et compte comme « D » dans l’historique', ['D'], hist('dp'));
  BASE['users/rp'] = { xp: 100 };
  const avecBanc = { ...base(5), joueursInscrits:['o','rp'], waitlist:['remp'] };
  await desist(evAuteur(avecBanc, { ...avecBanc, joueursInscrits:['o','remp'], waitlist:[] }, 'rp', 'd4'));
  test('remplacé par le banc : pénalité divisée par deux (−12, arrondi pour le joueur)', 88, xp('rp'));
  BASE['users/sorti'] = { xp: 100 };
  const b5 = { ...base(5), joueursInscrits:['o','sorti'] };
  await desist(evAuteur(b5, { ...b5, joueursInscrits:['o'] }, 'o', 'd5'));
  test('sorti par l’organisateur : aucune pénalité', 100, xp('sorti'));
  BASE['users/sd'] = { xp: 100 };
  const sansDate = { statut:'sondage', createurUid:'o', joueursInscrits:['o','sd'], creneauxProposes:[] };
  await desist(evAuteur(sansDate, { ...sansDate, joueursInscrits:['o'] }, 'sd', 'd6'));
  test('match sans date confirmée : aucune pénalité', 100, xp('sd'));
  BASE['users/pl'] = { xp: 10 };
  const bp = { ...base(2), joueursInscrits:['o','pl'] };
  await desist(evAuteur(bp, { ...bp, joueursInscrits:['o'] }, 'pl', 'd7'));
  test('l’XP ne descend jamais sous zéro', 0, xp('pl'));
  // Plafond : trois pénalités par 24 h au plus.
  BASE['users/pf'] = { xp: 1000 };
  for (let i = 0; i < 5; i++) {
    const bi = { ...base(2), joueursInscrits:['o','pf'] };
    await desist(evAuteur(bi, { ...bi, joueursInscrits:['o'] }, 'pf', 'p' + i));
  }
  test('plafond : trois pénalités par 24 h, pas cinq', 1000 - 3 * 25, xp('pf'));
  const sys = { ...base(2), joueursInscrits:['o','dp2'] };
  BASE['users/dp2'] = { xp: 50 };
  await desist({ ...ev(sys, { ...sys, joueursInscrits:['o'] }, 'd8'), authType: 'service_account', authId: undefined });
  test('une écriture du serveur ne pénalise personne', 50, xp('dp2'));
}
{
  // Supprimer un match confirmé où d'autres sont inscrits : −20 en plus.
  BASE['users/org'] = { xp: 200 };
  const conf2 = { statut:'confirmé', createurUid:'org', joueursInscrits:['org','x1'], votes:{}, creneauxProposes:[] };
  await trigger(ev(conf2, null, 'sup1'));
  test('supprimer un match confirmé avec des inscrits : −20', 180, xp('org'));
  const seul = { ...conf2, joueursInscrits:['org'] };
  await trigger(ev(seul, null, 'sup2'));
  test('… mais rien s’il était seul inscrit', 180, xp('org'));
}
{
  // Historique : joué / lapin en fin de match, dix derniers seulement.
  const id = 'h1';
  // Cinq inscrits dont un absent : quatre présents, le minimum pour payer.
  const qui = ['ha','hb','hc','he','hd'];
  qui.forEach(u => BASE['users/' + u] = { xp: 100, historique: Array(10).fill('J') });
  const base = { statut:'confirmé', createurUid:'ha', joueursInscrits:qui, votes:{},
                 creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:5 };
  await trigger(ev(base, { ...base, statut:'terminé', scoreA:1, scoreB:0, attendance:{ hd:false } }, id));
  test('historique : le lapin entre, la fenêtre reste à 10', 10, hist('hd').length);
  test('historique : dernier match noté L', 'L', hist('hd').at(-1));
  test('historique : un présent est noté J', 'J', hist('ha').at(-1));
  // Le lapin à 100 XP perd 30 ; si le match disparaît, il récupère 30 — pas plus.
}
{
  BASE['users/z0'] = { xp: 0 };
  const qui = ['za','zb','zc','zd','z0'];
  ['za','zb','zc','zd'].forEach(u => BASE['users/' + u] = { xp: 0 });
  const base = { statut:'confirmé', createurUid:'za', joueursInscrits:qui, votes:{},
                 creneauxProposes:creneauHier, dateFinale:HIER, joueursMax:5 };
  const fin = { ...base, statut:'terminé', scoreA:0, scoreB:0, attendance:{ z0:false } };
  await trigger(ev(base, fin, 'z1'));
  await trigger(ev(fin, null, 'z1'));
  test('lapin à 0 XP puis match supprimé : il ne gagne rien au passage', 0, xp('z0'));
}

console.log(ko ? `\n✗ ${ko} test(s) en échec` : '\n✓ tous les tests passent');
try { fs.unlinkSync(TMP); } catch (_) {}
process.exit(ko ? 1 : 0);
