#!/usr/bin/env node
// PORTÉE — le test que l'app n'avait pas le jour où elle est tombée.
//
// Charge index.html en entier et vérifie que chaque fonction d'écran est
// bien au niveau du module, appelable, et qu'aucune erreur ne remonte.
// Une fonction déclarée par accident À L'INTÉRIEUR d'une autre passe
// toutes les relectures et casse l'onglet en production.
import { ouvrir, fixturesParDefaut } from './lib/harnais.mjs';

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
  + ", __connecte(u){ currentUser = { uid: u }; currentUserData = { pseudo: 'Sam', xp: 1240 }; } };";
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
