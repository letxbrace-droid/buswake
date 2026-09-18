---
name: kolektif-pwa-performance
description: Performance et fonctionnement hors-ligne de KOLEKTIF — service worker généré par Workbox, découpage des chunks, poids de première peinture, requêtes Firestore bornées, écoutes temps réel. À utiliser avant d'ajouter une image, une police ou une dépendance, de modifier la configuration PWA, d'ajouter une requête Firestore ou un onSnapshot, ou quand l'app est lente ou lourde.
---

# Performance et PWA — KOLEKTIF

## Objectif

Garder une application **installable, rapide au premier lancement et
utilisable hors-ligne**.

Le levier a changé avec la v2. En v1, tout arrivait d'un bloc : il n'y
avait rien à découper, seulement des assets à peser. Ici le code est
découpé par route, et la question centrale devient **ce qui part à la
première peinture** — un import statique de trop dans une feuille chargée
à la demande la ramène dans le paquet d'entrée sans que rien ne prévienne.

## Quand l'utiliser

- Ajouter une **image**, une police, une **dépendance npm**.
- Modifier la configuration `VitePWA` ou `manifest.json`.
- Ajouter une **requête Firestore** ou un `onSnapshot`.
- L'app est lente, lourde, ou un correctif « ne s'affiche pas ».

## État mesuré aujourd'hui

```
première peinture     98 Ko gzippés   (budget 110)
total du build       374 Ko gzippés   (budget 400)
précache              56 entrées · 1 652 Ko
```

Mesuré par `npm run qa poids`, **depuis le manifeste de Vite**, pas depuis
les noms de fichiers — voir la règle 3.

Le plus gros morceau du total est `firebase` (549 Ko bruts). Il est
**hors** de la première peinture : le service d'authentification s'importe
dynamiquement. C'était 326 Ko de première peinture avant cette bascule.

## Règles métier

### 1. Le service worker est GÉNÉRÉ — on ne l'écrit plus

`sw.js`, `workbox-*.js` et `registerSW.js` à la racine sont des **produits
de build**. Les modifier à la main, c'est écrire dans un fichier que le
prochain `npm run deployer` écrase. Tout se règle dans le bloc `VitePWA`
de `app/vite.config.ts`.

Conséquences directes, toutes acquises :
- **Plus de version de cache à incrémenter.** Workbox empreinte chaque
  fichier et régénère la liste depuis le build. La constante `cs5-vNN` de
  la v1 n'existe plus.
- **Plus de liste `PRECACHE` à tenir à jour**, donc plus de « fichier
  listé et absent » : `globPatterns` balaie `dist/`, qui ne contient que
  ce que le build a produit.
- `nettoyage-v1.js`, importé par le worker, **efface les caches `cs5-*`**
  restés sur les appareils déjà venus. Workbox ne nettoie que les siens.

### 2. Une navigation n'est pas toujours une route

Workbox fait retomber **toute** navigation sur `index.html`. C'est ce
qu'il faut pour du routage côté client — et c'est faux pour une vraie
page posée à côté. `v1.html`, le secours, renvoyait la v2 chez quiconque
avait le worker installé, c'est-à-dire exactement les gens qui en auraient
eu besoin.

Toute page servie à la racine **qui n'est pas l'app** va dans
`navigateFallbackDenylist`. `verifier-racine.mjs` le vérifie.

### 3. Le poids de première peinture se mesure sur le MANIFESTE

Il s'est mesuré un temps en filtrant les **noms** de chunks. Un filtre sur
« Matchs » ne reconnaît ni `DetailMatch` ni `TerminerMatch` : des chunks
chargés à la demande étaient comptés dans la première peinture, et les
chiffres annoncés étaient gonflés. Le manifeste de Vite dit quels chunks
l'entrée importe **statiquement** ; c'est la seule source qui fait foi.

Deux régressions déjà attrapées par cette mesure, toutes deux invisibles
dans le diff :
- un `import` statique de `services/auth` tirait **tout Firebase** dans
  l'entrée — 326 Ko. Passé en import dynamique ;
- un fournisseur de toasts monté à la racine tirait **Motion** — 137 Ko.
  Les toasts ont été réécrits en CSS. 137 → 97 Ko.

### 4. Les chunks se regroupent sur des FRONTIÈRES DE PAQUET

`manualChunks` a d'abord testé `id.includes('/react')`. Ça attrapait aussi
`@tanstack/react-query`, `react-hook-form` et `motion/react` — tous
ramenés dans le chunk de première peinture alors qu'ils ne servent qu'à
des écrans chargés à la demande. Mesuré : 147 Ko au lieu de 136.

Le regroupement se fait sur le **nom du paquet** extrait du chemin
`node_modules`, jamais sur un bout de nom.

### 5. Toute requête Firestore est bornée — et bornée DANS LE BON SENS

Un `where` sur l'utilisateur borne naturellement : un joueur a une poignée
de matchs. Un `where` sur la **plateforme**, non : le fil public lisait
tous les matchs publics à venir, de tout le monde, pour en montrer trois
dans le rayon. Il est plafonné à 60, triés par `finVisible` croissant —
les plus imminents.

Le **sens** de la coupe compte autant que la borne. Le chat lisait son fil
trié à l'endroit ; y ajouter un `limit` aurait gardé les cent **premiers**
messages, figeant la conversation sur son début, sans qu'aucune erreur
n'apparaisse et sans que ça se voie sur un fil court. Il trie donc du plus
récent au plus ancien, plafonne à 100, et `rangerMessages` remet en ordre
de lecture côté client — avec un test qui le prouve.

Une borne posée sur une liste ensuite **filtrée côté client** (le rayon)
est un compromis, pas une solution : quand 60 matchs imminents ne
couvriront plus un rayon, il faudra une vraie requête géographique
(geohash). Monter le plafond ne ferait que déplacer le trou.

### 6. Toute écoute temps réel est désinscrite

`onSnapshot` renvoie une fonction de désinscription. En React, elle est le
**retour du `useEffect`** qui l'a ouverte — c'est ce qui la lie au cycle de
vie du composant. Une écoute oubliée continue de facturer des lectures et
de redessiner un écran que personne ne regarde.

### 7. Le flou coûte cher

`backdrop-filter` est la couche la plus chère du rendu. Elle est réservée
aux plaques, avec un repli `@supports not` qui **épaissit le fond** : une
carte translucide non floutée sur une photo devient illisible.

### 8. Les polices sont servies par nous

Pas de Google Fonts à l'exécution : une dépendance réseau de moins et pas
de FOIT hors-ligne. Elles sont déclarées dans `polices.css`, **pas** dans
un `<style>` en ligne — Vite ne traite pas les `@font-face` d'un style
inline, et le build est parti une fois **sans polices** pour cette raison.
Le défaut ne se voyait pas en dev.

### 9. Ce qui n'est lu que par les robots ne se précache pas

Les bannières `og-*.jpg` ne sont lues que par les aperçus de partage
(WhatsApp, iMessage) : les précharger coûterait 128 Ko à chaque
installation pour rien. En revanche `m/*.html` **est** précaché : hors
ligne, un lien de partage doit pouvoir exécuter sa redirection, sinon le
`#j=<id>` est perdu.

### 10. Les écussons de clubs sont un 404 déguisé

`clubs/*.png` n'existe pas : chaque écusson provoque une 404 locale, puis
un lien vers `crests.football-data.org`, puis un repli texte. Dix clubs =
jusqu'à dix requêtes ratées. Déposer les PNG dans `clubs/` supprime
l'aller-retour **et** les rend disponibles hors-ligne.

## Étapes de travail

1. **Peser avant d'ajouter** : `ls -la <fichier>`. Au-delà de 100 Ko,
   justifier ou recompresser.
2. **Pour une dépendance** : est-elle importée depuis un écran chargé à la
   demande, ou depuis la racine ? Une bibliothèque montée à la racine part
   à la première peinture, quel que soit l'endroit où elle sert.
3. **Mesurer** : `npm run qa poids`. Comparer AVANT / APRÈS, pas au
   budget seul.
4. **Pour une requête** : `where` + `limit`, et vérifier le **sens** du
   tri si la limite coupe.
5. **Pour une écoute** : la désinscription est le retour du `useEffect`.

## Erreurs à éviter

- **Modifier `sw.js` à la main** : c'est un produit de build, il sera
  écrasé.
- Ajouter une page à la racine sans l'ajouter au `navigateFallbackDenylist`.
- Regrouper des chunks sur un bout de nom au lieu du nom de paquet.
- Importer statiquement, depuis la racine, ce qui ne sert qu'à un écran.
- Ajouter une image de fond sans la recompresser.
- Laisser un `onSnapshot` sans désinscription.
- Précacher des assets de sports inactifs.
- Ajouter un appel réseau externe sans repli : l'app doit rester
  utilisable hors-ligne. Deux géocodeurs différents sont déjà appelés
  (`photon.komoot.io` pour la recherche de terrain,
  `nominatim.openstreetmap.org` pour le code postal) — ne pas en ajouter
  un troisième.

## Critères de validation

- [ ] `npm run qa poids` sort en 0 : première peinture sous 110 Ko,
      total sous 400 Ko.
- [ ] Le poids de première peinture n'a pas augmenté sans raison écrite.
- [ ] Aucun asset orphelin introduit.
- [ ] Toute nouvelle requête porte un `limit`, et le tri coupe du bon côté.
- [ ] Toute nouvelle écoute est désinscrite par son `useEffect`.
- [ ] L'app se charge encore avec le réseau coupé (onglet *Offline*).

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/precache.mjs

# Les plus gros fichiers du dépôt
ls -S *.jpg *.png | head -8 | xargs ls -la

# Écoutes temps réel : chaque onSnapshot a-t-il sa désinscription ?
grep -n 'onSnapshot' index.html
grep -n 'activeListeners.push' index.html

# Requêtes sans limite
grep -n 'query(collection' index.html | grep -v 'limit('

# Essai hors-ligne
python3 -m http.server 8000
# puis DevTools → Application → Service Workers → Offline → recharger
```
