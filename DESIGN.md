# Système de design

Ce que Kolektif doit avoir l'air d'être, et les règles qui le
garantissent.

> Architecture technique : [ARCHITECTURE.md](./ARCHITECTURE.md).
> Vue d'ensemble : [README.md](./README.md).

---

## Le principe

**Noir mat, un seul vert, des formes nettes.**

L'app est vectorielle : formes, traits, typographie. Les photographies
sont réservées à deux endroits (la carte de joueur et la bannière de
partage) — partout ailleurs, une image dilue le propos et alourdit la
PWA.

Un seul accent coloré : `#00D88A`. Les autres couleurs ne servent qu'à
dire quelque chose de précis (rouge = urgence, or/argent/bronze = rang de
carte).

---

## Tokens

Tout est défini dans `:root`, en tête de `index.html`. **Ajouter un
composant, c'est choisir un cran — jamais inventer une valeur.**

### Rayons — grille de 4 px, six crans

```css
--r-xs:  8px;   /* puces, petites pastilles */
--r-sm: 12px;   /* boutons, champs de saisie */
--r-md: 16px;   /* cartes internes, zones de gestion */
--r-lg: 20px;   /* cartes principales, héros */
--r-xl: 24px;   /* carte de joueur, fenêtres modales */
--r-pill: 99px; /* pilules, jauges */
```

**Règle d'imbrication :** rayon interne = rayon externe − padding. Une
carte en `--r-lg` (20) avec 8 px de marge intérieure contient des
éléments en `--r-sm` (12). Jamais le même rayon dedans et dehors — c'est
ce qui donne l'impression d'un objet moulé d'une pièce.

### Physique — deux courbes, trois durées

```css
--ease:        cubic-bezier(.22,1,.36,1);    /* par défaut, partout */
--ease-spring: cubic-bezier(.34,1.45,.64,1); /* célébrations uniquement */
--t-fast: 120ms;   /* réponse au doigt : appui, bascule */
--t-base: 200ms;   /* survol, couleurs, ombres */
--t-slow: 450ms;   /* entrées d'écran, remplissage des jauges */
```

La règle émotionnelle : **le doigt en `fast`, l'interface en `base`, la
récompense en `slow` + `spring`.**

### Couleurs

| Token | Usage |
|---|---|
| `--green` `#00D88A` | L'accent unique — actions, succès, marque |
| `--orange` | Attention, information secondaire |
| `--red` | Urgence, destruction, erreur |
| `--bg`, `--card`, `--border` | Fonds et séparations |
| `--text`, `--text-sec`, `--text-muted` | Hiérarchie typographique |
| `--gold` `--silver` `--bronze` | Rangs des cartes de joueur |

### Typographie

- **Anton** — les grands nombres et titres de héros (score, date, XP).
- **Space Grotesk** — tout le reste.

---

## Règles de composants

**Cible tactile : 44 px minimum.** C'est le minimum d'Apple. Un bouton
plus petit ment sur sa taille : l'utilisateur croit avoir mal visé alors
que c'est le design qui a menti.

**Jamais `transition: all`.** Toujours nommer les propriétés animées —
sinon une propriété de layout finit par être animée par accident, et
l'animation saccade.

```css
transition: transform var(--t-fast) var(--ease),
            background var(--t-base) var(--ease);
```

**Chaque appui rend quelque chose.** `:active { transform: scale(.97); }`
— l'interface répond au doigt, toujours.

**Zéro emoji dans l'interface.** Les icônes sont des SVG (objet `ICON`).
Les emojis sont tolérés dans les contenus utilisateur et les
notifications, jamais dans le châssis.

**Tout contenu utilisateur passe par `escapeHtml()`.** Règle de sécurité
autant que de design : un pseudo mal échappé casse la mise en page autant
qu'il ouvre une faille.

---

## Assets

Dix fichiers, trois familles, un rôle unique chacun. Aucun ne se
substitue à un autre.

### Marque

| Fichier | Rôle |
|---|---|
| `logo.png` · `icon-512.png` | **Le** logo : un arc ouvert, fuselé, et le point qui vient le refermer — le groupe incomplet, et le renfort qui arrive. Aucun sport n'y est nommé. Icône d'app, splash, barre du haut, écran de connexion, notifications, bannière d'installation.<br>`logo.png` a un fond **transparent** (il est posé inline sur le noir de l'app, avec un halo CSS) ; `icon-512.png` a un fond noir plein et la marque à 62 % — la safe zone des icônes adaptatives Android. |
| `og-image.jpg` | Bannière de partage 1200×630 — photo d'un terrain nocturne, titre à gauche. C'est l'aperçu du lien dans WhatsApp. |
| `art-player.png` | Silhouette de joueur — remplace la photo sur les cartes qui n'en ont pas. |

### Visuels d'action

| Fichier | Rôle |
|---|---|
| `art-bolt.png` | Onboarding : la marque **multipliée** — trois arcs à trois échelles et trois opacités, soit plusieurs groupes qui se complètent. Ce n'est pas un second logo, c'est le même signe décliné. Calculé, pas généré. |
| `art-goal.png` | Burst « but dans le filet » — filigrane derrière le score des matchs terminés. |

### États vides

| Fichier | Écran |
|---|---|
| `art-empty-histo.png` | Historique vide (ballon + sifflet au repos) |
| `art-empty-amis.png` | Aucun ami (high-five) |
| `art-empty-vestiaire.png` | Vestiaire vide (banc + chasubles) |
| `art-podium.png` | Classement vide (podium 1-2-3) |

Style commun : line-art, trait vert `#00D88A` uniforme, fond réellement
transparent, 400 px.

### Hors app

`stickers/` — quatre stickers WhatsApp (`bolt`, `je-joue`,
`il-manque-1`, `motm`). À importer dans une app de type *Sticker Maker*.
Servis par GitHub Pages, jamais chargés par l'app.

---

## Ajouter un asset

**Le générateur d'images livre presque toujours un faux transparent** :
le damier est incrusté dans l'image (alpha à 255 partout), ou un cadre
blanc entoure le visuel. Il faut le détourer.

La technique utilisée pour tous les assets existants — chromakey sur la
« vertitude » du pixel :

```js
const green = g - (r + b) / 2;            // à quel point le pixel est vert
const alpha = green < 25 ? 0              // seuil plancher : tue le damier
            : Math.min(255, (green - 25) * 3.4);
// puis on force la couleur exacte de la marque
r = 0; g = 216; b = 138;                  // #00D88A
```

**Le symbole de marque, lui, n'est pas généré** : il est calculé
(arc + point, épaisseur variable). Sa contrainte de survie est mesurable —
l'écart entre le bord du point et le bec de l'arc doit rester ≥ 1 px à
20 px de rendu, sinon les deux formes fusionnent et l'idée du mark meurt.
Paramètres retenus : ouverture 116°, trait fuselé de 0,150 à 0,0675,
point à 1,45×.

Prompt type pour les illustrations, pour rester dans la famille :

> *Flat vector line-art illustration: [sujet], single green (#00D88A)
> thick uniform strokes on transparent background, minimal geometric
> shapes, no text, no gradients, no watermark, PNG 1024×1024.*

**Puis — impérativement — incrémenter le cache** dans `sw.js` et ajouter
le fichier au `PRECACHE` :

```js
const CACHE = 'cs5-v70';   // ← +1, sinon les téléphones gardent l'ancien
```

---

## Ce qui a été délibérément écarté

Ces décisions ont une raison ; les rouvrir demande une meilleure raison.

- **Une photo en fond d'écran dans l'app.** L'identité est vectorielle.
  Une photo diluerait le propos et coûterait des centaines de kilo-octets
  pour de la décoration.
- **Une illustration en en-tête du classement.** Il y a déjà un podium 3D
  avec les avatars du top 3 — l'illustration ferait doublon. Elle habite
  l'état vide.
- **Une illustration autour du mot du créateur.** Un message personnel
  mérite le traitement le plus sobre possible : une citation, un nom.
