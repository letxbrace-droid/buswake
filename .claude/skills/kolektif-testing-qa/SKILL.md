---
name: kolektif-testing-qa
description: Harnais de test et méthode de vérification de KOLEKTIF — portée des fonctions, contraste WCAG mesuré, surfaces translucides, intégrité du précache, captures d'écran. À utiliser après toute modification d'index.html, sw.js ou des assets, et avant chaque commit ou déploiement.
---

# Tests et vérification — KOLEKTIF

## Objectif

Remplacer « ça a l'air bon » par une mesure, dans une application sans
framework, sans build et sans tests unitaires — où la seule façon
d'exercer le code est de **charger le document entier dans un vrai
navigateur**.

## Quand l'utiliser

- Après **toute** modification de `index.html`, `sw.js` ou d'un asset.
- Avant chaque commit et avant chaque déploiement.
- Quand un écran est vide et qu'on ne sait pas pourquoi.
- Quand il faut prouver qu'un texte est lisible.

## Ce que le harnais fait

`scripts/lib/harnais.mjs` charge `index.html` **en entier**, remplace les
imports Firebase par des bouchons (dont un `getDocs` qui respecte la
collection interrogée et `orderBy`), injecte un jeu d'essai, et ouvre le
tout dans Chromium.

Le document instrumenté est écrit en `_harnais.html` **à la racine du
dépôt** — obligatoire, car les images, les polices et le manifeste sont
référencés en relatif — puis supprimé à la fin. S'il traîne après un
plantage, le supprimer à la main ; ne jamais le committer.

## Les cinq contrôles

| Script | Ce qu'il attrape |
|---|---|
| `portee.mjs` | une fonction d'écran déclarée par accident dans une autre, **et un nom appelé mais jamais défini** |
| `plaques.mjs` | une carte translucide qui laisse passer la photo sans être déclarée |
| `contraste.mjs` | un texte sous le seuil WCAG AA sur l'un des cinq écrans |
| `precache.mjs` | un fichier listé absent, un cache non versionné, un asset orphelin |
| `functions.mjs` | l'XP serveur : montants, versement unique, remboursement |
| `captures.mjs` | tout le reste — il faut regarder |

`tout.mjs` enchaîne les cinq premiers et renvoie un code de sortie unique.

`functions.mjs` tourne **sans Firebase** : il recopie `functions/index.js`
en remplaçant les `require` par des bouchons, exactement comme le harnais
du navigateur remplace les imports. Les fonctions serveur n'avaient aucun
test — et c'est là que vit l'XP.

## Règles métier

### 1. Charger le document entier, jamais un extrait

Le jour où cinq fonctions se sont retrouvées imbriquées dans
`renderHome`, le harnais de l'époque **fabriquait le HTML à la main** :
il n'a jamais exercé la portée des fonctions, et l'onglet Équipes est
parti mort en production. Un harnais qui reconstruit la page ne teste pas
la page.

### 2. Une fonction supprimée ne casse pas le rendu

Elle casse le **clic**, en production, et seulement là. `annonceXP` a été
poussée appelée cinq fois et définie zéro : les cinq écrans rendaient,
aucune erreur page, la suite était verte. Le rendu n'exerce pas les
gestionnaires d'événements.

`portee.mjs` lit donc aussi le source : tout `nom(` doit correspondre à
quelque chose. Deux étapes, parce qu'une seule ne suffit pas — on relève
les noms appelés **commentaires et chaînes effacés** (sinon « la vie (…) »
et `var(--orange)` deviennent des appels, et le test crie au loup cent
fois), puis on demande à la page si chaque nom existe **dans la portée du
module**. La portée d'un module ne se devine pas depuis le texte.

Limite assumée : le scanner ne démêle pas complètement un gabarit imbriqué
dans un `${...}`. Un garde sur les caractères accentués rattrape le dernier
résidu connu.

### 3. Mesurer le contraste sans l'encre

Capturer avec le texte visible fait que le pixel le plus clair de la
boîte **est le texte** : on mesure le texte contre lui-même et tout passe
à 1,00. Effacer l'encre (`color:transparent`) avant la capture.

Trois autres pièges, tous rencontrés :
- lire une couleur codée en dur au lieu de `getComputedStyle` ;
- compter un enfant décoratif (pastille, lueur) comme fond ;
- compter la **bordure** de l'élément, où aucun glyphe ne se pose.

### 4. Un élément passé sous le châssis n'est pas mesurable

La barre du haut et la nav du bas recouvrent le contenu : y mesurer un
texte revient à mesurer la barre. `contraste.mjs` les exclut.

### 5. Une propriété en transition ne se lit pas tout de suite

`getComputedStyle` pendant une transition CSS renvoie la valeur
**interpolée**, donc au premier instant celle d'AVANT. Mesurée
synchroniquement après un changement de classe, une couleur qui transite
paraît ne pas avoir changé.

Ça m'a fait chercher pendant six manipulations un `!important` fantôme :
même un `style="color:red"` posé en ligne semblait perdre. Le CSS était
juste depuis le début — la capture d'écran, elle, montrait la bonne
couleur. **Quand la mesure contredit la capture, suspecter la mesure.**
Attendre la fin de la transition (`waitForTimeout` au-delà de `--t-base`)
avant de lire.

### 6. Un bouchon qui ment produit un faux bug

Tant que le bouchon `getDocs` ignorait `orderBy`, le podium du classement
sortait dans le désordre et ressemblait à un bug de tri. Ce n'en était
pas un. **Avant de déclarer un bug trouvé par le harnais, vérifier que le
bouchon ne l'a pas fabriqué.**

### 7. Le jeu d'essai doit peupler les cinq écrans

`fixturesParDefaut()` fournit des matchs, des équipes et des joueurs.
Sans joueurs, le classement rend son état vide et la sonde de contraste
ne voit rien — elle passe pour de mauvaises raisons.

### 8. Un échec se lit, il ne se contourne pas

Chaque ligne `✗` nomme l'élément et le ratio obtenu. Corriger la cause,
pas le seuil.

## Étapes de travail

1. Modifier le code.
2. `node .claude/skills/kolektif-testing-qa/scripts/tout.mjs`
3. Lire chaque `✗` : élément, ratio, écran.
4. Corriger la **cause**.
5. `captures.mjs` et regarder les six images.
6. Rejouer `tout.mjs` jusqu'au vert.

## Erreurs à éviter

- Reconstruire le HTML à la main dans un test.
- Committer `_harnais.html`.
- Baisser un seuil pour faire passer un test.
- Croire un bug rapporté par le harnais sans vérifier le bouchon.
- Tester un seul écran après une modification qui touche `.screen`.
- Ajouter une fonction à `index.html` sans l'ajouter à `ATTENDUES` dans
  `portee.mjs` si c'est une fonction d'écran.

## Critères de validation

- [ ] `tout.mjs` sort en 0.
- [ ] Les cinq écrans rendent plus de 40 caractères.
- [ ] Aucune erreur page.
- [ ] Aucune surface orpheline.
- [ ] Les six captures ont été regardées.
- [ ] `_harnais.html` n'existe plus.

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs        # suite complète

node .claude/skills/kolektif-testing-qa/scripts/portee.mjs      # portée + rendu des 5 écrans
node .claude/skills/kolektif-testing-qa/scripts/plaques.mjs     # surfaces translucides
node .claude/skills/kolektif-testing-qa/scripts/contraste.mjs   # WCAG AA mesuré
node .claude/skills/kolektif-testing-qa/scripts/precache.mjs    # intégrité + poids du cache
node .claude/skills/kolektif-testing-qa/scripts/functions.mjs   # XP serveur, Firebase bouchonné
node .claude/skills/kolektif-testing-qa/scripts/captures.mjs    # captures dans ./captures

# Serveur local pour un essai à la main
python3 -m http.server 8000    # puis http://localhost:8000
```

### Variables d'environnement

| Variable | Défaut | Usage |
|---|---|---|
| `KOLEKTIF_RACINE` | `process.cwd()` | racine du dépôt |
| `KOLEKTIF_CHROME` | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | binaire Chromium |

Sur une autre machine, pointer `KOLEKTIF_CHROME` vers un Chromium
installé, ou installer Playwright (`npx playwright install chromium`) et
remplacer le chemin par celui qu'il renvoie.
