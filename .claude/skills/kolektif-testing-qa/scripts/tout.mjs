#!/usr/bin/env node
// Enchaîne les contrôles automatiques et renvoie un code de sortie unique.
//
// Depuis la migration vers la v2, l'essentiel du harnais vit DANS le projet
// (`app/`) : types, tests unitaires, lint et sondes du site construit. Ce
// script n'en est plus que le chef d'orchestre — il ajoute le seul contrôle
// qui ne peut pas y vivre, celui des fonctions serveur, qui n'ont ni build
// ni dépendances communes avec l'app.
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = process.env.KOLEKTIF_RACINE || path.resolve(ICI, '../../../..');
const APP = path.join(RACINE, 'app');

const ETAPES = [
  ['types', 'npm', ['run', '--silent', 'build'], APP],
  ['lint', 'npm', ['run', '--silent', 'lint'], APP],
  ['tests unitaires', 'npm', ['run', '--silent', 'test'], APP],
  ['sondes du site construit', 'node', ['scripts/qa.mjs'], APP],
  ['racine publiée', 'node', ['scripts/verifier-racine.mjs'], APP],
  ['XP côté serveur', process.execPath, [path.join(ICI, 'functions.mjs')], RACINE],
];

let ko = 0;
for (const [nom, cmd, args, cwd] of ETAPES) {
  console.log('\n── ' + nom + ' ──');
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd });
  if (r.status !== 0) ko++;
}
console.log('\n' + (ko ? `✗ ${ko} contrôle(s) en échec` : '✓ tous les contrôles passent'));
process.exit(ko ? 1 : 0);
