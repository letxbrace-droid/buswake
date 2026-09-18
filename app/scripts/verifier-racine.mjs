/**
 * Vérifie LA RACINE PUBLIÉE, pas `dist/`.
 *
 * `qa.mjs` mesure le build. Ce script mesure ce que GitHub Pages servira
 * vraiment : la racine du dépôt, sous un sous-chemin, avec le service worker
 * installé et la v1 posée à côté. Trois choses n'existent qu'à ce niveau-là
 * et ne peuvent donc pas être vues ailleurs :
 *
 *  1. le sous-chemin — Pages sert sous /buswake/, pas à la racine du domaine ;
 *  2. les fichiers partagés avec la v1, qui ne sont pas dans `dist/` ;
 *  3. le service worker, qui détourne les navigations.
 *
 * Le point 3 a déjà mordu : toute navigation retombe sur index.html, donc
 * `v1.html` — le secours — renvoyait la v2 dès que le worker était installé,
 * c'est-à-dire chez exactement les gens qui en auraient eu besoin. Un
 * `navigateFallbackDenylist` corrige ; ce script est ce qui le prouve.
 *
 *   node scripts/verifier-racine.mjs
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const RACINE = new URL('../../', import.meta.url).pathname;
const BASE = '/buswake/';
const PORT = 4178;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

/** Les routes de l'app. Le hash, parce que la v2 utilise HashRouter — Pages
 *  ne sait pas réécrire les URLs, et les liens d'invitation de la v1
 *  circulent déjà sous cette forme. */
const ROUTES = ['/', '/matchs', '/equipes', '/classement', '/profil', '/bienvenue',
  '/connexion', '/terrains', '/creer', '/joueurs', '/compte/mot-de-passe',
  '/compte/supprimer', '/match/demo', '/match/demo/chat', '/match/demo/composer',
  '/match/demo/terminer', '/match/demo/apres', '/route-inconnue'];

const manquants = [];
const serveur = createServer(async (req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (!chemin.startsWith(BASE)) { manquants.push(chemin); res.writeHead(404).end(); return; }
  chemin = chemin.slice(BASE.length - 1);
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = join(RACINE, normalize(chemin));
  try {
    const s = await stat(fichier);
    if (!s.isFile()) throw new Error('répertoire');
    res.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' })
      .end(await readFile(fichier));
  } catch {
    manquants.push(chemin);
    res.writeHead(404).end();
  }
});
await new Promise((ok) => serveur.listen(PORT, ok));

const navigateur = await chromium.launch({ executablePath: CHROME });
const ctx = await navigateur.newContext({ serviceWorkers: 'allow', viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Le proxy de cet environnement bloque tout sauf GitHub, npm et Google Fonts.
// La v1 charge Firebase depuis gstatic : ses échecs réseau ne sont pas des
// défauts du déploiement, et les compter ferait échouer le script à chaque
// exécution pour une raison qui n'a rien à voir avec lui.
const externe = (url) => !url.startsWith(`http://localhost:${PORT}`);
const ennuis = [];
page.on('pageerror', (e) => ennuis.push(`erreur page · ${page.url()} · ${String(e.message).slice(0, 160)}`));
page.on('requestfailed', (r) => { if (!externe(r.url())) ennuis.push(`requête échouée · ${r.url()}`); });
page.on('response', (r) => { if (r.status() >= 400 && !externe(r.url())) ennuis.push(`HTTP ${r.status()} · ${r.url()}`); });

for (const route of ROUTES) {
  await page.goto(`http://localhost:${PORT}${BASE}#${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  if (await page.evaluate(() => document.querySelector('#root')?.childElementCount === 0)) {
    ennuis.push(`écran vide · ${route}`);
  }
}

await page.goto(`http://localhost:${PORT}${BASE}`, { waitUntil: 'networkidle' });
const sw = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.ready;
  return { actif: !!r.active, portee: r.scope };
});
if (!sw.actif) ennuis.push('service worker inactif');
if (!sw.portee.endsWith(BASE)) ennuis.push(`portée du worker inattendue · ${sw.portee}`);

// Le secours : une VRAIE page, pas une route de la v2.
await page.waitForTimeout(500);
const rep = await page.goto(`http://localhost:${PORT}${BASE}v1.html`, { waitUntil: 'domcontentloaded' });
const estV1 = await page.evaluate(() => !document.querySelector('#root'));
if (rep.status() !== 200) ennuis.push(`v1.html · HTTP ${rep.status()}`);
if (!estV1) ennuis.push('v1.html renvoie la v2 — le worker détourne la navigation');

await navigateur.close();
serveur.close();

for (const m of new Set(manquants)) ennuis.push(`fichier absent · ${m}`);

if (ennuis.length) {
  console.log(ennuis.map((e) => '  ✗ ' + e).join('\n'));
  console.log(`\n✗ ${ennuis.length} problème(s) sur la racine publiée`);
  process.exit(1);
}
console.log(`  ✓ ${ROUTES.length} routes rendues, aucun 404, aucune erreur page`);
console.log(`  ✓ service worker actif sur ${sw.portee}`);
console.log('  ✓ v1.html reste joignable malgré le worker');
console.log('\n✓ racine publiée conforme');
