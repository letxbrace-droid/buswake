#!/usr/bin/env node
// PORTÉE — le test que l'app n'avait pas le jour où elle est tombée.
//
// Charge index.html en entier et vérifie que chaque fonction d'écran est
// bien au niveau du module, appelable, et qu'aucune erreur ne remonte.
// Une fonction déclarée par accident À L'INTÉRIEUR d'une autre passe
// toutes les relectures et casse l'onglet en production.
import fs from 'fs';
import path from 'path';
import { ouvrir, fixturesParDefaut, RACINE } from './lib/harnais.mjs';

// ===== APPELÉE MAIS JAMAIS DÉFINIE =====
// Une fonction supprimée par une substitution maladroite pendant que ses
// appels restent en place ne casse RIEN au rendu : l'erreur n'arrive qu'au
// clic, en production. C'est arrivé à `annonceXP`, appelée cinq fois et
// définie zéro — et le test de portée ne l'a pas vue, parce qu'il n'exerce
// que le rendu.
//
// Deux étapes, parce qu'une seule ne suffit pas :
//  1. on relève les noms appelés dans le SOURCE, commentaires et chaînes
//     effacés — sinon « la vie (…) » et `var(--orange)` deviennent des
//     appels de fonction, et le test crie au loup cent fois ;
//  2. on demande à la PAGE si chaque nom existe dans la portée du module.
//     C'est la seule réponse exacte : la portée d'un module ne se devine
//     pas depuis le texte.

// Efface commentaires et littéraux, en gardant le code des `${...}`.
// Le comptage d'accolades ignore ce qui est entre guillemets : sans ça, un
// `${ x === '}' ? a : b }` désynchronise le scanner et recrache du
// commentaire en clair — c'est ainsi que « la vie (…) » devenait vie().
function sansCommentairesNiChaines(src) {
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'" || c === '"') {
      const q = c; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; out += ' '; continue;
    }
    if (c === '`') {
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') { i++; break; }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2;
          let prof = 1, bout = '';
          while (i < n && prof > 0) {
            const k = src[i];
            if (k === "'" || k === '"' || k === '`') {          // on saute la chaîne entière
              const q = k; bout += ' '; i++;
              while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
              i++; continue;
            }
            if (k === '{') prof++;
            else if (k === '}') { prof--; if (!prof) { i++; break; } }
            bout += k; i++;
          }
          out += ' ' + sansCommentairesNiChaines(bout) + ' ';
          continue;
        }
        i++;
      }
      out += ' '; continue;
    }
    out += c; i++;
  }
  return out;
}

// Tout ce qui est déclaré QUELQUE PART dans le fichier — y compris les
// fonctions locales définies à l'intérieur d'une autre. Elles sont
// invisibles depuis la portée du module, mais parfaitement légitimes.
function nomsDeclares(propre) {
  const d = new Set();
  for (const re of [/function\s+([A-Za-z_$][\w$]*)/g,
                    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
                    /window\.([A-Za-z_$][\w$]*)\s*=/g,
                    /import\s*\{([^}]*)\}/g,
                    /([A-Za-z_$][\w$]*)\s*[:,]\s*(?:async\s+)?(?:function|\()/g,
                    /\(\s*([A-Za-z_$][\w$]*)\s*(?:,|\))\s*=>/g]) {
    for (const m of propre.matchAll(re)) {
      for (const nom of m[1].split(/[,\s]+/)) if (nom) d.add(nom.trim());
    }
  }
  return d;
}

function appelsOrphelins(racine) {
  const doc = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
  const js = doc.slice(doc.indexOf('<script type="module">'));
  const propre = sansCommentairesNiChaines(js);
  const declares = nomsDeclares(propre);
  const MOTS = new Set(['if','for','while','switch','catch','return','typeof','await','new',
                        'function','do','else','delete','void','in','of','case','yield','super','async']);
  const noms = new Map();
  // Le caractère qui précède doit être un non-mot ASCII. Sans cette borne,
  // « Échec ( » laisse échapper chec() : `\w` est ASCII, donc un accent
  // compte comme séparateur. C'est le dernier résidu d'un gabarit imbriqué
  // que le scanner ne démêle pas complètement — la limite est assumée.
  for (const m of propre.matchAll(/(^|[^\w$.\u00C0-\u024F])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nom = m[2];
    if (MOTS.has(nom) || declares.has(nom)) continue;
    noms.set(nom, (noms.get(nom) || 0) + 1);
  }
  return noms;
}

const ATTENDUES = [
  'renderHome','renderMatchs','renderEquipes','renderClassement','renderProfil',
  'renderCmModal','openCreateMatch','openCreerEquipe','openMenu','menuHTML',
  'joursHTML','setJour','matchOccupeJour','libelleJour',
  'ctaJouerHTML','appelsHTML','autourDeToiHTML','carteEquipeHTML','blasonHTML',
  'kolektifPulse','etatEquipe','effectifEquipe','chargerDefis','carteDefiHTML',
  'pointsEquipe','diffButs','escapeHtml','rayonKm','dansLeRayon',
];

// `currentUser` est une variable de module : on ne peut pas l'atteindre
// depuis window. Le harnais expose un setter plutôt que de deviner.
const exporte = 'window.__portee = { ' + ATTENDUES.join(', ')
  + ", __connecte(u){ currentUser = { uid: u }; currentUserData = { pseudo: 'Sam', xp: 1240 }; },"
  + "  __existe(n){ try { return typeof eval(n) !== 'undefined'; } catch (_) { return false; } } };";
const { page, erreurs, fermer } = await ouvrir({ fixtures: fixturesParDefaut(), exporte });

const r = await page.evaluate(async (noms) => {
  const t = window.__portee;
  if (!t) return { fatal: "le module ne s'est pas évalué — une fonction attendue est absente ou mal portée" };
  const manquantes = noms.filter(n => typeof t[n] !== 'function');
  const rendus = {};
  for (const [ecran, fn] of [['home','renderHome'],['matchs','renderMatchs'],
       ['equipes','renderEquipes'],['classement','renderClassement'],['profil','renderProfil']]) {
    try {
      t.__connecte('u1');
      await t[fn]();
      const el = document.getElementById(ecran + '-content');
      rendus[ecran] = el && el.innerHTML.length > 40 ? 'OK ' + el.innerHTML.length + ' car.' : 'VIDE';
    } catch (e) { rendus[ecran] = 'ERREUR ' + e.message; }
  }
  return { manquantes, rendus };
}, ATTENDUES);

let ko = 0;
const candidats = appelsOrphelins(RACINE);
const orphelines = await page.evaluate((noms) => {
  const t = window.__portee;
  return noms.filter(([n]) => !t.__existe(n));
}, [...candidats.entries()]);
if (orphelines.length) {
  ko++;
  console.log('✗ appelée(s) mais jamais définie(s) : '
    + orphelines.map(([n, c]) => `${n}() ×${c}`).join(', '));
} else console.log(`✓ ${candidats.size} noms appelés, tous définis`);

if (r.fatal) { console.log('✗ ' + r.fatal); ko++; }
else {
  if (r.manquantes.length) { console.log('✗ hors portée : ' + r.manquantes.join(', ')); ko++; }
  else console.log(`✓ ${ATTENDUES.length} fonctions au niveau du module`);
  for (const [e, v] of Object.entries(r.rendus)) {
    const bon = v.startsWith('OK');
    if (!bon) ko++;
    console.log(`${bon ? '✓' : '✗'} ${e.padEnd(11)} ${v}`);
  }
}
if (erreurs.length) { ko++; console.log('✗ erreurs page : ' + [...new Set(erreurs)].slice(0, 4).join(' | ')); }
else console.log('✓ aucune erreur page');
await fermer();
process.exit(ko ? 1 : 0);
