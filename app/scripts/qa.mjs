/**
 * Harnais QA de la v2 — il construit, sert et MESURE.
 *
 * Il ne relit pas le code source : il ouvre la page réellement produite par
 * `vite build`, servie en HTTP. C'est ce qui lui a permis d'attraper deux
 * choses qu'une lecture du source n'aurait jamais vues — des polices absentes
 * du build, et des assets bloqués par le serveur.
 *
 *   node scripts/qa.mjs            tout
 *   node scripts/qa.mjs contraste  une seule sonde
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PORT = 8161;
const PORT_DEV = 8162;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** Les routes de l'app. Toute nouvelle route s'ajoute ICI, sinon elle n'est
 *  jamais mesurée — c'est la seule façon qu'une régression passe.
 *
 *  `sansPlaque` est une EXCEPTION DÉCLARÉE, pas une dérogation silencieuse :
 *  un écran qui n'a délibérément aucune plaque doit le dire ici, en une ligne
 *  qu'on relit. Sinon la sonde échoue — et c'est ce qu'on veut, parce que
 *  perdre les plaques par accident ne doit jamais passer inaperçu. */
const ROUTES = [
  // L'écran d'entrée n'a pas de boîte : le contenu respire, la photo du
  // terrain fait le décor. Une plaque y ferait un guichet.
  { nom: 'connexion', hash: '#/connexion', sansPlaque: true },
  { nom: 'accueil', hash: '#/' },
  { nom: 'matchs', hash: '#/matchs' },
  { nom: 'equipes', hash: '#/equipes' },
  { nom: 'classement', hash: '#/classement' },
  { nom: 'profil', hash: '#/profil' },
  { nom: 'detail-match', hash: '#/match/d2' },
  { nom: 'terminer', hash: '#/match/d2/terminer' },
];

/** Budget de poids, en Ko gzippés. Il échoue quand on le dépasse, pour que la
 *  dérive se voie au commit qui la cause et pas trois mois plus tard. */
const BUDGET_PREMIERE_PEINTURE = 110;
const BUDGET_TOTAL = 400;

/** Hôtes qu'on ne peut PAS joindre depuis un conteneur d'intégration.
 *  Leur échec est une contrainte d'environnement, pas un défaut de l'app —
 *  mais il est RAPPORTÉ, jamais avalé : le jour où l'app cesse de dégrader
 *  proprement, on doit le voir. */
const HORS_PORTEE = /googleapis\.com|gstatic\.com|firebaseio|firebaseapp/;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

function servir() {
  const srv = createServer(async (req, res) => {
    const chemin = decodeURIComponent(req.url.split('?')[0]);
    const fichier = join(DIST, chemin === '/' ? 'index.html' : chemin);
    try {
      const corps = await readFile(fichier);
      res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
      res.end(corps);
    } catch {
      res.writeHead(404).end('introuvable');
    }
  });
  return new Promise((ok) => srv.listen(PORT, () => ok(srv)));
}

const lum = (r, g, b) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Sonde 1 — la page se charge-t-elle sans rien casser ?
 *  Erreurs JS, messages console, ET requêtes en échec : une police ou une
 *  photo absente du build ne lève aucune erreur, elle rend juste une page
 *  fausse. C'est exactement le bug qu'on a eu. */
async function sondeErreurs(page, route, base) {
  const problemes = [];
  const onErr = (e) => problemes.push(`erreur JS : ${e.message.slice(0, 140)}`);
  const externes = [];
  const onCons = (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    (HORS_PORTEE.test(t) || /Firestore|ERR_TUNNEL|ERR_CERT/.test(t) ? externes : problemes)
      .push(`console : ${t.slice(0, 120)}`);
  };
  const onRep = (r) => {
    if (r.status() < 400) return;
    const u = r.url();
    (HORS_PORTEE.test(u) ? externes : problemes).push(`${r.status()} sur ${u.replace(base, '')}`);
  };
  page.on('pageerror', onErr);
  page.on('console', onCons);
  page.on('response', onRep);

  await page.goto(`${base}/${route.hash}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1400);

  page.off('pageerror', onErr);
  page.off('console', onCons);
  page.off('response', onRep);
  return { problemes, externes };
}

/** Sonde 2 — contraste WCAG AA, MESURÉ, jamais estimé à l'œil.
 *
 *  Trois pièges appris à la dure :
 *   1. on efface l'encre avant de lire le fond, sinon on mesure les glyphes
 *      eux-mêmes et on obtient des rapports de 1.00 ;
 *   2. on ignore les éléments qui ont des enfants — on ne mesure que du texte
 *      à nu, pas des boîtes ;
 *   3. le seuil dépend de la taille : 3:1 pour du grand texte (≥24px, ou
 *      ≥18.66px en gras), 4.5:1 sinon.
 */
async function sondeContraste(page) {
  const cibles = await page.evaluate(() => {
    // On ne PARSE PLUS les couleurs CSS : on les fait résoudre par le
    // navigateur. Tailwind v4 émet `text-white/55` en oklab(...), et une
    // expression régulière y lisait « 0.999, 0.0000455… » comme du RGB —
    // elle mesurait donc du quasi-noir et rendait des rapports de 1.05.
    // fillStyle accepte toute syntaxe de couleur et rend du rgba.
    // On PEINT la couleur et on lit le pixel. Relire ctx.fillStyle ne suffit
    // pas : Chrome accepte bien oklab(...) — le pixel peint est juste — mais
    // il le RESÉRIALISE en oklab, et lire ces nombres comme du RGB donnait du
    // quasi-noir, donc des rapports de 1.09 sur du blanc à 55 %.
    // Le pixel, lui, ne ment pas, quelle que soit la syntaxe.
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };

    const out = [];
    for (const el of document.querySelectorAll('p,span,b,i,button,h1,h2,h3,a,li')) {
      const t = (el.textContent ?? '').trim();
      if (!t || el.children.length) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.top < 0 || r.bottom > window.innerHeight) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.opacity === '0') continue;
      const x = Math.round(r.x + r.width / 2);
      const y = Math.round(r.y + r.height / 2);
      // On ne mesure QUE du texte réellement au-dessus à son propre centre.
      // Un bouton flottant qui passe par-dessus une liste qui défile n'est
      // pas un défaut de contraste : le texte sort de dessous au scroll.
      const dessus = document.elementFromPoint(x, y);
      if (dessus !== el && !el.contains(dessus) && !dessus?.contains(el)) continue;
      out.push({
        t: t.slice(0, 30), encre: rgba(s.color),
        px: parseFloat(s.fontSize), gras: Number(s.fontWeight) >= 700, x, y,
      });
    }
    return out;
  });

  if (!cibles.length) return { nombre: 0, echecs: [], pire: null };

  // Le fond RÉELLEMENT PEINT, lu au pixel. La remontée vers le premier
  // ancêtre opaque se trompait sur tout ce qui n'a pas de backgroundColor :
  // un dégradé rend `rgba(0,0,0,0)`, donc la carte FUT était mesurée contre
  // le fond de la page au lieu du sien. Une capture ne ment pas.
  await page.evaluate(() => {
    for (const e of document.querySelectorAll('*')) e.style.color = 'transparent';
  });
  // ON LAISSE LE RENDU SE POSER AVANT DE CAPTURER.
  // Effacer l'encre force un repaint complet. Capturer dans la foulée rend
  // une frame non stabilisée : le backdrop-filter des plaques n'est pas
  // encore réappliqué, donc la photo du terrain transparaît sous les
  // surfaces translucides et le fond est lu bien plus clair qu'il n'est.
  // Mesuré : un chip noir à 55 % ressortait à rgb(158,158,156) sans cette
  // attente, et à sa vraie valeur sombre avec.
  await page.waitForTimeout(450);
  const png = (await page.screenshot()).toString('base64');

  const fonds = await page.evaluate(
    async ({ b64, pts }) => {
      const img = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${b64}`)).blob(),
      );
      const c = new OffscreenCanvas(img.width, img.height);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const ech = img.width / window.innerWidth;
      return pts.map((p) => {
        const d = ctx.getImageData(Math.round(p.x * ech), Math.round(p.y * ech), 1, 1).data;
        return [d[0], d[1], d[2]];
      });
    },
    { b64: png, pts: cibles },
  );

  const echecs = [];
  const justes = [];
  let pire = null;
  cibles.forEach((c, i) => {
    const [r, g, b, a] = c.encre;
    const bg = fonds[i];
    const fg = [r, g, b].map((v, k) => v * a + bg[k] * (1 - a));
    const L1 = lum(...fg);
    const L2 = lum(...bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const seuil = c.px >= 24 || (c.px >= 18.66 && c.gras) ? 3 : 4.5;
    const marge = ratio / seuil;
    if (marge < 1) echecs.push(`${ratio.toFixed(2)} < ${seuil} — « ${c.t} »`);
    // Passer à 1 % du seuil, c'est passer aujourd'hui et tomber au prochain
    // ajustement. On le signale sans faire échouer : c'est un avertissement,
    // pas un verdict.
    else if (marge < 1.1) justes.push(`×${marge.toFixed(2)} — « ${c.t} »`);
    if (!pire || marge < pire.marge) pire = { ...c, ratio, seuil, marge };
  });
  return { nombre: cibles.length, echecs, justes, pire };
}

/** Sonde 3 — la plaque est-elle encore une plaque ?
 *  Elle est la signature visuelle du produit. Si quelqu'un aplatit ses ombres
 *  ou retire son flou, le produit perd son identité sans qu'aucun test ne
 *  tombe. On lit le style CALCULÉ, pas le CSS source. */
async function sondePlaques(page) {
  return page.evaluate(() => {
    const e = document.querySelector('.plaque');
    if (!e) return { ok: false, pourquoi: 'aucune plaque sur cet écran' };
    const s = getComputedStyle(e);
    const ombres = (s.boxShadow.match(/rgba?\(/g) ?? []).length;
    const flou = s.backdropFilter !== 'none' && s.backdropFilter !== '';
    const bordsDistincts = s.borderTopColor !== s.borderBottomColor;
    return {
      ok: ombres >= 5 && flou && bordsDistincts,
      pourquoi: `${ombres} ombres · flou ${flou ? 'oui' : 'NON'} · bords ${bordsDistincts ? 'distincts' : 'UNIFORMES'}`,
    };
  });
}

/** Sonde 5 — les champs de saisie sont-ils opaques ?
 *
 *  La sonde de contraste ne mesure que du TEXTE, donc un champ vide lui est
 *  invisible : elle n'avait rien à mesurer et laissait passer un champ
 *  translucide posé sur la photo du terrain, à travers lequel on voyait les
 *  projecteurs. Ce n'est pas un problème de contraste, c'est un problème de
 *  surface — et il lui fallait sa propre sonde.
 *
 *  Un contrôle de saisie doit poser sa propre surface : soit un fond opaque,
 *  soit un ancêtre opaque ET pas de fond à lui. */
async function sondeChamps(page) {
  return page.evaluate(() => {
    const alpha = (css) => {
      const m = css.match(/[\d.]+/g);
      if (!m) return 0;
      return m.length > 3 ? parseFloat(m[3]) : 1;
    };
    const fautifs = [];
    for (const el of document.querySelectorAll('input, textarea, select')) {
      if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const a = alpha(getComputedStyle(el).backgroundColor);
      if (a < 0.85) {
        fautifs.push(`${el.getAttribute('aria-label') || el.id || el.type} — fond à ${Math.round(a * 100)} %`);
      }
    }
    return fautifs;
  });
}

/** Sonde 4 — le poids, par chunk, gzippé.
 *
 *  La première peinture se lit dans le MANIFESTE de Vite, pas dans les noms
 *  de fichiers. Le filtre par nom qui précédait attrapait « Matchs » mais ni
 *  « DetailMatch » ni « TerminerMatch » : des chunks chargés à la demande
 *  étaient comptés dans la première peinture, qui ressortait à 143 Ko au lieu
 *  de 136. Un budget calculé sur une heuristique finit par alerter à tort. */
async function sondePoids() {
  const dir = join(DIST, 'assets');
  const fichiers = await readdir(dir);
  const ko = async (f) => Math.round(gzipSync(await readFile(join(dir, f))).length / 1024);

  const tailles = {};
  for (const f of fichiers.filter((f) => /\.(js|css)$/.test(f))) tailles[f] = await ko(f);

  const manifeste = JSON.parse(await readFile(join(DIST, '.vite', 'manifest.json'), 'utf8'));
  const entree = Object.values(manifeste).find((e) => e.isEntry);

  // On suit les imports STATIQUES depuis l'entrée. Les dynamicImports sont
  // par définition ce qui ne se charge pas à l'ouverture.
  const bloquants = new Set();
  const suivre = (cle) => {
    const e = manifeste[cle];
    if (!e || bloquants.has(cle)) return;
    bloquants.add(cle);
    for (const f of e.css ?? []) bloquants.add(f);
    for (const i of e.imports ?? []) suivre(i);
  };
  for (const [cle, e] of Object.entries(manifeste)) if (e.isEntry) suivre(cle);

  const nom = (chemin) => chemin.split('/').pop();
  const premiereListe = [...bloquants]
    .map((c) => (manifeste[c]?.file ? nom(manifeste[c].file) : nom(c)))
    .filter((f) => tailles[f] !== undefined);

  const premiere = [...new Set(premiereListe)].reduce((n, f) => n + tailles[f], 0);
  const total = Object.values(tailles).reduce((n, v) => n + v, 0);
  return { tailles, premiere, total, premiereListe: [...new Set(premiereListe)], entree: entree?.file };
}

// ===== EXÉCUTION =====
//
// DEUX PASSES, et elles ne mesurent pas la même chose :
//
//   A. le BUILD servi en HTTP — intégrité (une police absente de dist/ ne
//      lève aucune erreur, elle rend juste une page fausse) et poids réel.
//   B. le serveur de DÉV — les fixtures y sont branchées, donc les écrans
//      sont réellement remplis. Sur le build, la liste des matchs est vide
//      faute de Firestore : mesurer le contraste dessus ne prouverait rien.
//
// Sans la passe B, le harnais se contenterait de valider des écrans vides.

function attendre(url, essais = 40) {
  return new Promise((ok, ko) => {
    const coup = () =>
      fetch(url)
        .then(() => ok())
        .catch(() => (essais-- > 0 ? setTimeout(coup, 250) : ko(new Error(`injoignable : ${url}`))));
    coup();
  });
}

const seulement = process.argv[2];
let echecs = 0;
const notes = [];

const srv = await servir();
const dev = spawn('npx', ['vite', '--port', String(PORT_DEV), '--host', '127.0.0.1', '--clearScreen', 'false'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
});
const nav = await chromium.launch({ executablePath: CHROME });

try {
  if (!seulement || seulement === 'poids') {
    const p = await sondePoids();
    console.log('\n── poids (Ko gzippés) ──');
    for (const [f, v] of Object.entries(p.tailles).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(v).padStart(4)} Ko  ${f}`);
    }
    const okP = p.premiere <= BUDGET_PREMIERE_PEINTURE;
    const okT = p.total <= BUDGET_TOTAL;
    console.log(
      `${okP ? '✓' : '✗'} première peinture ${p.premiere} Ko (budget ${BUDGET_PREMIERE_PEINTURE}) — ${p.premiereListe.join(', ')}`,
    );
    console.log(`${okT ? '✓' : '✗'} total ${p.total} Ko (budget ${BUDGET_TOTAL})`);
    if (!okP || !okT) echecs++;
  }

  if (seulement !== 'poids') {
    const BUILD = `http://127.0.0.1:${PORT}`;
    const DEV = `http://127.0.0.1:${PORT_DEV}`;
    await attendre(`${DEV}/index.html`);

    for (const route of ROUTES) {
      console.log(`\n── ${route.nom} ──`);

      // — passe A : le build se charge-t-il entièrement ? —
      const pa = await nav.newPage({ viewport: { width: 400, height: 880 } });
      const { problemes, externes } = await sondeErreurs(pa, route, BUILD);
      await pa.close();

      if (!seulement || seulement === 'erreurs') {
        if (problemes.length) {
          echecs++;
          for (const x of [...new Set(problemes)]) console.log(`  ✗ ${x}`);
        } else {
          console.log('  ✓ build — aucune erreur, aucun asset manquant');
        }
        for (const x of [...new Set(externes)].slice(0, 2)) notes.push(`${route.nom} · ${x}`);
      }

      // — passe B : l'écran rempli —
      const pb = await nav.newPage({ viewport: { width: 400, height: 880 } });
      await pb.goto(`${DEV}/${route.hash}`, { waitUntil: 'networkidle' }).catch(() => {});
      await pb.waitForTimeout(1400);

      if (!seulement || seulement === 'plaques') {
        if (route.sansPlaque) {
          const pl = await sondePlaques(pb);
          // L'exception fonctionne dans les deux sens : si une plaque
          // apparaît sur un écran déclaré sans plaque, on le signale aussi.
          console.log(
            pl.ok
              ? '  ✗ plaque — écran déclaré sans plaque, mais il en porte une'
              : '  · plaque — sans objet (exception déclarée)',
          );
          if (pl.ok) echecs++;
        } else {
          const pl = await sondePlaques(pb);
          console.log(`  ${pl.ok ? '✓' : '✗'} plaque — ${pl.pourquoi}`);
          if (!pl.ok) echecs++;
        }
      }

      if (!seulement || seulement === 'champs') {
        const f = await sondeChamps(pb);
        if (f.length) {
          echecs++;
          for (const x of f) console.log(`  ✗ champ translucide — ${x}`);
        }
      }

      if (!seulement || seulement === 'contraste') {
        const c = await sondeContraste(pb);
        if (c.echecs.length) {
          echecs++;
          for (const e of c.echecs) console.log(`  ✗ contraste ${e}`);
        } else if (c.pire) {
          console.log(
            `  ✓ contraste — ${c.nombre} textes à nu, marge la plus faible ×${c.pire.marge.toFixed(2)} (« ${c.pire.t} »)`,
          );
          for (const j of c.justes) console.log(`    ⚠ juste  ${j}`);
        } else {
          console.log('  ✗ contraste — aucun texte mesurable : écran vide ?');
          echecs++;
        }
      }
      await pb.close();
    }
  }
} finally {
  await nav.close();
  srv.close();
  dev.kill();
}

if (notes.length) {
  console.log('\n── hors portée de ce conteneur (le proxy les bloque) ──');
  for (const n of notes) console.log(`  · ${n}`);
}

console.log(echecs ? `\n✗ ${echecs} contrôle(s) en échec` : '\n✓ tous les contrôles passent');
process.exit(echecs ? 1 : 0);
