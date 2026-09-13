#!/usr/bin/env node
// Enchaîne les contrôles automatiques et renvoie un code de sortie unique.
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const ETAPES = [
  ['portée des fonctions', 'portee.mjs'],
  ['surfaces translucides', 'plaques.mjs'],
  ['contraste WCAG AA', 'contraste.mjs'],
  ['précache du service worker', 'precache.mjs'],
  ['XP côté serveur', 'functions.mjs'],
];
let ko = 0;
for (const [nom, script] of ETAPES) {
  console.log('\n── ' + nom + ' ──');
  const r = spawnSync(process.execPath, [path.join(ICI, script)], { stdio: 'inherit' });
  if (r.status !== 0) ko++;
}
console.log('\n' + (ko ? `✗ ${ko} contrôle(s) en échec` : '✓ tous les contrôles passent'));
process.exit(ko ? 1 : 0);
