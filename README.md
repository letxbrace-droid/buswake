<div align="center">

<img src="./logo.png" width="110" alt="Kolektif">

# Kolektif

**Ton match, au complet.**
Trouve des joueurs. Propose un match. Joue.

[**→ Ouvrir l'app**](https://letxbrace-droid.github.io/buswake)

</div>

---

## Qu'est-ce que c'est

Une application web (PWA) pour trouver des joueurs et compléter ses
matchs. Elle remplace le fil WhatsApp interminable où personne ne sait
jamais qui joue.

Née au dépôt RATP de Saclay — qui reste sa première communauté et son
terrain de test — elle n'est plus liée à ce lieu : le produit vise les
groupes de collègues, d'amis ou de voisins, partout.

Le principe tient en trois temps :

1. **Un collègue propose** un match — un terrain, un à trois créneaux.
2. **Les autres votent** pour leurs disponibilités.
3. **À 10 joueurs, le créateur confirme** : le match est calé, tout le
   monde reçoit une notification.

Autour de ça : une carte de joueur façon FUT avec des statistiques qui
évoluent, un classement, des notes entre joueurs, un vote « homme du
match », et un vestiaire (chat) éphémère par match.

## Pour l'utiliser

Rien à installer depuis un magasin d'applications. Ouvrir le lien, créer
un compte, et — sur téléphone — **« Ajouter à l'écran d'accueil »** :
l'app s'installe comme une vraie application (icône, plein écran,
notifications).

- **iPhone** : Safari → bouton Partager → *Sur l'écran d'accueil*
- **Android** : Chrome → menu ⋮ → *Installer l'application*

Les notifications push exigent l'app **installée** (contrainte iOS).

## Pour le développeur

### Structure

```
buswake/
├── index.html          ← TOUTE l'app (HTML + CSS + JS, ~6 100 lignes)
├── sw.js               ← Service worker (cache hors-ligne + notifications)
├── manifest.json       ← Manifeste PWA (icône, nom, couleurs)
├── firestore.rules     ← Règles de sécurité de la base
├── firebase.json       ← Configuration du déploiement Firebase
├── functions/          ← Cloud Functions (notifications push)
│   ├── index.js        ← Les 2 fonctions : onMatchEcrit, rappels
│   └── package.json    ← Node 22
├── stickers/           ← 4 stickers WhatsApp (hors app)
└── *.png / *.jpg       ← Assets du design system (voir DESIGN.md)
```

**Un seul fichier pour l'app.** `index.html` contient le HTML, le CSS et
le JavaScript. C'est délibéré : aucune étape de build, aucune
dépendance à installer, un `git push` suffit à déployer. Le fichier est
découpé en sections balisées (`// ===== ÉCRAN PROFIL =====`) qui servent
de sommaire — cherche-les pour naviguer.

### Lancer en local

Il faut un serveur HTTP (le service worker et les modules ES ne
fonctionnent pas en `file://`) :

```bash
cd buswake
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

L'app se connecte au vrai Firebase (projet `inrun-five`) — pas d'émulateur
configuré. **Attention : les données créées en local sont les vraies.**

### Déployer

L'app elle-même est servie par **GitHub Pages** : tout push sur la branche
publiée est en ligne en une minute. Rien d'autre à faire.

Les deux composants Firebase se déploient à part, depuis Cloud Shell ou
une machine avec la CLI Firebase :

```bash
firebase deploy --only firestore:rules   # règles de sécurité
firebase deploy --only functions         # notifications push (plan Blaze)
```

> ⚠️ **Après toute modification de `firestore.rules` ou `functions/`,
> le déploiement est obligatoire** — sinon le changement n'existe que
> dans le dépôt, pas en production.

### Le cache : la règle à ne pas oublier

`sw.js` sert les assets en **cache-first**. Si tu modifies une image
(logo, illustration…), il faut **incrémenter le numéro de version** en
tête de `sw.js`, sinon les téléphones garderont l'ancienne :

```js
const CACHE = 'cs5-v70';   // ← +1 à chaque changement d'asset
```

`index.html` est en réseau-d'abord : une simple actualisation suffit pour
le code.

## Documentation détaillée

| Document | Contenu |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Modèle de données, cycle de vie d'un match, notifications, sécurité |
| [DESIGN.md](./DESIGN.md) | Système de design : tokens, composants, assets, principes |
| [PUSH-SETUP.md](./PUSH-SETUP.md) | Guide de déploiement des notifications push |

## Stack

| Brique | Choix | Pourquoi |
|---|---|---|
| Front | HTML/CSS/JS natif, zéro framework | Pas de build, pas de dépendances à maintenir |
| Base | Firebase Firestore | Temps réel natif, gratuit à cette échelle |
| Auth | Firebase Auth (e-mail + Google) | Standard, rien à écrire |
| Notifications | Firebase Cloud Messaging + Cloud Functions | Seule voie pour du push web sur iOS |
| Hébergement | GitHub Pages | Gratuit, HTTPS, déploiement par `git push` |
| Cartes | Nominatim / OpenStreetMap | Sans clé d'API, sans quota |

## État du projet

Le produit est **complet et en service**. Les évolutions envisagées mais
volontairement repoussées (le temps que l'usage réel tranche) :

- Cache hors-ligne des données Firestore (`persistentLocalCache`) — voter
  et s'inscrire sans réseau, synchronisation au retour du signal.
- Relance automatique des votants silencieux sur un sondage qui stagne.
- Statistiques de saison (buteurs, séries) — attendre d'avoir des données.

---

<div align="center">
<sub>Trouve · Propose · Joue</sub>
</div>
