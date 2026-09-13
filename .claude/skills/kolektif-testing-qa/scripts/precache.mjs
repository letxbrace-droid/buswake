#!/usr/bin/env node
// PRÉCACHE — l'inventaire du service worker, vérifié et pesé.
//
// Trois pannes possibles, toutes silencieuses :
//  1. un fichier listé qui n'existe pas → addAll() rejette, et TOUT le
//     précache échoue : l'app n'est plus installable hors-ligne ;
//  2. un fichier présent dans le dépôt mais absent de la liste → il
//     manquera hors-ligne, sans message ;
//  3. la version du cache non incrémentée → les correctifs restent
//     invisibles derrière l'ancien cache.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const RACINE = process.env.KOLEKTIF_RACINE || process.cwd();
const sw = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
const version = (sw.match(/const CACHE = '([^']+)'/) || [])[1] || '(introuvable)';
const liste = [...(sw.match(/PRECACHE = \[([\s\S]*?)\];/) || [,''])[1].matchAll(/'\.\/([^']*)'/g)]
  .map(m => m[1] || 'index.html');

let ko = 0;
const manquants = liste.filter(f => !fs.existsSync(path.join(RACINE, f)));
if (manquants.length) { ko++; console.log('✗ listés mais absents du disque : ' + manquants.join(', ')); }
else console.log(`✓ ${liste.length} entrées, toutes présentes`);

const doublons = liste.filter((f, i) => liste.indexOf(f) !== i);
if (doublons.length) console.log('! même fichier mis en cache deux fois : ' + [...new Set(doublons)].join(', '));

const tailles = liste.map(f => [fs.existsSync(path.join(RACINE, f)) ? fs.statSync(path.join(RACINE, f)).size : 0, f]);
const total = tailles.reduce((s, [t]) => s + t, 0);
console.log(`  poids du précache : ${(total/1024).toFixed(0)} Ko`);
tailles.sort((a,b)=>b[0]-a[0]).slice(0,6).forEach(([t,f]) => console.log(`    ${(t/1024).toFixed(0).padStart(5)} Ko  ${f}`));
if (total > 3 * 1024 * 1024) { ko++; console.log('✗ au-delà de 3 Mo : la première visite devient trop lourde'); }

// La version doit changer dès que l'un des fichiers change.
try {
  const modifies = execSync('git diff --name-only HEAD', { cwd: RACINE }).toString().trim().split('\n').filter(Boolean);
  const touche = modifies.filter(f => liste.includes(f));
  const swModifie = modifies.includes('sw.js');
  if (touche.length && !swModifie) {
    ko++;
    console.log(`✗ ${touche.length} fichier(s) du précache modifié(s) sans toucher à sw.js — la version ${version} doit être incrémentée`);
    console.log('   ' + touche.slice(0, 6).join(', '));
  } else if (touche.length) {
    console.log(`✓ ${touche.length} fichier(s) du précache modifié(s), et sw.js l'est aussi (${version})`);
  } else {
    console.log(`✓ aucun fichier du précache modifié (version ${version})`);
  }
} catch (_) { console.log('  (hors dépôt git : contrôle de version du cache ignoré)'); }

// Assets présents dans le dépôt mais jamais référencés nulle part.
// On cherche dans TOUTES les pages du site, pas seulement index.html :
// les bannières og-*.jpg ne sont citées que par les redirections m/*.html.
let texte = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8') + sw;
for (const d of ['m', 'marketing']) {
  const dir = path.join(RACINE, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) texte += fs.readFileSync(path.join(dir, f), 'utf8');
}
const surDisque = fs.readdirSync(RACINE).filter(f => /\.(jpg|png|woff2)$/.test(f));
const orphelins = surDisque.filter(f => !liste.includes(f) && !texte.includes(f));
if (orphelins.length) console.log('! présents dans le dépôt, référencés nulle part : ' + orphelins.join(', '));
else console.log('✓ aucun asset orphelin');

process.exit(ko ? 1 : 0);
