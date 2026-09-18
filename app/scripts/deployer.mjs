/**
 * Publie la v2 à la racine du dépôt, d'où GitHub Pages sert le site.
 *
 *   node scripts/deployer.mjs
 *
 * Le build est volontairement COMMITÉ. GitHub Pages ne sait pas construire :
 * il sert ce qui est dans le dépôt. Sans les fichiers produits, le site est
 * vide. C'est le prix de ne pas avoir de CI — et le jour où on en ajoute une,
 * ce script devient l'étape de publication du workflow, rien d'autre.
 *
 * Ce qui est écrasé à la racine : tout ce que `dist/` contient — index.html,
 * sw.js, registerSW.js, workbox-*.js, assets/, plus le contenu de `public/`
 * (nettoyage-v1.js, le manifeste, les favicons et les icônes d'application).
 *
 * Ces six derniers vivent dans `public/` et pas seulement à la racine pour une
 * raison mesurée : tant qu'ils n'étaient qu'à la racine, `dist/` n'était pas
 * un site complet — servi seul, il rendait trois 404 sur les icônes. Ça ne se
 * voyait pas ici, parce que la racine en gardait les exemplaires de la v1 : le
 * site marchait par reste, pas par construction.
 *
 * RIEN D'AUTRE n'est touché. Les photos, les polices, les visuels de partage
 * et v1.html restent en place : le build les référence sans les contenir, et
 * v1.html a besoin des siens.
 */
import { cp, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const RACINE = new URL('../../', import.meta.url).pathname;

const entrees = await readdir(DIST);
if (!entrees.includes('index.html')) {
  console.error('dist/ ne contient pas index.html — lance `npm run build` d’abord.');
  process.exit(1);
}

// assets/ est remplacé, pas fusionné : les noms sont empreintés, et garder
// les anciens ferait grossir le dépôt d'un build à l'autre sans que rien ne
// les serve jamais.
await rm(join(RACINE, 'assets'), { recursive: true, force: true });

// .vite/ est la métadonnée de build (le manifeste que lit la sonde de
// poids). Elle sert dans dist/, pas sur le site.
for (const e of entrees.filter((e) => e !== '.vite')) {
  await cp(join(DIST, e), join(RACINE, e), { recursive: true });
  const s = await stat(join(RACINE, e));
  console.log(`  ${e}${s.isDirectory() ? '/' : ''}`);
}
console.log('\npublié à la racine.');
