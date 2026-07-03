# 🔔 Notifications push — guide de déploiement

Tout le code est prêt (client + `functions/`). Il reste **le déploiement**,
à faire une seule fois depuis ton ordinateur, avec le compte Google
propriétaire du projet Firebase **inrun-five**.

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

Chaque joueur : **Profil → Réglages → 🔔 Activer les notifications** → accepter.
Le jeton est stocké dans `users/{uid}.fcmTokens` et **rafraîchi
automatiquement** à chaque connexion.

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

## Dépannage rapide

- **Rien ne part** → Console Firebase → *Functions* → onglet *Journaux* :
  chaque envoi y est tracé, les erreurs aussi.
- **`permission denied` au déploiement** → mauvais compte : `firebase logout`
  puis `firebase login` avec le compte propriétaire.
- **Un joueur ne reçoit rien** → vérifier qu'il a bien activé les notifs
  *depuis l'app* (et sur iPhone : depuis l'app installée), puis re-taper
  « Activer les notifications » pour régénérer un jeton frais.
