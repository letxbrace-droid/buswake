# 🔔 Notifications push — guide de déploiement

Les deux Cloud Functions sont **déjà déployées**. Le client de la v2 est
en place : `src/domaine/push.ts` (les décisions), `src/services/push.ts`
(le jeton), `public/push.js` (la réception app fermée), et le bouton dans
Réglages → Notifications.

Il reste ce que je ne peux pas faire d'ici : **vérifier qu'une
notification arrive vraiment**. Ça demande deux appareils réels et la
permission du navigateur — aucun harnais ne peut la donner.

## Ce que font les notifications

| Événement | Qui reçoit |
|---|---|
| Nouveau sondage créé | Tout le monde sauf le créateur |
| Match confirmé ✅ | Les votants + les inscrits |
| Désistement (il manque 1-3, match < 48 h) | Les non-inscrits |
| Match terminé 🏁 (notes + vote MOTM) | Les joueurs du match |
| Rappel J-1 « Demain, on joue » | Les inscrits |
| Rappel H-2 « Coup d'envoi à 19h » | Les inscrits |
| Dernier appel (il manque 1-3, < 24 h) | Les non-inscrits |

Garde-fous intégrés : anti-spam (marqueurs `_notifs` sur chaque match,
1 alerte « manque » max par heure), purge automatique des jetons expirés,
heure calculée sur le fuseau **Europe/Paris**, clic sur la notif = ouverture
directe du match concerné.

## Comment c'est branché dans la v2

| Où | Quoi |
|---|---|
| `app/src/domaine/push.ts` | états de permission, lecture du message, route d'un clic — **testé** |
| `app/src/services/push.ts` | jeton FCM, écriture de `fcmTokens`, écoute app ouverte |
| `app/src/services/usePush.ts` | l'état à l'écran, l'activation, le rafraîchissement du jeton |
| `app/public/push.js` | réception **app fermée** + clic sur la notification |

Trois points qui ne se devinent pas :

1. **Pas de `firebase-messaging-sw.js`.** Deux service workers enregistrés
   sur la même portée s'évincent l'un l'autre, et c'est celui qui sert le
   site qui doit rester. `push.js` est donc **importé** par le worker
   généré par Workbox (`importScripts` dans `vite.config.ts`).
2. **Les messages sont DATA-ONLY** (`data: { title, body, matchId }`). Si
   le serveur envoyait un bloc `notification`, le navigateur en afficherait
   une **et** `push.js` une seconde : deux bannières pour un match.
3. **Le lien a changé.** La v1 ouvrait `#j=<id>` ; la v2 est un HashRouter
   et la route d'un match est `#/match/<id>`. Les anciens liens sont
   traduits au démarrage (`routeHeritee`, dans `main.tsx`) — ils
   n'ouvraient plus rien avant ça, alors qu'ils circulent toujours dans
   les conversations des joueurs.

Le SDK Messaging est chargé **à la demande** : il n'entre pas dans la
première peinture (mesuré — 99 Ko, inchangé).

## 1. Prérequis (une fois)

1. **Plan Blaze** : [console.firebase.google.com](https://console.firebase.google.com)
   → projet **inrun-five** → ⚙️ → *Utilisation et facturation* → passer au
   plan **Blaze** (pay-as-you-go). À l'échelle du dépôt, le coût réel est
   **0 €** — le quota gratuit couvre très largement (2 M d'appels/mois).
2. **Firebase CLI** :
   ```bash
   npm install -g firebase-tools
   firebase login        # compte propriétaire du projet inrun-five
   ```

## 2. Déployer

Depuis la racine du dépôt (là où il y a `firebase.json`) :

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

Deux fonctions sont déployées (région `europe-west1`) :
- **`onMatchEcrit`** — réagit à chaque changement d'un match (création,
  confirmation, désistement, fin de match) ;
- **`rappels`** — passe toutes les 30 min pour les rappels J-1 / H-2 et le
  dernier appel. (Le premier déploiement crée le job Cloud Scheduler
  automatiquement — accepte si la CLI le demande.)

## 3. Côté joueurs (rien à déployer)

Chaque joueur : **⋯ → Réglages → Notifications → Activer** → accepter.
Le jeton est stocké dans `users/{uid}.fcmTokens` et **rafraîchi
automatiquement** à chaque connexion — sans ça les jetons expirent et les
notifications s'éteignent toutes seules au bout de quelques semaines, sans
erreur et sans message.

Le bouton dit l'**état**, pas l'intention. S'il est éteint, il explique
pourquoi : un refus du navigateur est définitif et ne se reprend que dans
les réglages du navigateur, jamais depuis l'app.

> 💡 **iPhone** : le push web exige que l'app soit **installée sur l'écran
> d'accueil** (le widget d'installation s'en occupe) et iOS 16.4+. Activer
> les notifications **depuis l'app installée**, pas depuis Safari.

## 4. Tester

1. Active les notifs sur deux comptes (deux téléphones ou tél + ordi).
2. Avec le compte A, crée un sondage → le compte B reçoit
   « Nouveau match proposé ⚽ » (même app fermée).
3. Confirme un match → les votants reçoivent « C'est calé ✅ ».
4. Désiste-toi d'un match confirmé de demain → les non-inscrits reçoivent
   « Il manque 1 joueur ⚡ ».
5. **Clique la notification** : elle doit ouvrir LE match, pas l'accueil.
   C'est le point le plus facile à rater sans que ça se voie — une notif
   qui ouvre l'app a l'air de marcher.
6. Laisse l'app **ouverte** et déclenche-en une : elle doit apparaître en
   toast. Le système n'affiche rien quand l'app est au premier plan.

## Dépannage rapide

- **Rien ne part** → Console Firebase → *Functions* → onglet *Journaux* :
  chaque envoi y est tracé, les erreurs aussi.
- **`permission denied` au déploiement** → mauvais compte : `firebase logout`
  puis `firebase login` avec le compte propriétaire.
- **Un joueur ne reçoit rien** → vérifier qu'il a bien activé les notifs
  *depuis l'app* (et sur iPhone : depuis l'app installée), puis re-taper
  « Activer les notifications » pour régénérer un jeton frais.
- **Le bouton dit « Indisponible sur cet appareil »** → FCM se déclare non
  supporté ici. Sur iPhone, c'est le cas tant que l'app n'est pas installée
  sur l'écran d'accueil (et avant iOS 16.4).
- **La notification arrive mais ouvre l'accueil** → le `matchId` n'est pas
  passé dans `data`, ou le worker publié est l'ancien. Vérifier dans
  DevTools → Application → Service Workers que le worker actif importe bien
  `push.js`.
