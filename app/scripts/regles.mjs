#!/usr/bin/env node
// Éprouve `firestore.rules` contre le VRAI moteur de règles : l'émulateur
// Firestore de Google, lancé le temps des tests puis arrêté.
//
// Une règle se lit mal et se teste peu : `hasOnly`, `diff`, `get(…, défaut)`
// ont chacun une sémantique que l'on croit connaître. Ici chaque règle est
// essayée dans les DEUX sens — l'écriture légitime passe, la triche échoue —
// sur le moteur qui tournera en production.
//
// L'émulateur est un jar Java (~65 Mo), mis en cache hors du dépôt au premier
// lancement. Sans Java, le contrôle échoue en le disant : un banc de règles
// qui se saute en silence ne protège rien.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(ICI, '..');
const VERSION = '1.19.7';
const URL_JAR = `https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v${VERSION}.jar`;
const CACHE = process.env.KOLEKTIF_CACHE || path.join(os.homedir(), '.cache', 'kolektif');
const JAR = path.join(CACHE, `firestore-emulator-${VERSION}.jar`);

function echec(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

if (spawnSync('java', ['-version'], { stdio: 'ignore' }).status !== 0) {
  echec('Java introuvable : l’émulateur Firestore en a besoin (JRE 11+).');
}
if (!existsSync(JAR)) {
  mkdirSync(CACHE, { recursive: true });
  console.log('Téléchargement de l’émulateur Firestore ' + VERSION + '…');
  const r = spawnSync('curl', ['-sSfL', '-o', JAR, URL_JAR], { stdio: 'inherit' });
  if (r.status !== 0) echec('téléchargement impossible : ' + URL_JAR);
}

const port = await new Promise((ok) => {
  const s = createServer().listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => ok(p));
  });
});

// Le journal de l'émulateur va dans un FICHIER, pas dans un tuyau. Un tuyau
// doit être vidé par ce processus ; or `spawnSync`, plus bas, bloque sa
// boucle d'événements le temps des tests. Le tuyau se remplit, l'émulateur
// se fige en écrivant son journal, et il accepte alors les connexions sans
// plus jamais répondre — les tests attendent pour toujours.
const JOURNAL = path.join(CACHE, 'firestore-emulator.log');
const fd = openSync(JOURNAL, 'w');
const emu = spawn('java', ['-jar', JAR, '--host=127.0.0.1', '--port=' + port], {
  stdio: ['ignore', fd, fd],
});
const finJournal = () => readFileSync(JOURNAL, 'utf8').slice(-4000);
const arreter = () => emu.kill('SIGTERM');
process.on('exit', arreter);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(1));

// Prêt quand l'émulateur répond en HTTP.
const debut = Date.now();
for (;;) {
  try {
    await fetch(`http://127.0.0.1:${port}/`);
    break;
  } catch {
    if (emu.exitCode !== null) echec('l’émulateur s’est arrêté au démarrage\n' + finJournal());
    if (Date.now() - debut > 60_000) echec('l’émulateur ne répond pas après 60 s');
    await new Promise((r) => setTimeout(r, 250));
  }
}

const dossier = path.join(APP, 'regles');
const fichiers = readdirSync(dossier)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => path.join(dossier, f));
const r = spawnSync(process.execPath, [
  // Le SDK Firestore garde ses flux ouverts après les tests : sans
  // `--test-force-exit`, le processus ne rend jamais la main.
  '--test', '--test-concurrency=1', '--test-force-exit',
  ...fichiers,
], {
  stdio: 'inherit',
  cwd: APP,
  // Filet : un test bloqué échoue au bout de cinq minutes au lieu de geler
  // la suite entière.
  timeout: 300_000,
  env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:' + port },
});
arreter();
process.exit(r.status ?? 1);
