---
name: kolektif-testing-qa
description: Harnais de test et méthode de vérification de KOLEKTIF — types, tests unitaires du domaine, sondes mesurées sur le site construit (contraste WCAG, plaques, poids, champs), conformité de la racine publiée, XP serveur. À utiliser après toute modification de app/, functions/ ou des assets, et avant chaque commit ou déploiement.
---

# Tests et vérification — KOLEKTIF

## Objectif

Remplacer « ça a l'air bon » par une mesure.

Depuis la migration vers la v2 (Vite + React + TypeScript dans `app/`),
la vérification tient sur **quatre étages**, du moins cher au plus cher.
Chacun attrape ce que l'étage précédent ne peut pas voir — c'est le seul
critère qui justifie son existence.

| Étage | Commande | Ce qu'il attrape |
|---|---|---|
| types | `npm run build` (`tsc -b`) | un nom qui n'existe pas, une forme qui ne colle pas |
| unité | `npm test` | la règle métier, sans navigateur |
| sondes | `npm run qa` | ce qui ne se voit qu'une fois **construit et peint** |
| racine | `npm run verifier-racine` | ce qui ne se voit qu'une fois **publié** |

`tout.mjs` les enchaîne, ajoute l'XP serveur, et renvoie un code de sortie
unique.

## Quand l'utiliser

- Après **toute** modification de `app/`, `functions/` ou d'un asset.
- Avant chaque commit et avant chaque déploiement.
- Quand un écran est vide et qu'on ne sait pas pourquoi.
- Quand il faut prouver qu'un texte est lisible.

## Pourquoi quatre étages et pas un

### Les types ne remplacent pas les tests

TypeScript garantit qu'`encreBlason` reçoit une chaîne. Il ne dit rien du
fait qu'elle doit rendre du blanc sur `#B36BFF`. La règle métier vit dans
`src/domaine/` **en fonctions pures**, précisément pour être testable sans
navigateur ni Firestore : c'est là que se trouve la quasi-totalité des
tests unitaires.

### Les tests ne remplacent pas les sondes

`qa.mjs` n'ouvre **pas** le source : il lance `vite build`, sert `dist/`
en HTTP et ouvre la page produite. C'est ce qui lui a fait trouver deux
choses qu'aucune lecture du code n'aurait montrées :

- des `@font-face` dans un `<style>` en ligne, que Vite ne traite pas — le
  build partait **sans polices** ;
- des assets refusés par le serveur de dev (`server.fs.allow`).

### Les sondes ne remplacent pas la vérification de la racine

`qa.mjs` mesure `dist/`. Le site servi, lui, c'est **la racine du dépôt**,
sous le sous-chemin `/buswake/`, avec le service worker actif et `v1.html`
posé à côté. Trois choses n'existent qu'à ce niveau :

1. **le sous-chemin** — Pages ne sert pas à la racine du domaine ;
2. **les fichiers partagés avec la v1**, absents de `dist/` ;
3. **le service worker**, qui détourne les navigations.

Le point 3 avait déjà mordu : toute navigation retombe sur `index.html`,
donc `v1.html` — le **secours** — renvoyait la v2 dès que le worker était
installé, c'est-à-dire chez exactement les gens qui en auraient eu besoin.
`navigateFallbackDenylist` corrige ; `verifier-racine.mjs` est ce qui le
prouve, et a été vu échouer avec le bug avant d'être gardé.

## Les cinq sondes de `qa.mjs`

| Sonde | Ce qu'elle attrape |
|---|---|
| `erreurs` | une erreur page, un 404, un écran qui ne rend rien |
| `contraste` | un texte sous le seuil WCAG AA, **mesuré au pixel** |
| `plaques` | une carte translucide qui laisse passer la photo |
| `poids` | un chunk qui grossit la première peinture |
| `champs` | un champ de formulaire vide devenu invisible |

Deux passes : le site **construit** servi en HTTP (intégrité, poids), et
le serveur de **dev** avec un jeu d'essai (contraste, plaques, champs) —
parce que remplir l'app demande des bouchons que le build ne porte pas.

## Règles métier

### 1. Mesurer le contraste sur le PIXEL, jamais sur la chaîne CSS

Trois angles morts, tous rencontrés, tous silencieux :

- **oklab** — Tailwind v4 émet `text-white/55` en oklab. Chrome l'accepte
  dans `fillStyle` mais le **re-sérialise en oklab** : relire la chaîne
  renvoyait un quasi-noir, et un texte parfaitement lisible était déclaré
  en échec. Peindre, puis **lire le pixel**.
- **les dégradés** donnent un `backgroundColor` transparent : la remontée
  vers l'ancêtre opaque mesurait la page au lieu de la carte posée dessus.
  Lire les vrais pixels d'une capture.
- **l'image pas encore posée** — un `bg-black/55` lisait `rgb(158,158,156)`
  parce que le `backdrop-filter` n'était pas réappliqué. Attendre.

**Conséquence assumée : une des trois « corrections » de contraste tirées
de cette sonde était un artefact, et a été annulée.** Quand la mesure
contredit la capture, suspecter la mesure.

### 2. Une sonde ne voit que ce qu'elle regarde

Le contraste mesure **du texte**. Un champ de formulaire **vide** n'en a
pas : une bordure devenue translucide le rendait invisible sans qu'aucune
sonde ne bronche. `sondeChamps` (opacité ≥ 0,85) a été ajoutée — et a
immédiatement trouvé le même défaut sur un écran déjà commité.

Avant de conclure « c'est vert », demander ce que la sonde **ne regarde
pas**.

### 3. Un budget se calcule sur le manifeste, pas sur les noms de fichiers

Le poids de première peinture se calculait en filtrant les noms de chunks.
Un filtre sur « Matchs » ne reconnaît ni `DetailMatch` ni `TerminerMatch` :
des chunks chargés **à la demande** étaient comptés dans la première
peinture. Les chiffres annoncés étaient gonflés. Le manifeste de Vite dit
quels chunks l'entrée importe **statiquement** ; c'est lui qui fait foi.

### 4. Un bouchon qui ment produit un faux bug

Tant qu'un bouchon ignorait `orderBy`, le podium sortait dans le désordre
et ressemblait à un bug de tri. Ce n'en était pas un. **Avant de déclarer
un bug trouvé par le harnais, vérifier que le bouchon ne l'a pas
fabriqué.**

### 5. Une exception se déclare, elle ne se glisse pas

Un écran sans plaque le dit dans `ROUTES` (`sansPlaque: true`), en une
ligne qu'on relit. Elle dit « cet écran ne nous doit pas de plaque », pas
« il ne doit jamais en porter » : exiger l'**absence** produisait une
fausse alerte sur l'état vide du chat, qui en utilise une légitimement.

### 6. Une nouvelle route s'ajoute à `ROUTES`

Dans `qa.mjs` **et** dans `verifier-racine.mjs`. Une route absente de ces
listes n'est jamais mesurée — c'est la seule façon qu'une régression
passe.

### 7. Un échec se lit, il ne se contourne pas

Chaque `✗` nomme l'élément et le ratio obtenu. Corriger la cause, pas le
seuil.

## Ce qui a été retiré, et pourquoi

Le harnais de la v1 chargeait `index.html` **en entier** dans Chromium :
c'était la seule façon d'exercer du code sans build ni modules. Ses sondes
`portee`, `plaques`, `contraste`, `precache` et `captures` visaient ce
fichier unique, qui n'existe plus sous cette forme.

- `portee.mjs` cherchait un nom appelé mais jamais défini, et une fonction
  d'écran imbriquée par accident dans une autre. **TypeScript répond aux
  deux à la compilation**, sur tout le code, sans navigateur.
- `plaques` et `contraste` sont devenues des sondes de `qa.mjs`.
- `precache.mjs` vérifiait qu'un fichier listé existait. Workbox génère
  désormais la liste **depuis le build** : l'écart qu'il cherchait ne peut
  plus se produire.
- `captures.mjs` fabriquait des images à regarder ; `qa.mjs` en produit.

`v1.html` n'est **pas** testé : c'est du code gelé, gardé comme secours.
Des tests sur du code que personne ne modifie produisent du bruit, pas du
signal.

`functions.mjs` survit intact : les fonctions serveur n'ont ni build ni
dépendances communes avec l'app, et c'est là que vit l'XP.

## Étapes de travail

1. Modifier le code.
2. `node .claude/skills/kolektif-testing-qa/scripts/tout.mjs`
3. Lire chaque `✗` : élément, ratio, écran.
4. Corriger la **cause**.
5. Rejouer jusqu'au vert.

## Erreurs à éviter

- Lire une couleur dans une chaîne CSS au lieu du pixel peint.
- Baisser un seuil pour faire passer une sonde.
- Croire un bug rapporté par le harnais sans vérifier le bouchon.
- Ajouter une route sans l'ajouter aux deux `ROUTES`.
- Publier à la racine sans rejouer `verifier-racine.mjs` : `dist/` peut
  être vert et la racine cassée.
- Garder une sonde qui ne peut plus rien attraper.

## Critères de validation

- [ ] `tout.mjs` sort en 0.
- [ ] Aucune erreur page, aucun 404, sur les 18 routes.
- [ ] Le service worker s'active et `v1.html` reste joignable.
- [ ] Le poids de première peinture tient dans le budget.

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs   # suite complète

cd app
npm run build              # types
npm test                   # unité
npm run qa                 # sondes sur le site construit
npm run qa contraste       # une seule sonde
npm run verifier-racine    # conformité de la racine publiée
npm run deployer           # build + publication + vérification

cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/functions.mjs   # XP serveur
```

### Variables d'environnement

| Variable | Défaut | Usage |
|---|---|---|
| `KOLEKTIF_RACINE` | racine déduite du script | racine du dépôt |
| `KOLEKTIF_CHROME` | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | binaire Chromium (`functions.mjs` n'en a pas besoin) |

Sur une autre machine, installer Playwright
(`npx playwright install chromium`) et pointer le chemin vers le binaire
qu'il renvoie — dans `qa.mjs` et `verifier-racine.mjs`, où il est en
constante.
