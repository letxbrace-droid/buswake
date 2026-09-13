#!/usr/bin/env node
// PLAQUES — quelles surfaces laissent passer la photo sans être déclarées ?
//
// Depuis que chaque écran a une photo de fond, toute carte translucide non
// inscrite dans la liste des plaques laisse remonter la pelouse : le texte
// posé dessus perd du contraste sans que personne ne touche à sa couleur.
// C'est exactement ce qui est arrivé à `.you-hero` (4,26 pour un seuil de 4,5).
//
// La liste de référence est LUE DANS LA FEUILLE DE STYLE, pas recopiée ici :
// une liste recopiée diverge, et le test finirait par valider autre chose
// que ce que le navigateur applique.
import fs from 'fs';
import path from 'path';
import { ouvrir, fixturesParDefaut, RACINE } from './lib/harnais.mjs';

const css = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const bloc = css.match(/\/\* ===== LES PLAQUES =====[\s\S]*?\n(\s*\{|\s*[.#][^{]*\{)/);
const m = css.match(/((?:\s*\.screen [^,{]+,\n)+\s*\.screen [^,{]+)\s*\{\s*\n\s*\/\* La face est éclairée/);
if (!m) { console.log('✗ liste des plaques introuvable dans index.html'); process.exit(1); }
const DECLAREES = m[1].split(',').map(s => s.trim().replace(/^\.screen\s+/, '')).filter(Boolean);
console.log('Plaques déclarées (' + DECLAREES.length + ') : ' + DECLAREES.join(' '));

const exporte = "window.__nav=(e)=>navigateTo(e);"
  + " window.__connecte=(u)=>{currentUser={uid:u};currentUserData={pseudo:'Sam',xp:1240};};";
const { page, fermer } = await ouvrir({ fixtures: fixturesParDefaut(), exporte });
await page.evaluate(() => window.__connecte('u1'));

let ko = 0;
for (const ec of ['home','matchs','equipes','classement','profil']) {
  await page.evaluate(e => window.__nav(e), ec);
  await page.waitForTimeout(1300);
  const r = await page.evaluate(([ec, declarees]) => {
    const SEL = declarees.join(',');
    const vus = new Map();
    document.querySelectorAll('#' + ec + '-content *').forEach(e => {
      const cs = getComputedStyle(e);
      const bg = cs.backgroundColor.match(/[\d.]+/g);
      const translucide = (bg && +bg[3] > .02 && +bg[3] < .995) || /gradient/.test(cs.backgroundImage);
      if (!translucide) return;
      const b = e.getBoundingClientRect();
      if (b.width < 140 || b.height < 40) return;      // pastilles, jauges, anneaux : décor assumé
      if (e.matches(SEL) || e.closest(SEL)) return;
      if (/\bsk\b|\bsk-/.test(e.className)) return;    // squelettes de chargement : transitoires
      if (e.closest('button, a, .btn-primary, .btn-sm, .btn-outline')) return; // commandes, pas surfaces
      // un ancêtre opaque quelque part ? alors la photo ne passe pas
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const p = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
        if (p && (p[3] === undefined || +p[3] >= .995)) return;
      }
      const cl = (e.className || e.tagName).toString().split(' ')[0];
      if (!vus.has(cl)) vus.set(cl, `.${cl}(${Math.round(b.width)}×${Math.round(b.height)})`);
    });
    return [...vus.values()];
  }, [ec, DECLAREES]);
  if (r.length) ko++;
  console.log(`${r.length ? '✗' : '✓'} ${ec.padEnd(11)} ${r.length ? 'non déclarées : ' + r.join('  ') : 'aucune surface orpheline'}`);
}
await fermer();
if (ko) console.log('\nChaque surface listée doit être soit ajoutée à la liste des plaques,\n'
  + "soit rendue opaque, soit assumée décorative — et dans ce cas exclue par sa taille.");
process.exit(ko ? 1 : 0);
