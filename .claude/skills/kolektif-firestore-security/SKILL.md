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

Conséquence directe : **ces listes sont dupliquées entre `app/src/domaine/`
et `firestore.rules`**. En changer une sans l'autre casse la création — la
règle refuse, et le client n'apprend qu'un « permission denied ». Le
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

### 7. L'échappement n'est plus un travail, `dangerouslySetInnerHTML` l'est

React échappe `{expression}` par construction : un pseudo, un nom de
terrain venu d'une API tierce, un message de chat s'affichent tels quels,
comme du **texte**. C'est pourquoi la v2 n'a plus le défaut que la v1
traînait à plusieurs endroits.

Cette protection a exactement une porte de sortie, et elle est nommée pour
qu'on ne la franchisse pas par distraction. **Il n'y a aujourd'hui aucun
`dangerouslySetInnerHTML` dans `app/src/` ; en introduire un ramènerait la
classe entière de défauts.** Si un jour il en faut vraiment un,
l'assainissement se démontre à côté, avec un test.

Les mêmes chaînes restent **étrangères** pour autant : une valeur qui
finit dans un attribut SVG, un `style`, une URL ou un sélecteur n'est pas
protégée par React. C'est ce que fait la règle 4 — identifiants fermés,
jamais de chaîne libre.

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

1. ~~**XP et badges modifiables par n'importe quel joueur connecté.**~~
   **Corrigé.** `champsDeJeu()` — `xp`, `badges`, `stats`, `noteSum`,
   `noteCount`, `presences`, `lapins`, `streak` — est refusé à **tous** les
   clients, y compris au propriétaire du document. L'XP est versée par
   `onMatchEcrit` (Admin SDK), et `_xp` retient qui a déjà été payé, pour
   qu'un match rejoué ne paie pas deux fois.

2. ~~**Chaînes affichées sans échappement.**~~
   **Dissous par la migration, pas corrigé site par site.** React échappe
   `{expression}` par construction ; la v2 ne contient **aucun**
   `dangerouslySetInnerHTML` ni `innerHTML`. La classe entière de défauts
   a disparu avec le `innerHTML` de la v1 — ce qui vaut mieux que de
   l'avoir traquée un site à la fois.

   La règle survit sous une autre forme, plus étroite : voir la règle 7.

3. **`creneauxProposes[].lieu` n'est borné par aucune règle.** *Toujours
   ouvert.* La liste est bornée en **nombre** (≤ 10 entrées), pas en
   contenu : le langage des règles ne sait pas itérer une liste pour
   valider chaque élément. Il faudrait soit aplatir le créneau en champs
   séparés, soit valider dans `onMatchEcrit` après coup. À arbitrer ; le
   nom vient d'une API tierce, donc d'ailleurs que du joueur.

## Critères de validation

- [ ] Chaque nouveau champ écrit par un client est nommé dans un
      `hasOnly()`.
- [ ] Chaque valeur d'énumération est validée contre une liste fermée.
- [ ] Chaque liste fermée correspond à la constante côté client.
- [ ] Chaque tableau écrit par un client a une borne de taille.
- [ ] Aucun `dangerouslySetInnerHTML` introduit.
- [ ] Aucune chaîne venant d'un tiers ne part dans un attribut SVG, un
      `style`, une URL ou un sélecteur sans liste fermée.
- [ ] Les règles **et** les index sont déployés.

## Commandes de test

```bash
cd ~/buswake

# Les listes fermées concordent-elles entre le client et les règles ?
grep -n "embleme\|couleur\|niveau" firestore.rules | head
grep -rn "COULEURS_EQUIPE\|NIVEAUX\|EMBLEMES" app/src/domaine/

# La porte de sortie de l'échappement de React — doit rester vide
grep -rn "dangerouslySetInnerHTML\|\.innerHTML" app/src/

# Les champs de jeu sont-ils bien refusés à tous les clients ?
grep -n "champsDeJeu" -A 4 firestore.rules

# Déploiement (depuis Google Cloud Shell ou une machine avec firebase-tools)
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```
