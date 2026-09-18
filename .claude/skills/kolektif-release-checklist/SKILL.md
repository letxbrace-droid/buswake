---
name: kolektif-release-checklist
description: Procédure de publication de KOLEKTIF — construction de la v2 et publication à la racine, ordre des déploiements entre GitHub Pages, les règles Firestore, les index et les Cloud Functions, vérifications avant et après. À utiliser avant tout commit destiné à la production, tout push, et tout firebase deploy.
---

# Publication — KOLEKTIF

## Objectif

Publier sans casser, dans une architecture où **trois choses se
déploient séparément** et où en oublier une donne une panne silencieuse.

## Quand l'utiliser

- Avant tout commit destiné à la production.
- Avant tout `git push`.
- Avant tout `firebase deploy`.
- Quand « c'est poussé mais ça ne marche pas ».

## Les trois déploiements, et ce qu'ils recouvrent

| Quoi | Comment | Effet si oublié |
|---|---|---|
| **Le client** (le build de `app/` publié à la racine) | `npm run deployer` **puis** `git push` → GitHub Pages | rien ne change pour personne |
| **Les règles et index** | `firebase deploy --only firestore:rules,firestore:indexes` | les écritures échouent en silence ; les listes reviennent vides |
| **Les Cloud Functions** | `firebase deploy --only functions` | pas de notification, pas de classement par équipe |

**Aucun des trois n'entraîne les autres.** Une règle modifiée dans le
dépôt et poussée sur GitHub n'est **pas** en production.

## Règles métier

### 1. L'ordre compte

1. Déployer d'abord **les règles et les index** — le nouveau client peut
   écrire des champs que l'ancienne règle refuse.
2. Puis **les Cloud Functions**.
3. Puis **le client** (`git push`).

Un client neuf devant des règles anciennes, c'est une app qui échoue en
silence.

### 2. Le source poussé n'est pas le site publié

C'est **le** piège de l'architecture actuelle, et il est silencieux.

GitHub Pages ne sait pas construire : il sert ce qui est dans le dépôt.
Le site, c'est la **racine** — `index.html`, `assets/`, `sw.js` — produite
par `vite build` depuis `app/`. Modifier `app/src/` et pousser ne change
**rien** pour personne : le test passe, le diff a l'air bon, la
production reste à la version d'avant.

`npm run deployer` construit, publie à la racine, puis vérifie. Le build
produit est **volontairement commité**, avec le source, dans le même
commit.

Il n'y a **plus** de version de cache à incrémenter. Workbox empreinte
chaque fichier et régénère sa liste depuis le build ; `registerType:
'autoUpdate'` avec `skipWaiting` + `clientsClaim` fait le reste. La
constante `cs5-vNN` de la v1 n'existe plus — et `nettoyage-v1.js`, importé
par le worker, efface les anciens caches `cs5-*` restés sur les appareils
déjà venus.

### 3. La branche de travail est `claude/inrun-five-pwa-qmbdym`

Ne jamais pousser ailleurs sans autorisation explicite.
`git push -u origin claude/inrun-five-pwa-qmbdym`. En cas d'échec
réseau, réessayer avec des attentes croissantes (2 s, 4 s, 8 s, 16 s).

### 4. Le message de commit explique la décision, pas le diff

Le diff dit *quoi*. Le message dit *pourquoi* et, quand une mesure a
tranché, **donne le chiffre**. C'est la mémoire du projet.

### 5. Rien ne se déploie sans que la suite passe

`tout.mjs` doit sortir en 0.

### 6. Ce qui se committe, et ce qui ne se committe pas

Inversé par rapport à la v1 : ici le **produit du build fait partie du
dépôt**. `app/dist/` non (c'est l'intermédiaire, ignoré) ; la racine oui
(c'est le site).

Vérifier `git status` avant `git add -A` : le diff doit contenir à la
fois le source modifié **et** la racine régénérée. Un diff qui ne touche
que `app/src/` est un déploiement qui ne déploie rien.

## Étapes de travail

### Avant le commit

```bash
cd ~/buswake
cd app && npm run deployer && cd ..                       # construit, publie, vérifie
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs   # doit sortir en 0
git status --short                                         # source ET racine
```

- [ ] Suite verte.
- [ ] La racine a été régénérée dans ce commit.
- [ ] `ARCHITECTURE.md` / `DESIGN.md` à jour si le modèle ou une mesure
      a changé.
- [ ] Aucun fichier de travail dans le diff.

### Le commit

```bash
git add -A
git commit -F - <<'EOF'
Titre court à l'impératif

Ce qui a été décidé, et pourquoi. Les mesures qui ont tranché, avec
leurs chiffres.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: <url de session>
EOF
```

### Le déploiement Firebase (depuis Google Cloud Shell)

```bash
cd ~/buswake && git pull origin claude/inrun-five-pwa-qmbdym
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

Les règles peuvent aussi être publiées depuis la console Firebase, en
collant le contenu de `firestore.rules`.

### Le déploiement du client

```bash
git push -u origin claude/inrun-five-pwa-qmbdym
```

### Après le déploiement

- [ ] Ouvrir l'app en **navigation privée** (contourne le cache).
- [ ] Vérifier que le service worker actif est le nouveau
      (DevTools → Application → Service Workers).
- [ ] Ouvrir `/buswake/v1.html` : le secours de la v1 doit répondre, et
      non la v2. Le worker détourne les navigations ; seul un test sur la
      racine publiée le montre.
- [ ] Créer un match de bout en bout : sondage → vote → confirmation.
- [ ] Console Firebase → Firestore → Règles : la version publiée est
      bien la nouvelle.
- [ ] Console Firebase → Functions : les deux fonctions sont déployées
      et sans erreur.

## Erreurs à éviter

- **Pousser le client et croire que les règles sont déployées.** La
  panne est silencieuse : l'écriture part dans un `catch`, l'écran reste
  vide, rien n'apparaît dans la console.
- **Pousser `app/src/` sans régénérer la racine.** Le correctif existe
  dans le dépôt et personne ne le voit.
- **Déployer le client avant les règles.**
- **Tester en gardant l'onglet ouvert** : le service worker sert encore
  l'ancienne version. Navigation privée, ou *Offline* décoché puis
  rechargement forcé.
- **Ne committer que le source, en croyant avoir publié.**
- **Pousser sur une autre branche.**

## Critères de validation

- [ ] `tout.mjs` sort en 0.
- [ ] La racine publiée a été régénérée et commitée avec le source.
- [ ] Les trois déploiements sont faits, dans l'ordre.
- [ ] Un match créé en production suit son cycle complet.
- [ ] Aucune erreur dans la console du navigateur ni dans les logs
      Functions.

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs
git status --short
git log --oneline -3

# La racine est-elle à jour vis-à-vis du source ?
cd app && npm run deployer && cd .. && git status --short
# Si `git status` bouge ici, c'est que la racine commitée était périmée.

# Après déploiement des functions
firebase functions:log --only onMatchEcrit -n 20
```
