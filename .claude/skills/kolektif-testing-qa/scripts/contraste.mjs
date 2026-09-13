#!/usr/bin/env node
// CONTRASTE — mesure, ne juge pas à l'œil.
//
// Sur les cinq écrans, pour chaque texte posé À NU sur la photo de fond,
// compare la couleur CALCULÉE du texte au pixel le plus clair réellement
// rendu derrière lui. Seuils WCAG AA : 3:1 pour du grand texte
// (>= 24 px, ou >= 18,66 px en gras), 4,5:1 sinon.
//
// Quatre pièges, tous rencontrés pour de vrai, tous neutralisés ici :
//  1. lire la couleur codée en dur au lieu de la couleur calculée ;
//  2. capturer avec le texte visible — le pixel le plus clair de la boîte
//     est alors le texte lui-même, et on mesure le texte contre le texte ;
//  3. compter un enfant décoratif (pastille, icône, lueur) comme fond ;
//  4. compter la bordure de l'élément : aucun glyphe ne s'y pose.
import { ouvrir, fixturesParDefaut } from './lib/harnais.mjs';

const ECRANS = ['home', 'matchs', 'equipes', 'classement', 'profil'];
const lum = (r,g,b) => { const f=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  return .2126*f(r)+.7152*f(g)+.0722*f(b); };
const ct = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);

const exporte = "window.__nav = (e) => navigateTo(e);"
  + " window.__connecte = (u) => { currentUser = { uid: u }; currentUserData = { pseudo: 'Sam', xp: 1240 }; };";
const { nav, page, erreurs, fermer } = await ouvrir({ fixtures: fixturesParDefaut(), exporte });
const mesure = await nav.newPage();
await mesure.goto('data:text/html,<meta charset=utf-8>');
await page.evaluate(() => window.__connecte('u1'));

let ko = 0;
for (const ecran of ECRANS) {
  await page.evaluate(e => window.__nav(e), ecran);
  await page.waitForTimeout(1400);

  const cibles = await page.evaluate(ecran => {
    const PLAQUE = '.mc,.card,.stat-box,.home-hero,.cold-hero,.jours,.prog-card,.ap-carte,'
      + '.activity-list,.eq-carte,.au-stat,.cls-hero,button,.btn-primary,.fut-card-v3,'
      + '.player-row,.podium-stage,.friend-item';
    const out = [];
    document.querySelectorAll('#' + ecran + '-content *').forEach(e => {
      if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) return;
      if (e.closest(PLAQUE)) return;                       // posé sur une plaque, pas sur la photo
      const b = e.getBoundingClientRect();
      // Le châssis fixe (barre du haut, nav du bas) recouvre le contenu :
      // y mesurer un texte revient à mesurer la barre, pas la photo.
      const HAUT = document.getElementById('topbar')?.getBoundingClientRect().bottom || 0;
      const BAS  = document.getElementById('bottom-nav')?.getBoundingClientRect().top || 880;
      if (b.width < 4 || b.height < 4 || b.bottom <= HAUT || b.top >= BAS) return;
      if (b.top < HAUT || b.bottom > BAS) return;   // à cheval : non mesurable
      const cs = getComputedStyle(e);
      const m = cs.color.match(/[\d.]+/g).map(Number);
      const a = m[3] === undefined ? 1 : m[3];
      const px = parseFloat(cs.fontSize), gras = parseInt(cs.fontWeight) >= 700;
      // Si l'élément (ou un ancêtre) peint un fond OPAQUE, la photo derrière
      // ne le concerne plus : on mesure contre ce fond.
      let fixe = null;
      for (let n = e; n && n !== document.body; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
        if (bg && (bg[3] === undefined || +bg[3] >= .995)) { fixe = [+bg[0], +bg[1], +bg[2]]; break; }
      }
      const bw = Math.ceil(Math.max(parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderLeftWidth) || 0,
                                    parseFloat(cs.borderRightWidth) || 0, parseFloat(cs.borderBottomWidth) || 0));
      out.push({
        txt: e.textContent.trim().slice(0, 28), fixe,
        couleur: [15,15,15].map((f,i) => Math.round(m[i]*a + f*(1-a))),
        seuil: (px >= 24 || (px >= 18.66 && gras)) ? 3 : 4.5,
        trous: [...e.children].map(c => { const r = c.getBoundingClientRect();
          return [Math.round(r.x), Math.round(r.y), Math.round(r.right), Math.round(r.bottom)]; }),
        x: Math.max(0, Math.round(b.x) + bw), y: Math.max(0, Math.round(b.y) + bw),
        w: Math.max(1, Math.round(Math.min(b.width, 400 - b.x)) - 2*bw),
        h: Math.max(1, Math.round(Math.min(b.height, 880 - b.y)) - 2*bw),
      });
    });
    return out;
  }, ecran);

  await page.addStyleTag({ content: '#' + ecran + '-content *{color:transparent!important;text-shadow:none!important}' });
  await page.waitForTimeout(220);
  const png = await page.screenshot({ clip: { x:0, y:0, width:400, height:880 } });
  await page.evaluate(() => document.querySelectorAll('style').forEach(s => {
    if (/color:transparent!important/.test(s.textContent)) s.remove(); }));

  const fonds = await mesure.evaluate(async ([src, cibles]) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const e = img.width / 400;                       // facteur d'échelle de la capture
    return cibles.map(b => {
      const d = x.getImageData(b.x*e, b.y*e, Math.max(1,b.w*e), Math.max(1,b.h*e)).data;
      let best = -1, bp = [0,0,0];
      const L = Math.max(1, Math.round(b.w*e));
      for (let py = 0; py < Math.round(b.h*e); py++) for (let pxx = 0; pxx < L; pxx++) {
        const gx = b.x + pxx/e, gy = b.y + py/e;
        if (b.trous.some(t => gx >= t[0] && gx < t[2] && gy >= t[1] && gy < t[3])) continue;
        const i = (py*L + pxx) * 4;
        const v = .2126*d[i] + .7152*d[i+1] + .0722*d[i+2];
        if (v > best) { best = v; bp = [d[i], d[i+1], d[i+2]]; }
      }
      return bp;
    });
  }, ['data:image/png;base64,' + png.toString('base64'), cibles]);

  const echecs = [];
  let pire = Infinity, pireTxt = '';
  cibles.forEach((b, i) => {
    const r = ct(lum(...b.couleur), lum(...(b.fixe || fonds[i])));
    if (r / b.seuil < pire) { pire = r / b.seuil; pireTxt = b.txt; }
    if (r < b.seuil) echecs.push(`${r.toFixed(2)}/${b.seuil} « ${b.txt} »`);
  });
  if (echecs.length) ko++;
  console.log(`${echecs.length ? '✗' : '✓'} ${ecran.padEnd(11)} ${String(cibles.length).padStart(2)} textes à nu`
    + (echecs.length ? ' · ÉCHECS : ' + echecs.join(' | ')
                     : ` · marge la plus faible ×${pire.toFixed(2)} (${pireTxt})`));
}
if (erreurs.length) { ko++; console.log('✗ erreurs page : ' + [...new Set(erreurs)].slice(0,3).join(' | ')); }
await fermer();
process.exit(ko ? 1 : 0);
