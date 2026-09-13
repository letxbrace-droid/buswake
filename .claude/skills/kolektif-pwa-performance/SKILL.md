---
name: kolektif-pwa-performance
description: Performance et fonctionnement hors-ligne de KOLEKTIF — service worker, précache, poids des assets, requêtes Firestore bornées, écoutes temps réel. À utiliser avant d'ajouter une image ou une police, de modifier sw.js, d'ajouter une requête Firestore ou un onSnapshot, ou quand l'app est lente ou lourde.
---

# Performance et PWA — KOLEKTIF

## Objectif

Garder une application **installable, rapide au premier lancement et
utilisable hors-ligne**, alors qu'elle tient dans un seul fichier de
470 Ko et précharge 2,4 Mo d'assets.

## Quand l'utiliser

- Ajouter une **image**, une police, un fichier quelconque.
- Modifier `sw.js` ou `manifest.json`.
- Ajouter une **requête Firestore** ou un `onSnapshot`.
- L'app est lente, lourde, ou un correctif « ne s'affiche pas ».

## État mesuré aujourd'hui

```
index.html           469 Ko   (CSS ~2 850 lignes + JS ~5 500 lignes)
précache              36 entrées · 2 426 Ko
```

Trois poids discutables, identifiés et **non corrigés** :
- `index.html` est précaché **deux fois** (`'./'` et `'./index.html'`) :
  ~469 Ko de doublon ;
- `art-player.png` pèse **402 Ko** pour une silhouette de repli ;
- 169 Ko d'assets de sports **inactifs** (`foot7`, `basket3`, `padel`,
  `tennis`) sont préchargés alors que `SPORTS_ACTIFS = ['foot5']` ;
- `logo.jpg` (287 Ko) n'est référencé nulle part.

## Règles métier

### 1. La page en *network-first*, les assets en *cache-first*

`sw.js` sert `index.html` par le réseau d'abord (repli cache), et tout le
reste par le cache d'abord. Sans ça, un correctif reste invisible
derrière un cache figé. **Ne pas inverser.**

### 2. Toute modification d'un fichier précaché exige un bump de `CACHE`

`const CACHE = 'cs5-vNN'` en tête de `sw.js`. C'est la règle la plus
facile à oublier et la plus coûteuse : les utilisateurs gardent l'ancienne
version sans le savoir. `precache.mjs` le vérifie contre `git diff`.

### 3. Un fichier listé et absent casse TOUT le précache

`cache.addAll()` est atomique : une seule 404 et rien n'est mis en cache.
L'app n'est alors plus installable hors-ligne, **sans message d'erreur**.

### 4. Toute requête Firestore est bornée

Le classement lisait la collection `users` entière : à mille inscrits,
mille documents téléchargés pour en afficher dix. Il est aujourd'hui en
`limit(200)`. Toute nouvelle requête porte un `where` **et** un `limit`.

### 5. Toute écoute temps réel est désinscrite

`onSnapshot` renvoie une fonction de désinscription : la pousser dans
`activeListeners`, que `cleanupListeners()` vide. Une écoute oubliée
continue de facturer des lectures et de redessiner un écran invisible.

### 6. Le flou coûte cher

`backdrop-filter` est la couche la plus chère du rendu. Elle est réservée
aux plaques, avec un repli `@supports not` qui **épaissit le fond** : une
carte translucide non floutée sur une photo devient illisible.

### 7. Les polices sont servies par nous

Quatre `woff2` dans `fonts/` (88 Ko), pas de Google Fonts à l'exécution :
une dépendance réseau de moins et pas de FOIT hors-ligne.

### 8. Ce qui n'est lu que par les robots ne se précache pas

Les bannières `og-*.jpg` ne sont lues que par les aperçus de partage
(WhatsApp, iMessage) : les précharger coûterait 128 Ko à chaque
installation pour rien. En revanche `m/*.html` **est** précaché : hors
ligne, un lien de partage doit pouvoir exécuter sa redirection, sinon le
`#j=<id>` est perdu.

### 9. Les écussons de clubs sont un 404 déguisé

`clubs/*.png` n'existe pas : chaque écusson provoque une 404 locale, puis
un lien vers `crests.football-data.org`, puis un repli texte. Dix clubs =
jusqu'à dix requêtes ratées. Déposer les PNG dans `clubs/` supprime
l'aller-retour **et** les rend disponibles hors-ligne.

## Étapes de travail

1. **Peser avant d'ajouter** : `ls -la <fichier>`. Au-delà de 100 Ko,
   justifier ou recompresser.
2. **Décider du précache** : l'app le lit-elle ? Sinon, hors liste.
3. **Ajouter à `PRECACHE`** et **incrémenter `CACHE`** dans le même commit.
4. **Vérifier** : `node .claude/skills/kolektif-testing-qa/scripts/precache.mjs`
5. **Pour une requête** : `where` + `limit`, et désinscription si c'est
   une écoute.

## Erreurs à éviter

- Ajouter un asset sans toucher à `sw.js`.
- Incrémenter `CACHE` sans ajouter le fichier à `PRECACHE` (ou l'inverse).
- Mettre la page en cache-first « pour aller plus vite ».
- Ajouter une image de fond sans la recompresser.
- Laisser un `onSnapshot` sans désinscription.
- Précacher des assets de sports inactifs.
- Ajouter un appel réseau externe sans repli : l'app doit rester
  utilisable hors-ligne. Deux géocodeurs différents sont déjà appelés
  (`photon.komoot.io` pour la recherche de terrain,
  `nominatim.openstreetmap.org` pour le code postal) — ne pas en ajouter
  un troisième.

## Critères de validation

- [ ] `precache.mjs` sort en 0.
- [ ] Le précache reste sous 3 Mo.
- [ ] `CACHE` a été incrémenté si un fichier précaché a changé.
- [ ] Aucun asset orphelin introduit.
- [ ] Toute nouvelle requête porte un `limit`.
- [ ] Toute nouvelle écoute est dans `activeListeners`.
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
