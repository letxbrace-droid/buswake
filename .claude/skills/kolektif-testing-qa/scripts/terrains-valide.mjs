#!/usr/bin/env node
// VALIDATION D'UN LOT DE TERRAINS avant insertion dans le catalogue.
//
// Dix-sept entrées inventées sont déjà passées en production parce que
// personne ne les a regardées de près. Ce contrôle attrape ce qu'une
// machine peut attraper SANS RÉSEAU : le format, le motif d'un nom
// fabriqué, les doublons, une adresse sans numéro de voie, une source qui
// n'en est pas une, une coordonnée hors zone ou trop imprécise.
//
// Ce qu'il NE PEUT PAS faire : ouvrir les sources. Aucune validation
// automatique ne remplace l'ouverture de cinq `src` au hasard.
//
// Usage : node terrains-valide.mjs lot.json
import fs from 'fs';

const lot = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pb = [];      // bloquant
const av = [];      // à vérifier à la main

// Mots qui, collés à un nom de commune, fabriquent un nom plausible.
const GENERIQUES = ['five', 'futsal', 'indoor', 'foot', 'soccer', 'urban', 'city', 'park', 'palace'];
const ENSEIGNES = ['le five', 'urbansoccer', 'urban soccer', 'soccer park'];

const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const dist = (a, b) => {
  const t = x => x * Math.PI / 180;
  const dLat = t(b.lat - a.lat), dLon = t(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

lot.forEach((x, i) => {
  const id = `[${i}] ${x.n || '(sans nom)'}`;

  // ---- format ----
  for (const c of ['n', 'v', 'cp', 'adr', 't']) {
    if (typeof x[c] !== 'string' || !x[c].trim()) pb.push(`${id} : champ « ${c} » manquant ou vide`);
  }
  if (!/^[0-9]{5}$/.test(x.cp || '')) pb.push(`${id} : code postal invalide « ${x.cp} »`);
  if (!['indoor', 'urban', ''].includes(x.t)) pb.push(`${id} : type « ${x.t} » inconnu`);

  // ---- l'adresse doit permettre de se garer ----
  const adr = x.adr || '';
  if (!/^\s*[0-9]+([-–][0-9]+)?\s*(bis|ter)?\s+\S/i.test(adr))
    pb.push(`${id} : adresse sans numéro de voie — « ${adr} »`);
  if (x.cp && !adr.includes(x.cp))
    av.push(`${id} : le code postal « ${x.cp} » n'apparaît pas dans l'adresse`);
  if (x.v && !sansAccent(adr).includes(sansAccent(x.v)))
    av.push(`${id} : la commune « ${x.v} » n'apparaît pas dans l'adresse`);

  // ---- le motif du nom fabriqué ----
  const nl = sansAccent(x.n || '');
  const enseigne = ENSEIGNES.some(e => nl.startsWith(sansAccent(e)));
  const communeDansNom = x.v && nl.includes(sansAccent(x.v.split('-')[0]));
  const motGenerique = GENERIQUES.some(g => nl.startsWith(g));
  if (!enseigne && motGenerique && communeDansNom)
    pb.push(`${id} : motif « mot générique + commune » — nom probablement fabriqué`);

  // ---- la source ----
  const src = x.src || '';
  if (!/^https?:\/\//.test(src)) pb.push(`${id} : pas de source`);
  else {
    let u = null;
    try { u = new URL(src); } catch (_) { pb.push(`${id} : source illisible — ${src}`); }
    if (u && (u.pathname === '/' || u.pathname === ''))
      av.push(`${id} : source = page d'accueil, pas la fiche du centre — ${src}`);
  }

  // ---- coordonnées ----
  if (x.lat != null || x.lon != null) {
    if (typeof x.lat !== 'number' || typeof x.lon !== 'number')
      pb.push(`${id} : coordonnées non numériques`);
    else {
      const dec = Math.max((String(x.lat).split('.')[1] || '').length,
                           (String(x.lon).split('.')[1] || '').length);
      if (dec < 4) av.push(`${id} : ${dec} décimales (~${Math.round(111000 / 10 ** dec)} m de flou)`);
      if (x.lat < 41 || x.lat > 51.5 || x.lon < -5.5 || x.lon > 9.8)
        pb.push(`${id} : coordonnées hors de France métropolitaine`);
    }
  }
  if (x.verif === true && !src) pb.push(`${id} : verif:true sans source`);
});

// ---- doublons ----
const vus = new Map();
lot.forEach((x, i) => {
  const k = sansAccent(x.n || '').replace(/[^a-z0-9]/g, '');
  if (vus.has(k)) pb.push(`[${i}] ${x.n} : même nom que [${vus.get(k)}]`);
  else vus.set(k, i);
});
for (let i = 0; i < lot.length; i++) {
  for (let j = i + 1; j < lot.length; j++) {
    const a = lot[i], b = lot[j];
    if (typeof a.lat !== 'number' || typeof b.lat !== 'number') continue;
    const d = dist(a, b);
    if (d < 0.25) av.push(`[${i}] ${a.n} et [${j}] ${b.n} : ${Math.round(d * 1000)} m d'écart — même lieu ?`);
  }
}

console.log(`${lot.length} entrées analysées\n`);
if (pb.length) { console.log(`✗ ${pb.length} BLOQUANT(S)`); pb.forEach(l => console.log('   ' + l)); console.log(); }
else console.log('✓ aucun bloquant\n');
if (av.length) { console.log(`! ${av.length} point(s) à vérifier à la main`); av.forEach(l => console.log('   ' + l)); console.log(); }
else console.log('✓ rien à vérifier à la main\n');
console.log("RESTE À FAIRE PAR UN HUMAIN : ouvrir cinq `src` au hasard et confirmer");
console.log("que l'adresse annoncée y figure. Ce contrôle ne sait pas le faire.");
process.exit(pb.length ? 1 : 0);
