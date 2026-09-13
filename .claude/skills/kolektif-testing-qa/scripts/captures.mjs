#!/usr/bin/env node
// CAPTURES — les cinq écrans, en 400×880, pour l'œil.
// La mesure attrape ce qui est mesurable ; une capture attrape le reste
// (un fond qui montre du texte gravé, une carte qui déborde, un vide).
// Usage : node captures.mjs [dossier]   (défaut : ./captures)
import fs from 'fs';
import path from 'path';
import { ouvrir, fixturesParDefaut } from './lib/harnais.mjs';

const SORTIE = process.argv[2] || path.join(process.cwd(), 'captures');
fs.mkdirSync(SORTIE, { recursive: true });

const exporte = "window.__nav=(e)=>navigateTo(e);"
  + " window.__connecte=(u)=>{currentUser={uid:u};currentUserData={pseudo:'Sam',xp:1240};};"
  + " window.__menu=()=>openMenu();";
const { page, erreurs, fermer } = await ouvrir({ fixtures: fixturesParDefaut(), exporte });
await page.evaluate(() => window.__connecte('u1'));

for (const ec of ['home','matchs','equipes','classement','profil']) {
  await page.evaluate(e => window.__nav(e), ec);
  await page.waitForTimeout(1400);
  const f = path.join(SORTIE, `${ec}.png`);
  await page.screenshot({ path: f });
  console.log('  ' + f);
}
await page.evaluate(() => window.__menu());
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(SORTIE, 'reglages.png') });
console.log('  ' + path.join(SORTIE, 'reglages.png'));
if (erreurs.length) console.log('! erreurs page : ' + [...new Set(erreurs)].slice(0,3).join(' | '));
await fermer();
