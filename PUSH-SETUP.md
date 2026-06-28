# 🔔 Activer les notifications push (FCM)

Le code est prêt. Il reste **3 étapes** côté Firebase (à faire une seule fois).

## 1. Récupérer la clé VAPID (Web Push)
1. [console.firebase.google.com](https://console.firebase.google.com) → projet **inrun-five**
2. ⚙️ **Paramètres du projet** → onglet **Cloud Messaging**
3. Section **Certificats Web Push** → **Générer une paire de clés**
4. Copie la **clé publique** affichée

Puis dans `index.html`, remplace :
```js
const VAPID_KEY = ''; // <-- COLLE TA CLÉ VAPID ICI
```
par ta clé :
```js
const VAPID_KEY = 'BBxxxx...ta_cle_publique...';
```
Commit + push (GitHub Pages se met à jour).

## 2. Déployer les Cloud Functions (envoi des notifs)
Nécessite le **plan Blaze** (gratuit jusqu'à un gros quota).
```bash
npm install -g firebase-tools
firebase login
firebase use inrun-five
cd functions && npm install && cd ..
firebase deploy --only functions
```
Deux fonctions sont déployées :
- `onMatchCreated` → notifie quand un **sondage** est créé
- `onMatchConfirmed` → notifie quand un **match est confirmé**

## 3. Côté joueurs
Chaque joueur ouvre l'app → **Profil** → **🔔 Activer les notifications** → accepte la permission.
Le jeton est stocké dans `users/{uid}.fcmTokens`.

> 💡 iOS : les notifications push web ne marchent que si l'app est **installée sur l'écran d'accueil** (PWA), iOS 16.4+.

## Tester
Crée un sondage / confirme un match → les joueurs ayant activé les notifs reçoivent une push (même app fermée).
