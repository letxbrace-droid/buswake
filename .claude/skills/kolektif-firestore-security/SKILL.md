---
name: kolektif-firestore-security
description: Règles de sécurité Firestore de KOLEKTIF — qui a le droit d'écrire quoi, échappement HTML, données venant de tiers. À utiliser avant de modifier firestore.rules, d'ajouter une collection ou un champ écrit par un client, d'afficher une chaîne saisie par un utilisateur, ou de déployer les règles.
---

# Sécurité Firestore et injection — KOLEKTIF

## Objectif

Empêcher qu'un joueur puisse, depuis la console de son navigateur,
gonfler son classement, réécrire un match qui n'est pas le sien, ou
placer du HTML dans l'écran des autres.

## Quand l'utiliser

- Modifier `firestore.rules` ou ajouter une collection.
- Ajouter un champ **écrit par un client**.
- Afficher une chaîne qui vient d'un utilisateur **ou d'une API tierce**.
- Avant tout `firebase deploy --only firestore:rules`.
- Répondre à « est-ce qu'on peut tricher là-dessus ? ».

## Le modèle en une phrase

> Tout ce qu'un joueur aurait intérêt à gonfler s'écrit côté serveur.

## Règles métier

### 1. Les règles ne sont pas un filtre d'affichage

Le client filtre pour le confort ; la règle décide. Toute donnée non
protégée par une règle est modifiable en trois lignes dans la console.

### 2. `get` et `list` sont deux droits distincts

`allow get` ouvert = le lien d'invitation marche. `allow list` filtré =
un fil ne peut ramener que du public ou mes propres matchs. Sur une
requête de liste, **chaque document renvoyé** doit être autorisé, sinon
Firestore refuse la requête entière — une liste qui renvoie vide est
souvent une règle trop stricte, pas une base vide.

### 3. Borner les clés modifiées, pas seulement les valeurs

Le motif du projet :

```
request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])
```

Utilisé par `onlyParticipation()`, `onlyGamificationAndSocial()`,
`rejointOuQuitte()` et la réponse à un défi. Sans ça, un joueur qui a le
droit de voter a le droit de tout réécrire.

### 4. Un identifiant fermé, jamais une chaîne libre

`embleme`, `couleur`, `club`, `niveau`, `statut`, `visibilite` sont
validés **contre une liste** dans les règles. Raison : ces valeurs
finissent dans des attributs SVG et des sélecteurs côté client.

Conséquence directe : **ces listes sont dupliquées entre `index.html` et
`firestore.rules`**. En changer une sans l'autre casse la création. Le
vert historique `#00D88A` est gardé dans la règle pour que les équipes
créées avant le changement de palette restent modifiables.

### 5. Les statistiques d'équipe sont refusées à tout client

Y compris au capitaine. Écrites uniquement par `majBilanEquipes()`
(Admin SDK, qui contourne les règles). Ne jamais « juste autoriser le
capitaine ».

### 6. Les marqueurs `_notifs` appartiennent au serveur

Aucun client n'a besoin d'y toucher. Le trigger ignore les écritures qui
ne changent qu'eux (`stripNotifs`), sinon il se déclenche lui-même en
boucle.

### 7. Toute chaîne affichée passe par `escapeHtml()`

Y compris — surtout — celles qui viennent d'une API tierce. Le nom d'un
terrain vient de `photon.komoot.io` : c'est de la donnée OpenStreetMap
libre, stockée telle quelle dans `creneauxProposes[].lieu`, puis affichée
à tous les participants du match.

Les règles bornent la **longueur** du pseudo (24 caractères) mais pas son
**contenu** : `<svg onload=…>` tient dans 24 caractères.

### 8. Déployer les règles est un acte séparé

Modifier `firestore.rules` dans le dépôt ne change **rien** en
production. Tant que le déploiement n'a pas eu lieu, l'ancienne règle
s'applique — y compris sur les nouveaux champs.

## Étapes de travail

1. **Nommer l'attaquant** : que gagnerait un joueur à écrire ce champ ?
2. **Choisir le gardien** : règle Firestore si la validation est
   exprimable ; Cloud Function si elle demande de lire d'autres
   documents.
3. **Écrire la règle** avec `hasOnly()` sur les clés, une liste fermée
   sur les valeurs, une borne sur les tailles de tableaux.
4. **Vérifier la duplication** : toute liste fermée doit correspondre
   exactement à la constante côté client.
5. **Tester les deux sens** : l'écriture légitime passe, l'écriture
   illégitime échoue.
6. **Déployer**, puis vérifier dans la console Firebase que la version
   publiée est bien la nouvelle.

## Erreurs à éviter

- **Autoriser un champ « juste pour le créateur »** sans borner les clés
  modifiées : il devient alors propriétaire de tout le document.
- **Oublier `escapeHtml`** sur une donnée tierce parce qu'elle « vient
  d'une API sérieuse ».
- **Changer une liste d'un seul côté** (client ou règle).
- **Croire qu'une valeur bornée en longueur est sûre.**
- **Déployer les règles sans les index** : une requête composite sans
  index échoue en production et l'écran reste vide.
- **Tester uniquement le cas nominal.**

## Points ouverts connus (à traiter, non corrigés)

1. **XP et badges modifiables par n'importe quel joueur connecté.**
   `onlyGamificationAndSocial()` autorise tout compte connecté à écrire
   `xp`, `badges`, `stats` sur **n'importe quel** document `users/{uid}`.
   C'est voulu au départ (le créateur distribue l'XP en fin de match
   depuis le client, via `addXP`), mais cela rend le classement joueurs
   falsifiable depuis la console. Le classement par équipe est protégé,
   celui des joueurs ne l'est pas.
   *Correction : déplacer l'attribution d'XP dans `onMatchEcrit`, comme
   `majBilanEquipes`, et retirer `xp`/`badges`/`stats` de la liste.*

2. **Chaînes affichées sans échappement.**
   Au moins : `index.html:4457` (`${j.pseudo}` dans la fiche joueur d'un
   match), `index.html:6266` (`${c.lieu}`, nom de terrain venant de
   l'API tierce), et `showToast()` qui interpole son message en
   `innerHTML` alors que plusieurs appelants lui passent un pseudo brut.
   *Correction : `escapeHtml()` sur ces sites, et faire de `showToast`
   une fonction qui pose du texte, pas du HTML.*

3. **`creneauxProposes[].lieu` n'est borné par aucune règle** (contrairement
   à `defis.lieu`, borné à 80 caractères).

## Critères de validation

- [ ] Chaque nouveau champ écrit par un client est nommé dans un
      `hasOnly()`.
- [ ] Chaque valeur d'énumération est validée contre une liste fermée.
- [ ] Chaque liste fermée correspond à la constante côté client.
- [ ] Chaque tableau écrit par un client a une borne de taille.
- [ ] Chaque chaîne affichée passe par `escapeHtml()`.
- [ ] Les règles **et** les index sont déployés.

## Commandes de test

```bash
cd ~/buswake

# Les listes fermées concordent-elles entre le client et les règles ?
grep -n "embleme\|couleur\|niveau" firestore.rules | head
grep -n "COULEURS_EQUIPE\|const NIVEAUX\|EMBLEMES = {" index.html

# Interpolations de données utilisateur sans échappement
grep -nE '\$\{[^}]*\b(pseudo|\.nom|lieu|message|description|appel|text)\b[^}]*\}' index.html \
  | grep -v escapeHtml

# Déploiement (depuis Google Cloud Shell ou une machine avec firebase-tools)
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```
