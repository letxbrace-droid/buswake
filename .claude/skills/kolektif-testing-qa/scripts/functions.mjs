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

const ev = (before, after, id='m1') => ({
  params: { matchId: id },
  data: {
    before: { exists: !!before, data: () => before },
    after: { exists: !!after, data: () => after,
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

// ---- 5. le gros trou : terminer à dix joueurs puis supprimer ----
const joueurs = Array.from({length:10}, (_,i)=>'p'+i);
let conf = { statut:'confirmé', createurUid:'p0', joueursInscrits:joueurs,
             votes:{}, creneauxProposes:[], equipes:[] };
await trigger(ev(null, conf));                       // création
const fini = { ...conf, statut:'terminé', scoreA:3, scoreB:2,
               hommeDuMatchUid:'p1', attendance:{} };
await trigger(ev(conf, fini));                       // fin de match
const totalApresFin = joueurs.reduce((n,u)=>n+xp(u), 0);
test('fin de match : 10×100 + 200 MVP + 50 création', 1250, totalApresFin);
await trigger(ev(fini, null));                       // suppression
test('suppression après fin : tout repris', 0, joueurs.reduce((n,u)=>n+xp(u), 0));
test('statistiques reprises aussi', 0,
  joueurs.reduce((n,u)=>n + (((BASE['users/'+u]||{}).stats||{}).matchsJoues||0), 0));

console.log(ko ? `\n✗ ${ko} test(s) en échec` : '\n✓ tous les tests passent');
try { fs.unlinkSync(TMP); } catch (_) {}
process.exit(ko ? 1 : 0);
