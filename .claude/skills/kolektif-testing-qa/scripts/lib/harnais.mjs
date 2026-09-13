// Harnais commun : charge index.html EN ENTIER, Firebase remplacé par des
// bouchons, dans un vrai navigateur.
//
// Pourquoi le document entier et pas un extrait : le jour où cinq fonctions
// d'écran se sont retrouvées imbriquées dans renderHome par accident, l'app
// est partie en production avec un onglet mort. Le harnais de l'époque
// fabriquait le HTML à la main — il n'a jamais exercé la portée des
// fonctions. Celui-ci évalue le module réel.
import fs from 'fs';
import path from 'path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

export const RACINE = process.env.KOLEKTIF_RACINE || process.cwd();
export const CHROME = process.env.KOLEKTIF_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Bouchons Firebase. Toute fonction importée par index.html doit exister
// ici, sinon le module ne s'évalue pas et TOUT le fichier est mort.
function bouchons(fixtures) {
  return `
const _FIX = ${JSON.stringify(fixtures.matchs || [])}.map(x => ({
  id: x.id,
  data: () => JSON.parse(JSON.stringify(x.d), (k, v) =>
    (typeof v === 'string' && /^\\d{4}-\\d{2}-\\d{2}T/.test(v)) ? new Date(v) : v),
}));
const _USER = ${JSON.stringify(fixtures.user || { pseudo: 'Sam', xp: 1240, badges: [], atouts: {} })};
const _EQ = ${JSON.stringify(fixtures.equipes || [])}.map(x => ({ id: x.id, data: () => x.d }));
const _US = ${JSON.stringify(fixtures.users || [])}.map(x => ({ id: x.id, data: () => x.d }));
const initializeApp=()=>({}), getAuth=()=>({}), getFirestore=()=>({}), getMessaging=()=>({});
const doc=(db,col,id)=>({_doc:true,_col:col,_id:id}), setDoc=async()=>{}, updateDoc=async()=>{}, addDoc=async()=>({id:'x'}),
 collection=(db,nom)=>({_col:nom}), where=(f,o,v)=>({f,o,v}), orderBy=(f,d)=>({_ord:f,_dir:d||'asc'}),
 serverTimestamp=()=>({}), increment=n=>n, arrayUnion=()=>[], arrayRemove=()=>[],
 deleteField=()=>({}), deleteDoc=async()=>{}, limit=()=>({}), onAuthStateChanged=()=>{},
 createUserWithEmailAndPassword=async()=>{}, signInWithEmailAndPassword=async()=>{},
 signOut=async()=>{}, GoogleAuthProvider=function(){}, signInWithPopup=async()=>{},
 deleteUser=async()=>{}, reauthenticateWithCredential=async()=>{},
 reauthenticateWithPopup=async()=>{}, EmailAuthProvider={credential:()=>({})},
 updatePassword=async()=>{}, getToken=async()=>'', isSupported=async()=>false,
 onMessage=()=>{};
const query=(...a)=>({a, _col:(a[0]&&a[0]._col)||'', _ord:(a.find(x=>x&&x._ord)||null)});
// Un instantané de DOCUMENT, pas de collection : exists() et data(), pas
// docs. Tant que les deux étaient confondus, l'écoute du détail d'un match
// levait « snap.exists is not a function » — et cet écran, le plus consulté
// de l'app, n'était jamais exercé par les tests.
const _lot=(col)=> col==='equipes' ? _EQ : col==='users' ? _US : _FIX;
const _instantDoc=(ref)=>{
  const d=(_lot(ref&&ref._col)||[]).find(x=>x.id===(ref&&ref._id));
  return { id:(ref&&ref._id)||'x', ref, exists:()=>!!d || (ref&&ref._col)==='users',
           data:()=> d ? d.data() : ((ref&&ref._col)==='users' ? _USER : undefined),
           get:(k)=>{ const o=d?d.data():null; return o?o[k]:undefined; } };
};
const getDoc=async(ref)=>_instantDoc(ref);
const _trier=(docs,q)=>{
  const o=q&&q._ord; if(!o) return docs;
  const s=[...docs].sort((a,b)=>((a.data()[o._ord]??0)>(b.data()[o._ord]??0)?1:-1));
  return o._dir==='desc' ? s.reverse() : s;
};
const getDocs=async(q)=>{
  const col=(q&&q._col)||'';
  if (col==='equipes') return {docs:_trier(_EQ,q)};
  if (col==='users') return {docs:_trier(_US,q)};
  if (col && col!=='matchs') return {docs:[]};
  const ws=(q&&q.a||[]).filter(x=>x&&x.f);
  if (ws.some(x=>x.f==='statut'&&x.v==='terminé')) return {docs:[]};
  return {docs:_trier(_FIX,q)};
};
const getDocsFromServer=getDocs;
// onSnapshot RAPPELLE. Tant qu'il ne faisait rien, l'écran Matchs restait
// sur ses squelettes : sa liste passe par une écoute temps réel, donc elle
// n'était jamais exercée — ni son état vide, ni ses cartes.
const onSnapshot=(cible,cb)=>{
  const suite = typeof cb === 'function' ? cb : (cb && cb.next);
  if (!suite) return () => {};
  if (cible && cible._doc) { Promise.resolve().then(()=>{ try { suite(_instantDoc(cible)); } catch (_) {} }); return () => {}; }
  Promise.resolve(getDocs(cible)).then(s => { try { suite(s); } catch (_) {} });
  return () => {};
};
`;
}

// Écrit le document instrumenté. Il doit vivre À LA RACINE du dépôt :
// les images, les polices et le manifeste sont référencés en relatif.
export function ecrireHarnais(fixtures = {}, exporte = '') {
  let doc = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  doc = doc.replace(/^import[\s\S]*?from '[^']*';$/gm, '');
  doc = doc.replace('<script type="module">', '<script type="module">' + bouchons(fixtures));
  if (exporte) {
    const m = doc.match(/<script type="module">[\s\S]*?\n\s*<\/script>/);
    const cut = m.index + m[0].lastIndexOf('</script>');
    doc = doc.slice(0, cut) + '\n' + exporte + '\n' + doc.slice(cut);
  }
  const p = path.join(RACINE, '_harnais.html');
  fs.writeFileSync(p, doc);
  return p;
}

export function nettoyer() {
  const p = path.join(RACINE, '_harnais.html');
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Ouvre le harnais, masque le splash, révèle l'app, connecte un joueur.
export async function ouvrir({ fixtures = {}, exporte = '', largeur = 400, hauteur = 880, dpr = 2 } = {}) {
  const fichier = ecrireHarnais(fixtures, exporte);
  const nav = await chromium.launch({ executablePath: CHROME });
  const page = await nav.newPage({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: dpr });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.goto('file://' + fichier);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    document.getElementById('loading-screen')?.remove();
    document.getElementById('auth-screen')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
  });
  return { nav, page, erreurs, fermer: async () => { await nav.close(); nettoyer(); } };
}

// Jeu d'essai par défaut : un match confirmé aujourd'hui, deux sondages.
export function fixturesParDefaut() {
  const J = (n, h) => { const d = new Date(); d.setHours(h, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); };
  return {
    user: { pseudo: 'Sam', xp: 1240, badges: [], atouts: {}, stats: {}, posteFavori: 'milieu' },
    users: [
      { id: 'u1', d: { pseudo: 'Sam',    xp: 1240, codePostal: '91300', stats: { matchsJoues: 12, hommeDuMatch: 2 } } },
      { id: 'u9', d: { pseudo: 'Karim',  xp: 3120, codePostal: '91300', stats: { matchsJoues: 28, hommeDuMatch: 6 } } },
      { id: 'u8', d: { pseudo: 'Lina',   xp: 2040, codePostal: '91120', stats: { matchsJoues: 19, hommeDuMatch: 3 } } },
      { id: 'u7', d: { pseudo: 'Théo',   xp:  880, codePostal: '91300', stats: { matchsJoues:  9, hommeDuMatch: 1 } } },
      { id: 'u6', d: { pseudo: 'Ayoub',  xp:  410, codePostal: '91400', stats: { matchsJoues:  5, hommeDuMatch: 0 } } },
    ],
    equipes: [
      { id: 'e1', d: { nom: 'Massy United', capitaineUid: 'u9', sport: 'foot5',
        niveau: 'intermediaire', membres: ['u9','u8','u7'], couleur: '#5DD62C',
        embleme: 'eclair', ville: 'Massy', appel: 'Vendredi 20:30',
        stats: { matchs: 4, victoires: 3, nuls: 0, defaites: 1, butsPour: 18, butsContre: 11, serie: 2 } } },
      { id: 'e2', d: { nom: 'Palaiseau FC', capitaineUid: 'u5', sport: 'foot5',
        niveau: 'debutant', membres: ['u5','u6'], couleur: '#00B0FF', embleme: 'tour',
        stats: { matchs: 2, victoires: 0, nuls: 1, defaites: 1, butsPour: 5, butsContre: 9, serie: 0 } } },
    ],
    matchs: [
      { id: 'm1', d: { statut: 'confirmé', visibilite: 'public', sport: 'foot5', createurUid: 'u1',
        dateFinale: J(0, 20), lieuFinal: 'City Five Massy',
        joueursInscrits: ['u1','u2','u3','u4','u5','u6','u7'],
        creneauxProposes: [{ id: 'c1', date: J(0, 20), heure: '20:00', lieu: 'City Five Massy' }],
        createdAt: null } },
      { id: 'm2', d: { statut: 'sondage', visibilite: 'public', sport: 'foot5', createurUid: 'u2',
        joueursInscrits: ['u2','u3','u4'], votes: { c2: ['u2','u3'], c3: ['u4'] },
        creneauxProposes: [
          { id: 'c2', date: J(2, 19), heure: '19:00', lieu: 'Le Five Palaiseau' },
          { id: 'c3', date: J(5, 14), heure: '14:00', lieu: 'Le Five Palaiseau' }],
        createdAt: null } },
      { id: 'm3', d: { statut: 'sondage', visibilite: 'public', sport: 'foot5', createurUid: 'u3',
        joueursInscrits: ['u3'], votes: { c4: ['u3'] },
        creneauxProposes: [{ id: 'c4', date: J(2, 21), heure: '21:00', lieu: 'Urban Soccer Wissous' }],
        createdAt: null } },
    ],
  };
}
