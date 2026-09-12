# Architecture

Comment Kolektif est construit : les données, le cycle de vie d'un
match, les notifications, la sécurité.

> Pour démarrer, déployer ou comprendre le projet en surface, voir
> [README.md](./README.md). Pour le design, [DESIGN.md](./DESIGN.md).

---

## Vue d'ensemble

```
   Téléphone (PWA)                    Firebase                 
┌────────────────────┐         ┌──────────────────────┐
│  index.html        │◄───────►│  Firestore           │
│  · rendu + logique │ temps   │  · users             │
│  · écoutes live    │  réel   │  · matchs            │
│                    │         │    └ messages        │
├────────────────────┤         ├──────────────────────┤
│  sw.js             │         │  Cloud Functions     │
│  · cache hors-ligne│◄────────│  · onMatchEcrit      │
│  · affiche les     │  push   │  · rappels (30 min)  │
│    notifications   │  (FCM)  └──────────────────────┘
└────────────────────┘
```

Il n'y a **pas de serveur applicatif**. Le client parle directement à
Firestore ; les règles de sécurité font office de contrôle d'accès. Les
Cloud Functions n'existent que pour les notifications (un client ne peut
pas notifier un autre client).

---

## Modèle de données

Quatre collections racines, une sous-collection.

### `users/{uid}`

Créé à l'inscription, complété par l'onboarding.

| Champ | Type | Rôle |
|---|---|---|
| `email`, `pseudo` | string | Identité |
| `equipePreferee` | string | Club affiché sur la carte (`PSG`, `OM`…) |
| `posteFavori` | string | `gardien` \| `defenseur` \| `milieu` \| `attaquant` |
| `atouts` | objet | `{ vitesse, dribble, frappe, defense, physique }` — 0 à 99 |
| `codePostal`, `lat`, `lon` | — | Pour trier les terrains par distance |
| `xp` | number | Expérience cumulée → rang (voir plus bas) |
| `badges` | array | Identifiants des badges obtenus |
| `stats` | objet | `{ matchsJoues, victoires, hommeDuMatch }` |
| `streak`, `lapins` | number | Série de présences ; nombre d'absences après inscription |
| `fcmTokens` | array | Jetons de notification (un par appareil) |
| `friends` | array | UID des amis (+ `friendRequestsSent` / `friendRequestsReceived`) |
| `profilComplet` | bool | Onboarding terminé ou non |

**La note générale (« overall ») n'est pas stockée** — elle est calculée
à la volée depuis `atouts`, avec les poids d'un milieu de terrain :

```js
overall = vitesse×0,15 + dribble×0,20 + frappe×0,25
        + defense×0,15 + physique×0,15 + passe×0,10
// passe = moyenne(vitesse, dribble)
```

Le rang de la carte en découle : **≥ 80 or**, **≥ 70 argent**, sinon
**bronze**.

### Un seul sport offert, plusieurs sports supportés

`SPORTS_ACTIFS = ['foot5']` gouverne ce que l'app **propose**. Le
catalogue `SPORTS`, le champ `sport` et `maxJoueurs()` restent en place :
un match de padel créé avant la restriction s'affiche toujours
correctement, et rouvrir un sport tient en une entrée de ce tableau.

Supprimer le multi-sport aurait voulu dire le réécrire le jour où il
revient. Trois sélecteurs se masquent quand un seul sport est actif —
accueil, création de match, création d'équipe — et le héros cesse
d'annoncer un sport que tout le monde connaît déjà.

### `equipes/{equipeId}`

Une équipe est **une moitié de match** : cinq joueurs en affrontent cinq.
L'effectif ne se saisit donc pas, il se **déduit du sport**
(`joueursMax / 2`) — foot à 5 → 5, basket 3×3 → 3, padel → 2. C'est ce qui
permet au modèle de rester multi-sport.

| Champ | Type | Rôle |
|---|---|---|
| `nom` | string | 2 à 28 caractères |
| `sport` | string | Clé du catalogue `SPORTS` |
| `niveau` | string | `debutant` \| `intermediaire` \| `confirme` |
| `couleur` | string | Une des six couleurs du blason |
| `embleme` | string \| null | Un des quatorze tracés, ou `null` pour les initiales |
| `club` | string \| null | Club de cœur — donne ses **couleurs** au blason |
| `clubEcusson` | bool | Afficher l'écusson à la place de l'emblème (défaut : non) |
| `ville`, `lat`, `lon` | — | Pour le rayon, repris du profil du capitaine |
| `capitaineUid` | string | Seul habilité à renommer, gérer, dissoudre |
| `membres` | array | UID de l'effectif — **le capitaine est toujours dedans** |
| `stats` | objet | `{ matchs, victoires, nuls, defaites, butsPour, butsContre, serie }` |
| `appel` | string \| null | Appel à joueurs — `null` = aucun, `''` = appel sans message (≤ 120 car.) |

**L'appel renverse le sens de la découverte.** Sans lui, une équipe
incomplète *attend* dans l'onglet Équipes que quelqu'un vienne la voir.
Avec lui, elle remonte sur **l'accueil** de tous les joueurs de son rayon.
C'est le seul mécanisme de liquidité qui ne demande rien aux joueurs : il
n'exige pas qu'ils déclarent une disponibilité, seulement qu'ils ouvrent
l'app.

**Trois états, définis par le MANQUE et non par un pourcentage :** complet
= *prête* ; il manque un = *incomplète* ; il en manque plus = *en
recherche*. C'est ce que dessine le Kolektif Pulse sur chaque carte.

**Le palmarès n'est jamais écrit par un client.** `stats` est refusé à
tout le monde par les règles — capitaine compris — et n'est mis à jour
que par la Cloud Function qui clôt un match (Admin SDK). Sans cette
interdiction, gonfler le bilan de son équipe tiendrait en trois lignes
dans la console du navigateur, et le classement par équipe ne vaudrait
rien. Le marqueur `_notifs.termine` garantit en plus qu'un match n'est
compté **qu'une fois**, même si le document est réécrit ensuite.

Barème du classement : **3 points par victoire, 1 par nul**, la différence
de buts départage. Une équipe sans match joué n'est pas classée — elle n'a
rien prouvé — mais elle est comptée à part pour ne pas disparaître.

**Sécurité.** L'équipe est publique en lecture (on doit pouvoir la
découvrir pour la rejoindre). Deux écritures seulement : le capitaine
gère tout ; un joueur ne peut qu'ajouter ou retirer **son propre** uid de
`membres` — la règle `rejointOuQuitte()` vérifie que le diff ne touche
que ce tableau et que la variation est exactement de un, sur soi.

### `defis/{defiId}`

Le maillon qui fait qu'une équipe peut **jouer** et pas seulement exister.

| Champ | Type | Rôle |
|---|---|---|
| `equipeA`, `equipeB` | string | Les deux équipes (jamais la même) |
| `capitaineA`, `capitaineB` | string | Qui envoie, qui répond |
| `nomA`, `nomB`, `couleurA`, `couleurB` | — | Copiés au moment du défi, pour l'afficher sans relire les équipes |
| `sport`, `date`, `heure`, `lieu` | — | Le rendez-vous proposé |
| `statut` | string | `envoye` → `accepte` \| `refuse` |
| `matchId` | string \| null | Le match créé à l'acceptation |

**Un défi accepté fabrique un vrai match**, avec les deux effectifs réunis
dans `joueursInscrits` et les deux camps dans `equipes`. Tout ce qui
existait — vestiaire, saisie du score, homme du match, XP — fonctionne
alors sans une ligne de plus.

Détail de fabrication : les règles n'autorisent la création d'un match
qu'au statut `sondage`. L'acceptation écrit donc le match en `sondage`
puis le passe immédiatement à `confirmé` — deux écritures, plutôt
qu'assouplir une règle de sécurité pour un cas particulier.

**Sécurité.** Seul le capitaine défié peut répondre, seulement à un défi
`envoye`, et son écriture ne peut toucher que `statut`, `matchId` et
`repondUAt` — ni la date, ni le lieu, ni les équipes. Le capitaine qui a
lancé le défi peut le retirer tant qu'il est en attente.

### `matchs/{matchId}`

Le cœur du produit.

| Champ | Type | Rôle |
|---|---|---|
| `createurUid` | string | Seul habilité à confirmer / composer / terminer / annuler |
| `statut` | string | `sondage` → `confirmé` → `terminé` (**accentués** — les règles n'acceptent que ces trois valeurs) |
| `message` | string \| null | Mot du créateur, visible de tous (140 car. max) |
| `creneauxProposes` | array | `[{ id, date, lieu, lat, lon, votants: [uid] }]` |
| `joueursInscrits` | array | UID des joueurs engagés |
| `lieuFinal`, `dateFinale` | — | Renseignés à la confirmation |
| `equipes` | array | Composition des deux équipes |
| `scoreA`, `scoreB` | number \| null | Renseignés à la fin |
| `hommeDuMatchUid` | string \| null | Résultat du vote communautaire |
| `_notifs` | objet | Marqueurs anti-spam, **écrits par les Functions uniquement** |

### `matchs/{matchId}/messages/{msgId}`

Le vestiaire : chat éphémère. Les messages sont **archivés (lecture
seule) 24 h après le coup d'envoi** — côté client. Rien ne les supprime
automatiquement.

---

## Cycle de vie d'un match

```
   [ sondage ]  ──── 10 inscrits + le créateur confirme ───►  [ confirmé ]
        │                                                          │
        │                                                    le créateur
        │                                                    saisit le score
   le créateur peut annuler                                        │
   → le document est SUPPRIMÉ                                      ▼
     (il n'y a pas de statut « annulé »)               [ terminé ]
                                                notes + vote homme du match
```

**Sondage.** Le créateur choisit un terrain et 1 à 3 créneaux. Les autres
votent (`creneauxProposes[].votants`) et s'inscrivent
(`joueursInscrits`) — deux actions distinctes : voter ne suffit pas à
jouer.

**Confirmation.** Manuelle, réservée au créateur, possible dès **10
inscrits** (`MIN_CONFIRM`, aligné client et serveur). Elle fige
`lieuFinal` et `dateFinale`.

**Terminé.** Le créateur saisit le score. S'ouvrent alors la notation
entre joueurs (qui fait évoluer les `atouts`) et le vote « homme du
match ».

**Règle d'unicité :** un joueur ne peut être inscrit qu'à **un seul
match actif** à la fois. Vérifié côté client *et* re-vérifié au moment
de la création.

---

## Temps réel et gestion des écoutes

L'app s'appuie sur les écoutes `onSnapshot` de Firestore : un vote
apparaît chez les autres sans rafraîchissement.

Le piège classique — les écoutes qui fuient — est traité par un **hook de
nettoyage unique** :

```js
let _onModalClose = null;
// openModal(titre, corps, onClose) enregistre le hook
// closeModal() l'exécute TOUJOURS — bouton, tap sur le fond, ou swipe
```

Toutes les fermetures passent par le même `closeModal`, donc aucune ne
peut court-circuiter le désabonnement. `activeListeners` sert de filet de
sécurité à la déconnexion.

---

## Notifications push

C'est la seule partie qui exige du code serveur : **un client ne peut pas
notifier un autre client**.

### `onMatchEcrit` — déclenchée à chaque écriture sur un match

| Événement détecté | Qui est notifié |
|---|---|
| Nouveau sondage | Tout le monde sauf le créateur |
| Match confirmé | Les votants + les inscrits |
| Désistement (il manque 1 à 3, match < 48 h) | Les non-inscrits |
| Match terminé | Les joueurs du match |

### `rappels` — planifiée toutes les 30 minutes

| Fenêtre | Qui |
|---|---|
| J-1 (20 h à 28 h avant) | Les inscrits |
| H-2 (≤ 2 h 30 avant) | Les inscrits |
| Dernier appel (il manque 1-3, < 24 h) | Les non-inscrits |

### Deux garde-fous

**Anti-spam.** Chaque envoi pose un marqueur dans `_notifs` sur le doc
match (`rappelJ1`, `rappelH2`…) ; une alerte « il manque » est limitée à
une par heure. Ces marqueurs sont écrits par l'Admin SDK, qui contourne
les règles Firestore — et le trigger ignore ses propres écritures pour ne
pas boucler.

**Messages *data-only*.** Le payload ne contient **pas** de bloc
`notification` : c'est le service worker qui construit et affiche
l'alerte. Un payload `notification` provoquerait un doublon avec
`onBackgroundMessage`.

Les jetons FCM expirés sont purgés à chaque envoi, sinon les
notifications s'éteignent silencieusement au bout de quelques semaines.

> Déploiement : `firebase deploy --only functions` (**plan Blaze
> requis**). Voir [PUSH-SETUP.md](./PUSH-SETUP.md).

---

## Sécurité

Les règles (`firestore.rules`) reposent sur un principe : **le client ne
peut écrire que ce qui le concerne**.

- **`users/{uid}`** — chacun ne modifie que son propre document.
- **`matchs/{matchId}`** — création uniquement en son propre nom et au
  statut `sondage` ; le `message` est validé (chaîne ≤ 200 caractères ou
  `null`).
- **Modification d'un match** — deux cas seulement :
  - **le créateur** peut tout faire (confirmer, composer, terminer,
    annuler) ;
  - **un autre joueur** ne peut toucher qu'à sa participation (vote,
    inscription, note, vote MOTM). Il ne peut ni changer le score, ni
    confirmer, ni annuler.
- **`messages`** — un message appartient à son auteur.

> ⚠️ Les règles ne s'appliquent **qu'une fois déployées**
> (`firebase deploy --only firestore:rules`). Le fichier dans le dépôt
> n'est qu'une intention tant que la commande n'a pas tourné.

---

## Gamification

**XP** — gains et malus (constante `XP`, `index.html`) :

| Action | XP |
|---|---|
| Participer à un match | +100 |
| Être élu homme du match | +200 |
| Créer un match | +50 |
| Voter pour un créneau | +10 |
| **Poser un lapin** (inscrit, absent) | **−15**, série remise à zéro, compteur `lapins` +1 |

**Rangs** — seuils d'XP, affichés par une pastille de couleur :

| XP | Rang |
|---|---|
| 0 | Recrue |
| 200 | Stagiaire |
| 500 | Titulaire |
| 1 000 | Cadre |
| 2 000 | Capitaine |
| 4 000 | Légende |

Le passage d'un palier déclenche un toast « Level up ! ».

**Badges** — six paliers : 1er match, 5 matchs, 10 matchs, homme du
match, organisateur, assidu.

**Notes entre joueurs** — après un match, chacun note les autres ; les
notes font évoluer les `atouts`, donc l'overall, donc le rang de la
carte. C'est la boucle qui donne envie de revenir.

---

## Choix techniques assumés

**Un seul fichier `index.html`.** ~6 100 lignes. Aucune étape de build,
aucun `node_modules`, aucune dépendance à mettre à jour. Le prix : pas de
découpage en modules. Le fichier est balisé par sections
(`// ===== ÉCRAN PROFIL =====`) qui tiennent lieu de sommaire. Un
découpage a été envisagé puis écarté : risque élevé, valeur nulle pour
l'utilisateur.

**Pas de framework.** Le rendu se fait par génération de chaînes HTML et
`innerHTML`. Tout contenu venant d'un utilisateur passe par
`escapeHtml()` — c'est la barrière anti-injection, à ne jamais oublier
lors d'un ajout.

**Terrains en dur.** 17 salles de foot à 5 de l'Essonne sont codées dans
`VENUES_91` (nom, ville, coordonnées). Recherche libre en complément via
Nominatim (OpenStreetMap), sans clé ni quota.

**Coordonnées et distances.** Formule de haversine côté client pour
trier les terrains par proximité du code postal du joueur.
