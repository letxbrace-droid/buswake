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
const onSchedule = (opt, fn) => fn;
`;
globalThis.__ecrits = ecrits; globalThis.__base = BASE;
fs.writeFileSync(TMP, bouchons + src.replace(/^exports\./gm, 'globalThis.__exp_'));
const { createRequire } = await import('module');
const require_ = createRequire(import.meta.url);
require_(TMP);
const trigger = globalThis.__onEcrit;

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
test('fin de match : 9×100 + 200 MVP + 50 création − 15 lapin', 1135, totalApresFin);

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
  test('plafond : le lapin coûte même au-delà du quota', avant - 15, xp('fidele'));
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

console.log(ko ? `\n✗ ${ko} test(s) en échec` : '\n✓ tous les tests passent');
try { fs.unlinkSync(TMP); } catch (_) {}
process.exit(ko ? 1 : 0);
