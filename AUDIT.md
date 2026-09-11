# Audit du code existant — face au brief Kolektif V1

Livrable §33.1. Chaque élément est classé selon la grille du §24 :
**KEEP** · **REFACTOR** · **REBUILD** · **REMOVE** · **NEW**.

L'audit porte sur le code réellement en production, pas sur des
intentions. Les comptages viennent de `index.html` (~6 200 lignes),
`functions/index.js`, `firestore.rules`.

---

## Le résultat en une phrase

**Le P0 du brief est déjà construit à environ 90 %.** Ce qui manque n'est
pas une liste de fonctionnalités : c'est **une hypothèse dans le modèle
de données** qui empêchera le multi-sport, et **l'absence totale de
mesure**, qui rend la règle du §34 inapplicable.

---

## §26 P0 — Indispensable

| Exigence du brief | État | Verdict |
|---|---|---|
| Authentification | E-mail + Google, Firebase Auth | **KEEP** |
| Profil | Complet (atouts, poste, club, stats) | **KEEP** |
| Localisation | Code postal → coordonnées, haversine | **REFACTOR** |
| Découverte des matchs | Rayon 5/10/25/50/partout | **REFACTOR** |
| Création de match | Terrain + créneaux, < 1 min | **REFACTOR** |
| Rejoindre un match | Inscription + liste d'attente | **KEEP** |
| Gestion des participants | Retrait, promotion du remplaçant | **KEEP** |
| Notifications | FCM + 2 Cloud Functions, 7 déclencheurs | **KEEP** |
| Player Card | Carte plein cadre, export PNG | **KEEP** |
| Progression | XP, 6 rangs, badges, MOTM, malus lapin | **KEEP** |
| **Système multi-sport de base** | Champs `sport` + `joueursMax`, catalogue de 5 sports | **FAIT** |

### Les trois REFACTOR, et pourquoi

**Localisation.** La position vient d'un code postal géocodé **une seule
fois, à l'inscription**. Si Nominatim est indisponible ce jour-là,
l'utilisateur n'a jamais de coordonnées — et le filtre par rayon cesse
silencieusement de fonctionner pour lui. Il faut pouvoir la renseigner et
la corriger depuis le profil.

**Découverte.** Le rayon existe, mais c'est le seul filtre. Le brief (§10)
en demande sept : sport, distance, date, heure, niveau, places, format.
Aucun n'est bloquant techniquement — ils manquent simplement.

**Création.** Le formulaire est rapide, mais il ne demande ni le sport, ni
le format, ni le nombre de joueurs, ni le niveau (§12). Ces champs
n'existent pas dans le modèle.

---

## ✅ §18 MULTI-SPORT — corrigé

*Cette section décrivait le blocage. Il est levé : le catalogue `SPORTS`
existe, chaque match porte `sport` et `joueursMax`, et les 24 lectures de
`MIN_CONFIRM` passent désormais par `maxJoueurs(m)`. Les matchs créés
avant retombent sur foot à 5 / 10 joueurs. Le texte d'origine est
conservé ci-dessous pour mémoire du raisonnement.*

## Le blocage réel : §18 MULTI-SPORT (historique)

> *« Ne jamais coder le produit autour de constantes propres au
> football. »*

Cette règle est **violée**, et c'est le seul point d'architecture qui
mérite qu'on s'arrête.

```js
const MIN_CONFIRM = 10;   // 22 usages dans index.html
```

Dix, c'est le foot à 5. Le padel en veut 4, le basket 3×3 en veut 6, le
tennis 2. Cette constante est répandue dans tout le rendu, toute la
logique de confirmation, et jusque dans les Cloud Functions.

S'y ajoute : **un match ne sait pas quel sport il est** (aucun champ
`sport`), et les 17 terrains codés en dur sont typés `indoor` / `urban`
— deux catégories de foot en salle.

**Le coût de la dette double à chaque écran ajouté.** Chaque nouvelle vue
qui lit `MIN_CONFIRM` est une ligne de plus à reprendre le jour où le
padel arrive.

### Correction proposée (petite, à faire tôt)

Deux champs sur le document match, et une lecture au lieu d'une constante :

```js
sport: 'foot5',        // identifiant, pas un libellé
joueursMax: 10,        // remplace MIN_CONFIRM à la lecture
```

Un catalogue de sports (`SPORTS = { foot5: {nom, joueursMax, format}, … }`)
fournit les valeurs par défaut à la création. Les matchs existants sans
ces champs retombent sur `foot5` / 10 — aucune rupture.

**Ce n'est pas une refonte, c'est une substitution.** Une demi-journée
aujourd'hui, plusieurs jours dans six mois.

---

## §29 NORTH STAR — impossible à mesurer aujourd'hui

> *« ACTIVITÉS SPORTIVES RÉUSSIES : créée → complétée → réellement
> jouée. »*

**Aucune télémétrie n'existe** (`analytics` : 0 occurrence). Aucune des
métriques demandées — taux de remplissage, délai moyen pour compléter,
taux de participation, rétention — ne peut être calculée.

C'est plus grave qu'un manque de confort, parce que le §34 érige la
mesure en règle de décision : *« Est-ce que cela augmente le nombre de
matchs joués ? Si non, on ne priorise pas. »* Sans chiffres, cette règle
ne peut pas être appliquée — les arbitrages se feront à l'intuition.

**NEW, et tôt.** Firestore contient déjà presque tout : dates de création,
de confirmation, listes d'inscrits, statuts. Le délai de remplissage et
le taux de complétion se dérivent des documents existants, sans ajouter
le moindre traceur. Il manque une seule chose : **un marqueur « match
réellement joué »**, que le passage au statut `terminé` peut porter.

---

## §16 RÉPUTATION — la matière existe, la lecture manque

Le brief veut répondre à : *« Est-ce que je peux faire confiance à cette
personne pour venir jouer ? »*

Les signaux sont **déjà collectés** :

| Signal | Champ | Usage actuel |
|---|---|---|
| Absences après inscription | `lapins` | Compté, jamais affiché |
| Série de présences | `streak` | Compté, jamais affiché |
| Élections MOTM | `stats.hommeDuMatch` | Affiché sur le profil |
| Notes entre joueurs | `atouts` | Font évoluer la carte |

**REFACTOR, pas NEW.** Il ne s'agit pas de construire un système de
réputation, mais d'**afficher celui qui tourne déjà** — un indicateur de
fiabilité lisible à côté du pseudo, dans la liste des inscrits.

C'est probablement le meilleur rapport valeur/effort de tout le brief :
la donnée est là, elle ne sert à rien, et elle répond exactement à la
question posée.

---

## §17 COMMUNAUTÉS — absent

Aucune brique. **NEW**, intégralement : modèle, règles, écrans,
appartenance, découverte.

C'est aussi le chantier le plus lourd du brief — et celui dont l'utilité
dépend entièrement d'une chose que le produit n'a pas encore : **des
joueurs**. Une communauté vide est pire qu'une absence de communautés.

---

## §25 Composants réutilisables — déjà largement en place

Le brief demande des composants nommés. Plusieurs existent déjà comme
fonctions, avec exactement ces rôles :

| Brief | Code existant |
|---|---|
| `ProgressRing` | `kolektifRing()` |
| `MatchCard` | `matchCardHTML()`, `mcLieuHtml()` |
| `PlayerCard` | `.fut-card-v3` |
| `Avatar` | `renderStackAvatars()` |
| `BottomNavigation` | `#bottom-nav` |
| `PrimaryButton` | `.btn-primary` |
| `Badge` | `BADGE_SVG` |

**KEEP.** Manquent : `SportSelector`, `LocationPicker`, `Rating`,
`XPBar` (la `fillbar` en tient lieu).

---

## §8 NAVIGATION — désaccord argumenté

Le brief propose cinq entrées : Accueil · Découvrir · **+** · Progression
· Profil. L'app en a quatre : Accueil · Matchs · Profil · Classement.

Je recommande de **ne pas passer à cinq maintenant**, pour une raison
tenant au brief lui-même : « Découvrir » (§10) promet matchs **+ joueurs
+ communautés**. Deux de ces trois n'existent pas. Un onglet qui affiche
un tiers de sa promesse dévalue la navigation entière.

En revanche, **le bouton central « + »** est une bonne idée et peut se
faire tout de suite : créer un match est l'action structurante, et elle
est aujourd'hui enterrée dans un écran.

**Proposition :** garder quatre onglets, ajouter le « + » central.
Passer à cinq quand « Découvrir » aura ses trois modes.

---

## §27 Ce qu'il ne faut pas faire — déjà respecté

| Piège | Statut |
|---|---|
| WhatsApp sportif | Évité — l'app organise, le chat est éphémère |
| Instagram sportif | Évité — pas de feed de publications |
| Simple agenda | Évité — la progression donne une raison de revenir |
| Uniquement football | **Non résolu** — voir §18 |
| Usine à statistiques | Évité — le profil reste lisible |
| Badges inutiles | Évité — six badges, tous mérités |

---

## REMOVE — rien

Aucun élément à supprimer. Le code a déjà été audité et nettoyé (doublons
de rendu, écoutes qui fuyaient, emojis d'interface, deux verts
concurrents). Il ne reste pas de fonctionnalité morte.

---

## Recommandation de séquence

Le brief liste seize livrables graphiques et quinze techniques. Exécutés
dans l'ordre, ils représentent des mois — pendant lesquels **aucun match
supplémentaire ne se joue**.

Or le §28 désigne la **liquidité locale** comme moat n°1, et le §29
désigne les **activités réussies** comme métrique unique. Les deux disent
la même chose : *ce qui compte, c'est que des gens jouent.*

D'où trois marches, dans cet ordre :

**1. Ce qui coûte peu maintenant et cher plus tard** — le champ `sport` +
`joueursMax` (§18), et la mesure (§29). Une journée. Sans ça, chaque
écran ajouté alourdit la dette, et chaque décision se prend à l'aveugle.

**2. Ce qui fait jouer davantage, tout de suite** — la réputation
affichée (§16, la donnée existe déjà) et le bouton « + » central (§8).
Deux jours. Les deux augmentent directement le nombre de matchs remplis.

**3. Ce qui attend d'avoir des joueurs** — communautés (§17), joueurs à
proximité, recommandations, classements locaux. Tout le P1. Ces
fonctionnalités n'ont de sens qu'au-dessus d'un seuil de densité que le
produit n'a pas encore atteint.

La question du §34 appliquée au brief lui-même : *« Est-ce que cela
augmente le nombre de matchs joués ? »* Pour les communautés, aujourd'hui,
la réponse honnête est **pas encore**.
