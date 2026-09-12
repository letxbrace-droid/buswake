# Système de design

Ce que Kolektif doit avoir l'air d'être, et les règles qui le
garantissent.

> Architecture technique : [ARCHITECTURE.md](./ARCHITECTURE.md).
> Vue d'ensemble : [README.md](./README.md).

---

## Le principe

**Noir mat, un seul vert, des formes nettes.**

L'app est vectorielle : formes, traits, typographie. La photographie a
trois emplois, et **trois seulement** : la carte de joueur, les bannières
de partage, et le terrain du sport derrière le héros d'un match. Partout
ailleurs, une image dilue le propos et alourdit la PWA.

La règle qui tient ces trois ensemble : **une photo n'est jamais de la
décoration, elle dit où on joue.** Et elle passe toujours sous un voile
calculé, jamais choisi à l'œil — voir plus bas.

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

### Le Kolektif Pulse

**Le groupe qui se constitue, joueur par joueur.** Une place prise = un
point plein ; deux places prises côte à côte = un segment qui s'allume
entre elles. `kolektifPulse(n, total)`.

C'est la même idée que la marque — un groupe incomplet, et ce qui vient
le refermer — mais **dépliée**. Le RING montre *l'état*, le PULSE montre
*la constitution*.

Il a remplacé la barre de remplissage partout où elle existait, pour une
raison de récit : une barre à 70 % dit « 70 % » ; sept points posés
disent « sept personnes sont là, il en manque trois ». C'est la même
donnée et ce n'est pas la même phrase.

**Règle de fabrication : la taille des points est fixe, c'est la longueur
du ruban qui varie.** Un padel à 4 donne une chaîne courte (64 px), un
foot à 7 une longue (224 px). L'inverse — ruban fixe, points variables —
donnait des pastilles énormes à 4 joueurs et des miettes à 14.

### Le mouvement comme signature

C'est la seule part de l'identité qu'un concurrent ne peut pas copier
depuis une capture d'écran — et le produit a un geste évident à mettre
en scène : **un groupe qui se complète**.

- **Les points se posent un par un**, de gauche à droite, au ressort
  (`kPulseIn`, 38 ms d'écart). C'est LE geste de la marque : on ne voit
  pas une barre grandir, on voit une équipe se réunir. Le délai est porté
  par `--i` dans le markup — une règle CSS au lieu de quarante.
- **Le compteur arrive juste après** (`kPop`, 180 ms de retard) : le
  chiffre confirme ce que la chaîne vient de raconter.
- **Les cartes entrent en cascade** (`kRise`, 55 ms d'écart) : la liste
  aussi se remplit.

**La règle qui rend tout ça supportable : ces animations ne jouent qu'à
la PREMIÈRE apparition.** La liste se re-rend à chaque écriture
Firestore ; sans garde, une jauge repartirait de zéro parce qu'un *autre*
match a bougé — du bruit, pas du mouvement. Le conteneur reçoit la classe
`.anim-in` le temps d'une peinture (`jouerEntree()`), puis la perd. Les
changements suivants glissent via la transition `width .5s` : de
l'ancienne valeur à la nouvelle, ce qui est le bon geste pour un
incrément.

Le tout est neutralisé sous `prefers-reduced-motion`.

### Le Kolektif Ring

Le logo devient l'indicateur de progression : **même arc, même ouverture à
116°, même inclinaison à −40°**, et le point qui vient refermer le cercle
quand c'est complet. `kolektifRing(n, total, taille, opts)`.

La forme est unique, le sens change selon l'endroit — un match qui se
remplit, un rang qui approche. C'est ce qui fait une grammaire visuelle
plutôt qu'un logo isolé.

**Où l'utiliser, et où ne pas l'utiliser.** Le ring va aux endroits qu'on
*regarde* : héros de l'accueil, progression. Le pulse va partout où le
groupe est en train de se faire : cartes de match, héros de détail. Ring
pour l'état, pulse pour la constitution — les deux cohabitent sur un même
écran sans se répéter.

Détail de fabrication : à deux chiffres le nombre rétrécit
automatiquement, sinon le « 10 » vient toucher le point.

### Les moments

Trois instants, et trois seulement, arrêtent l'application : **passer un
rang**, **être élu homme du match**, **entrer dans un groupe**
(`momentKolektif`). Le reste — voter, créer — reste un toast.

C'est la règle qui fait tenir l'idée : *une célébration fréquente n'est
plus une célébration, c'est une interruption.* Voter arrive plusieurs fois
par semaine ; changer de rang, quelques fois par saison.

Chaque moment est **toujours interrompable** (un toucher), s'auto-ferme
(2 à 3,2 s), vibre une fois, et met en scène un composant de la marque
plutôt qu'une illustration : le RING pour un rang franchi, le PULSE pour
un groupe rejoint.

**Le chiffre monte, il ne s'affiche pas** (`compteurMonte`). Mesuré :
+100 XP passe par 12 → 47 → 92 → 100 en 650 ms. Neutralisé sous
`prefers-reduced-motion`, où la valeur finale est posée directement.

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

**Zéro emoji dans l'interface.** Les icônes sont des SVG (objet `ICON`,
et `SPORT_IC` pour les sports). Les emojis sont tolérés dans les contenus
utilisateur et les notifications, jamais dans le châssis.

**Les sports sont des tracés, pas des images.** Le sélecteur de sport
aurait pu prendre des vignettes générées ; il prend des SVG, pour quatre
raisons mesurables : l'icône hérite de la couleur du contexte (gris au
repos, vert à la sélection, sans second fichier), elle reste nette à
toute densité d'écran, elle pèse quelques centaines d'octets au lieu de
quelques centaines de kilo-octets, et ajouter un sport reste **une
ligne** — pas un aller-retour par le générateur, le détourage et un bump
de cache.

Chaque tracé a été validé à trois tailles (72 / 26 / 20 px) contre une
seule question : *est-ce que je le reconnais sans le libellé ?* Ce test a
éliminé quatre dessins qui « marchaient » en grand — un ballon de basket
à couture équatoriale (lu comme un **globe**), une raquette de padel à
trois trous alignés (lue comme une **bulle de saisie**), un panier de
basket (lu comme une **corbeille**), une raquette en goutte (lue comme un
**repère de carte**). Les retenus : ballon à pentagone, ballon à coutures
verticales, raquette carrée perforée, raquette ovale cordée.

**Aucun chiffre qui n'existe pas.** Un compteur affiché est une promesse :
l'utilisateur croit qu'on sait. Quand une métrique demandée n'est pas
dérivable des données réelles, on ne l'invente pas et on ne met pas de
zéro — on la remplace par une mesure vraie qui répond à la même question.
L'accueil devait afficher « joueurs qui cherchent une activité » et
« communautés actives » : le premier n'est déclaré nulle part, le second
n'existe pas dans le modèle. Remplacés par *places à prendre* et
*joueurs actifs*, tous deux calculés sur les matchs déjà chargés.

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

### Terrains — le voile est mesuré, pas choisi

| Fichier | Rôle |
|---|---|
| `sport-foot5.jpg` · `sport-foot7.jpg` · `sport-basket3.jpg` · `sport-padel.jpg` · `sport-tennis.jpg` | Le terrain du sport, derrière le héros d'un match. 880 × 500, 16 à 67 ko. |
| `texture-turf.jpg` | Grain de gazon synthétique, servi à **5 %** derrière toute l'app. |

**Composition : texte à gauche sur noir plein, photo à droite** — la même
que les bannières de partage, pour que les deux se reconnaissent.

Ce n'est pas un choix esthétique. Le texte du héros est aligné à gauche,
et le plus fragile de ses éléments est l'eyebrow : vert `#00D88A`, 10,5 px,
donc du **petit texte**, qui exige 4,5:1. Un dégradé *vertical* doit
assombrir toute la carte pour le protéger — et à la force nécessaire, la
photo disparaît. Mesuré au pire cas des cinq sports :

| Voile | Eyebrow (≥ 4,5) | Titre (≥ 3,0) | Méta (≥ 4,5) |
|---|---|---|---|
| Vertical `.58 → .95` | **3,33** ❌ | 10,27 | **4,34** ❌ |
| **Horizontal (retenu)** | **5,81** ✅ | 8,52 ✅ | 5,15 ✅ |

Le voile vertical initial était donc *à la fois* trop sombre pour qu'on
voie la photo **et** insuffisant pour le contraste. Le voile horizontal
règle les deux : il protège la colonne de texte et laisse le terrain
respirer là où il n'y a rien à lire.

**Ce que doit dire le prompt.** La première série de photos avait un
défaut invisible à la lecture du prompt : rien n'y disait *où* devait
tomber la lumière. Le foot à 5 est revenu avec son unique source au
centre exact — là où passe le texte — et un tiers droit à 17/255, que
nul recadrage ne rattrapait. Une source est d'ailleurs toujours plus
étroite que le cadre 880 × 500, donc **on ne peut jamais déplacer le
sujet horizontalement** : la largeur est contrainte, seule la verticale
reste libre. La composition doit donc être demandée à la génération.

La phrase qui manquait, et qui appartient désormais à tout prompt de
terrain :

> *…the single floodlight and its light pool positioned in the **right
> third** of the frame, the left third almost entirely dark and empty…*

Après régénération, le tiers droit du foot à 5 passe de 17/255 à
**111/255**, et son eyebrow de l'échec à 7,90:1. Contrastes finaux :

| Sport | Eyebrow | Titre | Méta |
|---|---|---|---|
| Foot à 5 | 7,90 | 9,58 | 6,38 |
| Foot à 7 | 5,81 | 8,52 | 7,38 |
| Basket 3×3 | 7,53 | 12,66 | 5,15 |
| Padel | 9,25 | 13,64 | 6,65 |
| Tennis | 10,14 | 9,63 | 5,27 |

**Le fond de l'app**, lui, est à 5 % d'opacité : on ne le voit pas, on le
sent. C'est un plafond, pas un réglage — au-delà, la photo commence à
concurrencer le noir mat qui fait l'identité.

### Partage — une bannière par sport

| Fichier | Rôle |
|---|---|
| `og-image.jpg` | Bannière par défaut, 1200 × 630. |
| `og-foot5.jpg` … `og-tennis.jpg` | Une bannière par sport, même gabarit. |

Un lien de match partagé sur WhatsApp passe par `m/<sport>.html`, une page
qui ne sert qu'à porter les bonnes balises Open Graph avant de rediriger.
**Raison technique :** un fragment `#j=<id>` n'est jamais envoyé au
serveur, donc un robot d'aperçu voit toujours la même page — sans ce
détour, l'aperçu d'un match de padel montrerait un terrain de foot.

Ces bannières ne sont **pas** préchargées par le service worker : elles ne
sont lues que par les robots d'aperçu, jamais par l'app.

### Hors app — acquisition

`marketing/tiktok-salle-9x16.jpg` — fond vertical 1080 × 1920, deux tiers
supérieurs volontairement vides pour le texte au montage. Jamais chargé
par l'app.

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

- **Une photo *lisible* en fond d'écran dans l'app.** Le grain de gazon
  existe, mais à 5 % et pour 37 ko — c'est une texture, pas une image.
  Le jour où quelqu'un voudra la monter à 15 %, la réponse est non : à ce
  niveau elle cesse d'être un grain et devient un décor, et le noir mat
  n'est plus l'identité mais un fond parmi d'autres.
- **Une illustration en en-tête du classement.** Il y a déjà un podium 3D
  avec les avatars du top 3 — l'illustration ferait doublon. Elle habite
  l'état vide.
- **Une illustration autour du mot du créateur.** Un message personnel
  mérite le traitement le plus sobre possible : une citation, un nom.
