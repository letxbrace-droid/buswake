---
name: kolektif-ui-design-system
description: Système de design de KOLEKTIF — tokens, plaques 3D sur photo de terrain, contraste mesuré, typographie, icônes vectorielles, mouvement. À utiliser avant toute modification visuelle : couleur, ombre, carte, fond d'écran, icône, animation, ou ajout d'un composant d'interface.
---

# Système de design — KOLEKTIF

## Objectif

Tenir une interface sombre posée sur des **photos de terrain**, où chaque
choix visuel est **mesuré** et non jugé à l'œil.

## Quand l'utiliser

- Toucher à une couleur, une ombre, un rayon, une bordure.
- Ajouter une carte, un encart, un bandeau, une pastille.
- Changer ou ajouter une **photo de fond** d'écran.
- Ajouter une icône, une animation, un état vide.
- Répondre à « est-ce que ça se voit assez ? ».

## Ce qu'il faut lire d'abord

`DESIGN.md` — tokens, rayons, courbes, palette, typographie, assets,
et la liste de ce qui a été **délibérément écarté**.

## Règles métier

### 1. On mesure, on ne juge pas à l'œil

Contraste, taille d'icône, lisibilité d'un glyphe, luminance d'une photo :
tout se mesure. Les erreurs les plus coûteuses du projet sont des
jugements visuels démentis par la mesure — un logo déclaré « fusionné à
20 px » qui gardait trois composantes distinctes jusqu'à 16 px, un voile
« qui passe » qui tombait à 4,09 une fois la photo changée.

Seuils WCAG AA : **3:1** pour du grand texte (≥ 24 px, ou ≥ 18,66 px en
gras), **4,5:1** sinon. Mesurer contre le **pixel le plus clair**
réellement rendu derrière le texte, jamais contre une valeur supposée.

### 2. `--orange` EST le vert

Nom hérité, conservé pour ne pas réécrire 200 occurrences.
`--orange: #5DD62C`. Le vrai orange s'appelle `--feu`. Ne pas « corriger »
ce nom : un renommage global a déjà corrompu des données en base.

Palette : `#0F0F0F` fond · `#5DD62C` vert · `#337418` vert profond ·
`#F8F8F8` encre · `--feu #FF8A3D` pour la série et l'urgence.

### 3. Le relief vient de la lumière, pas de l'ombre

Mesuré sur l'écran réel : la face d'une plaque est à **0,007** de
luminance, le vide sous elle à **0,001**. Toute ombre portée noire y est
invisible — noir sur noir. Une plaque tient par :

1. une **arête haute éclairée** (0,065 contre 0,006 autour) et une arête
   basse noire — jamais une bordure uniforme, qui éclaire le bas autant
   que le haut et remet la carte à plat ;
2. un **dégradé de face** qui s'assombrit vers le bas ;
3. une tranche dure de 3 px, utile quand le fond est clair ;
4. deux ombres, une de contact et une ambiante.

**Aucune rotation** : incliner une carte abîme le rendu du texte sur
mobile, et le relief se lit sans ça.

### 4. Une plaque posée sur une plaque ne flotte pas

Les encarts à l'intérieur d'une carte redeviennent plats
(`.screen .card .stat-box`, etc.). Sans cette règle, les six cases
d'atouts du profil décollent chacune de leur côté.

### 5. Toute surface translucide au-dessus d'une photo doit être déclarée

Depuis qu'il y a une photo par écran, une carte translucide **non
inscrite dans la liste des plaques** laisse remonter la pelouse et perd
du contraste sans que personne n'ait touché à sa couleur. La sonde
`plaques` de `npm run qa` détecte les orphelines.

Un écran **délibérément** sans plaque le déclare dans les `ROUTES` de
`qa.mjs` (`sansPlaque: true`), en une ligne qu'on relit. C'est une
exception nommée, pas une dérogation silencieuse.

### 6. Un voile est réglé pour UNE image, pas une fois pour toutes

Changer la photo de fond ⇒ re-mesurer le contraste. Le voile actuel :
`.46 / .56 / .64 / .72` du haut vers le bas.

### 7. Une photo de fond ne doit contenir ni texte ni barre noire

Les bannières `og-*.jpg` portent l'URL du site gravée : recadrer assez à
droite **et** couper le bandeau du bas. Si la source est plus large que
haute, prolonger le sol en perspective — jamais remplir en noir. Un fond
« portrait » fabriqué par remplissage noir a déjà rendu le terrain
invisible derrière les cartes.

Un fond par écran : `art-hero-jouer.jpg` (accueil), `fond-matchs.jpg`,
`fond-equipes.jpg`, `fond-classement.jpg`, `fond-profil.jpg`.

### 8. Les icônes sont des tracés, jamais des images

`SPORT_IC`, `ICON`, `BADGE_SVG`, `EMBLEMES` : du SVG inline qui hérite de
`currentColor`, net à toute taille, quelques centaines d'octets, aucun
bump de cache. Zéro emoji dans le châssis.

Une icône se valide **rendue à 72, 26 et 20 px**, pas dans l'éditeur. Des
formes qui mentent à petite taille ont déjà été éliminées : un ballon de
basket lu comme un globe, trois points alignés lus comme une bulle de
saisie. Piège connu : `stroke-width: 2.3` transforme un cercle `r=.95` en
pâté de 4,2 px — mettre `fill="currentColor" stroke="none"`.

### 9. Pièges CSS déjà payés

- `display:inline` sur un `<span>` **ignore** les `%` de largeur et de
  hauteur — les jauges de vote sont restées à 0×0 pendant des semaines.
- `!important` dans un `@keyframes` est **ignoré**.
- `.btn-primary` porte `width:100%`.
- `body` est en `display:flex` : les enfants s'étirent, une mesure de
  police par la boîte est fausse — mesurer les glyphes au `measureText`.
- `.screen` est en `position:absolute` : ne pas le redéclarer en
  `relative` plus bas dans la feuille.

## Étapes de travail

1. **Lire `DESIGN.md`** — la décision a peut-être déjà été prise, et
   écartée pour une raison.
2. **Utiliser les tokens** de `app/src/styles/socle.css`, exposés à
   Tailwind par `@theme`. Une valeur en dur est une dette.
3. **Choisir la couche**, pas la spécificité. La cascade est déclarée :
   `@layer theme, base, composants, ecrans, utilities, etats;` — un
   **état** l'emporte sur un **composant** quel que soit l'ordre des
   fichiers et quelle que soit la spécificité. C'est ce qui a remplacé
   les dix-neuf `!important` de la v1 : on ne gagne plus une bagarre de
   cascade, on déclare qui gagne.
4. **Mesurer** — `npm run qa contraste`, puis `npm run qa` en entier.
5. **Documenter** dans `DESIGN.md` la mesure obtenue, pas l'intention.

## Erreurs à éviter

- Valider un contraste à l'œil.
- Mesurer sans effacer l'encre : le pixel le plus clair de la boîte est
  alors le texte lui-même, et on mesure le texte contre le texte.
- Compter une pastille décorative, une lueur ou une bordure comme fond.
- Mesurer un élément passé sous la barre du haut ou la nav du bas.
- **Gagner une bagarre de cascade avec `!important` ou de la
  spécificité** : mettre la règle dans la bonne couche.
- **Croire une mesure qui contredit la capture d'écran.** Trois angles
  morts l'ont déjà fait mentir : une couleur lue dans la chaîne CSS
  (Tailwind émet de l'oklab), un fond en dégradé (donc `backgroundColor`
  transparent), une image de fond pas encore posée. Une des trois
  « corrections » tirées de la sonde était un artefact et a été annulée.
- **Conclure « vert » sans demander ce que la sonde ne regarde pas.** Le
  contraste mesure du texte : un champ de formulaire **vide** n'en a pas,
  et une bordure devenue translucide le rendait invisible sans qu'aucune
  sonde ne bronche.
- Régler un voile sur une image puis en changer.

## Critères de validation

- [ ] `npm run qa` : toutes les routes passent en contraste et en plaques.
- [ ] Aucun champ de formulaire vide sous 0,85 d'opacité.
- [ ] Aucun `!important` introduit.
- [ ] Les nouvelles icônes sont lisibles à 20 px.
- [ ] Aucune valeur de rayon ou de durée en dur.
- [ ] Les fonds ne contiennent ni texte gravé ni bande noire.
- [ ] Le rendu tient à 320 px de large sans débordement horizontal.
- [ ] `DESIGN.md` porte la mesure obtenue.

## Commandes de test

```bash
cd ~/buswake
cd app
npm run qa contraste    # WCAG AA mesuré au pixel, sur toutes les routes
npm run qa plaques      # surfaces translucides orphelines
npm run qa champs       # champs de formulaire devenus invisibles
npm run qa              # tout

# Une valeur de couleur en dur a-t-elle été introduite ?
grep -rnE '#[0-9A-Fa-f]{6}' src/ --include='*.tsx' --include='*.css' \
  | grep -v 'socle.css' | grep -v 'COULEURS_EQUIPE'

# Une bagarre de cascade a-t-elle recommencé ? (doit être vide)
grep -rn '!important' src/
```
