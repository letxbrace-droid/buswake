---
name: kolektif-product-architecture
description: Règles de produit et d'architecture de KOLEKTIF (PWA foot à 5, Firebase). À utiliser avant d'ajouter un écran, un champ Firestore, une collection, une statistique, un compteur ou une notification, avant de modifier le cycle de vie d'un match, et dès qu'une décision touche au modèle de données ou au périmètre fonctionnel.
---

# Architecture produit — KOLEKTIF

## Objectif

Garder cohérents le modèle de données, le cycle de vie d'un match et le
périmètre fonctionnel, dans une application **mono-fichier** de ~8 600
lignes où rien n'empêche mécaniquement une incohérence.

## Quand l'utiliser

- Ajouter ou modifier un **écran**, un **champ Firestore**, une **collection**.
- Afficher un **chiffre** (compteur, statistique, classement, pourcentage).
- Toucher au **cycle de vie** d'un match (`sondage → confirmé → terminé`).
- Ajouter une **notification** ou un déclencheur Cloud Function.
- Rouvrir un sport, ajouter un format, changer un effectif.
- Répondre à « où est stocké X ? » ou « qui a le droit d'écrire Y ? ».

## Ce qu'il faut lire d'abord

| Fichier | Contenu |
|---|---|
| `ARCHITECTURE.md` | modèle de données par collection, cycle de vie, push |
| `AUDIT.md` | décisions produit prises et écartées, avec l'argument |
| `app/src/domaine/` | **la règle métier, en fonctions pures** — c'est là qu'on lit ce que l'app décide |
| `app/src/services/` | la seule couche qui parle à Firestore |
| `app/src/ecrans/` | un écran = un fichier ; ils ne connaissent pas Firestore |
| `functions/index.js` | les deux seules fonctions serveur |
| `firestore.rules` | ce que chaque client a le droit d'écrire |
| la racine du dépôt | **le site publié** : produit de `npm run deployer`, jamais édité à la main |

## Règles métier

### 1. Un compteur affiché est une promesse

Ne jamais afficher un nombre qui n'est pas **calculé à partir de documents
réellement lus**. Pas de « +32 % ce mois », pas de « 120 joueurs actifs »
si rien ne les compte. Si le chiffre n'est pas calculable, la phrase
change — pas le chiffre.

### 2. Le nombre de joueurs appartient au MATCH, pas à l'application

`joueursMax` est stocké sur le document match. Le serveur retombe sur 10
uniquement pour les matchs d'avant le multi-sport (`maxJoueurs()` dans
`functions/index.js`). Ne jamais coder `10` en dur dans une nouvelle
fonctionnalité.

### 3. Mono-sport par configuration, multi-sport par construction

`SPORTS_ACTIFS = ['foot5']` retire le **choix**, pas le **code**. Le
catalogue `SPORTS`, le champ `sport` sur chaque document et `MONO_SPORT`
restent en place. Rouvrir un sport = une entrée dans ce tableau. Ne
jamais supprimer la dimension `sport` d'un modèle.

### 4. Trois statuts, dans cet ordre, sans saut

`sondage` → `confirmé` → `terminé`. La création est **toujours** en
`sondage` (imposé par les règles). Un défi accepté crée donc un match en
`sondage` puis le passe à `confirmé` en deux écritures — ne pas assouplir
la règle pour économiser une écriture.

### 5. Le palmarès des équipes n'est écrit que par le serveur

`equipes/{id}.stats` est refusé à **tout** client, capitaine compris
(`firestore.rules`). Il est mis à jour par `majBilanEquipes()` dans
`onMatchEcrit`, et uniquement pour les matchs nés d'un défi (ceux qui
portent `equipeAId` et `equipeBId`). Un classement par équipe écrit
côté client ne vaut rien.

### 6. Un match « privé » est non référencé, pas secret

`allow get` est ouvert à tout connecté : c'est ce qui fait marcher le
lien d'invitation. `allow list` filtre. Ne jamais mettre de donnée
sensible sur un document match.

### 7. Le fuseau est Europe/Paris, le runtime est en UTC

Toute date côté serveur passe par `parisMs()` / `parisYMD()`. Ne jamais
utiliser `new Date()` nu pour comparer à une date de match dans
`functions/`.

### 8. Le champ d'amitié s'appelle `friends`

Pas `amis`. La documentation s'est déjà trompée : vérifier dans le code,
pas dans le markdown.

## Étapes de travail

1. **Situer** — quel écran, quelle collection ?
   `ls app/src/ecrans/` puis `grep -rn '<champ>' app/src/domaine/`
2. **Vérifier le modèle** — le champ existe-t-il déjà ? sous quel nom ?
   `grep -rn '<champ>' app/src/domaine/ functions/index.js firestore.rules`
3. **Décider où vit la vérité** — client, règle, ou Cloud Function. Toute
   donnée qu'un joueur aurait intérêt à gonfler va côté serveur.
4. **Écrire la RÈGLE dans `domaine/`, en fonction pure.** C'est le point
   d'architecture qui porte tout le reste : une décision métier écrite
   dans un composant n'est testable qu'en montant un navigateur, donc
   elle finit par ne pas l'être. Le composant appelle, il ne décide pas.
5. **Le service** si Firestore est en jeu : aucun écran n'importe
   `firebase/firestore` directement. C'est ce qui garde le domaine
   testable sans réseau.
6. **Propager** — règles Firestore, index, `ARCHITECTURE.md`.
7. **Vérifier** — `node .claude/skills/kolektif-testing-qa/scripts/tout.mjs`
8. **Publier** — `cd app && npm run deployer`. Le source poussé n'est pas
   le site : voir `kolektif-release-checklist`.

## Erreurs à éviter

- **Écrire une règle métier dans un composant.** Elle devient intestable
  sans navigateur, donc elle ne sera pas testée. Elle va dans `domaine/`.
- **Importer `firebase/firestore` depuis un écran.** La couche service
  existe pour que le reste soit remplaçable et testable hors réseau.
- **Modifier la racine du dépôt à la main.** C'est un produit de build.
- **Remplacer une chaîne partout sans regarder où elle atterrit.** Un
  remplacement global `#FF8A3D` → `var(--feu)` a corrompu
  `COULEURS_EQUIPE`, dont les valeurs sont **écrites en base** et
  validées littéralement par les règles.
- **Ajouter un champ sans l'autoriser dans les règles.** L'écriture
  échoue silencieusement dans un `catch` ; l'écran reste vide.
- **Supposer un type de date.** Une date peut arriver en `Timestamp`, en
  `Date` ou en chaîne selon l'âge du document. Utiliser `versDate()` de
  `domaine/match`.
- **Documenter avant de vérifier.** Lire le code fait foi.

## Critères de validation

- [ ] Aucun chiffre affiché n'est inventé.
- [ ] Le nouveau champ est décrit dans `ARCHITECTURE.md`.
- [ ] Les règles autorisent explicitement l'écriture prévue.
- [ ] Si une requête composite est introduite : l'index est dans
      `firestore.indexes.json`.
- [ ] La nouvelle règle métier est dans `domaine/`, avec son test.
- [ ] Aucun écran n'importe `firebase/firestore`.
- [ ] Toute nouvelle route est ajoutée aux `ROUTES` de `qa.mjs` **et** de
      `verifier-racine.mjs`, sinon elle n'est jamais mesurée.
- [ ] Aucune constante de football codée en dur.

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs   # suite complète

# Où vit un champ ?
grep -rn 'joueursMax' app/src/ functions/index.js firestore.rules

# Un écran parle-t-il à Firestore en direct ? (doit être vide)
grep -rn "from 'firebase/firestore'" app/src/ecrans/ app/src/composants/

# Quelle règle métier n'a pas de test ?
cd app && for f in src/domaine/*.ts; do
  case "$f" in *.test.ts) continue;; esac
  [ -f "${f%.ts}.test.ts" ] || echo "sans test : $f"
done
```
