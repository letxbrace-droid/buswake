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
| `index.html` | tout le client : CSS ~2 850 lignes puis module JS ~5 500 |
| `functions/index.js` | les deux seules fonctions serveur |
| `firestore.rules` | ce que chaque client a le droit d'écrire |

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

1. **Situer** — quel écran, quelle collection, quelle fonction de rendu ?
   `grep -n 'function render<Écran>' index.html`.
2. **Vérifier le modèle** — le champ existe-t-il déjà ? sous quel nom ?
   `grep -n '<champ>' index.html functions/index.js firestore.rules`
3. **Décider où vit la vérité** — client, règle, ou Cloud Function. Toute
   donnée qu'un joueur aurait intérêt à gonfler va côté serveur.
4. **Écrire le code** au bon endroit dans `index.html` : la fonction doit
   rester **au niveau du module**, jamais imbriquée dans une autre.
5. **Propager** — règles Firestore, index, `sw.js` (version de cache),
   `ARCHITECTURE.md`.
6. **Vérifier** — `node .claude/skills/kolektif-testing-qa/scripts/tout.mjs`

## Erreurs à éviter

- **Imbriquer une fonction d'écran dans une autre.** C'est déjà arrivé :
  cinq fonctions se sont retrouvées dans `renderHome`, l'onglet Équipes
  est parti mort en production. Le test de portée existe pour ça.
- **Remplacer une chaîne partout sans regarder où elle atterrit.** Un
  remplacement global `#FF8A3D` → `var(--feu)` a corrompu
  `COULEURS_EQUIPE`, dont les valeurs sont **écrites en base** et
  validées littéralement par les règles.
- **Ajouter un champ sans l'autoriser dans les règles.** L'écriture
  échoue silencieusement dans un `catch` ; l'écran reste vide.
- **Supposer un type de date.** Une date peut arriver en `Timestamp`, en
  `Date` ou en chaîne selon l'âge du document. Utiliser `_versDate()`.
- **Documenter avant de vérifier.** Lire le code fait foi.

## Critères de validation

- [ ] Aucun chiffre affiché n'est inventé.
- [ ] Le nouveau champ est décrit dans `ARCHITECTURE.md`.
- [ ] Les règles autorisent explicitement l'écriture prévue.
- [ ] Si une requête composite est introduite : l'index est dans
      `firestore.indexes.json`.
- [ ] `portee.mjs` passe : les cinq écrans rendent.
- [ ] Aucune constante de football codée en dur.

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/portee.mjs      # les 5 écrans rendent
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs        # suite complète

# Où vit un champ ?
grep -n 'joueursMax' index.html functions/index.js firestore.rules

# Une fonction est-elle au niveau du module ?
grep -n '^function renderEquipes\|^async function renderEquipes' index.html
```
