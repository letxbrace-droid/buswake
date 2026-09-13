---
name: kolektif-release-checklist
description: Procédure de publication de KOLEKTIF — ordre des déploiements entre GitHub Pages, les règles Firestore, les index et les Cloud Functions, bump du cache, vérifications avant et après. À utiliser avant tout commit destiné à la production, tout push, et tout firebase deploy.
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
| **Le client** (`index.html`, `sw.js`, assets) | `git push` → GitHub Pages | rien ne change pour personne |
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

### 2. Le bump de cache n'est pas optionnel

Tout fichier précaché modifié ⇒ `const CACHE = 'cs5-vNN'` incrémenté dans
`sw.js`, **dans le même commit**. Sinon les utilisateurs gardent
l'ancienne version sans le savoir.

### 3. La branche de travail est `claude/inrun-five-pwa-qmbdym`

Ne jamais pousser ailleurs sans autorisation explicite.
`git push -u origin claude/inrun-five-pwa-qmbdym`. En cas d'échec
réseau, réessayer avec des attentes croissantes (2 s, 4 s, 8 s, 16 s).

### 4. Le message de commit explique la décision, pas le diff

Le diff dit *quoi*. Le message dit *pourquoi* et, quand une mesure a
tranché, **donne le chiffre**. C'est la mémoire du projet.

### 5. Rien ne se déploie sans que la suite passe

`tout.mjs` doit sortir en 0.

### 6. Les fichiers de travail ne se committent pas

`_harnais.html`, `captures/`, `_p2.html`, `_plq.html`, `_v*.html`.
Vérifier `git status` avant `git add -A`.

## Étapes de travail

### Avant le commit

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs     # doit sortir en 0
node .claude/skills/kolektif-testing-qa/scripts/captures.mjs # et les regarder
git status --short                                           # rien d'inattendu
```

- [ ] Suite verte.
- [ ] Captures regardées.
- [ ] `CACHE` incrémenté si un fichier précaché a changé.
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
- [ ] Vérifier que la version du service worker est la nouvelle
      (DevTools → Application → Service Workers).
- [ ] Créer un match de bout en bout : sondage → vote → confirmation.
- [ ] Console Firebase → Firestore → Règles : la version publiée est
      bien la nouvelle.
- [ ] Console Firebase → Functions : les deux fonctions sont déployées
      et sans erreur.

## Erreurs à éviter

- **Pousser le client et croire que les règles sont déployées.** La
  panne est silencieuse : l'écriture part dans un `catch`, l'écran reste
  vide, rien n'apparaît dans la console.
- **Oublier le bump de cache.** Le correctif existe et personne ne le voit.
- **Déployer le client avant les règles.**
- **Tester en gardant l'onglet ouvert** : le service worker sert encore
  l'ancienne version. Navigation privée, ou *Offline* décoché puis
  rechargement forcé.
- **Committer `_harnais.html` ou `captures/`.**
- **Pousser sur une autre branche.**

## Critères de validation

- [ ] `tout.mjs` sort en 0.
- [ ] La version de cache a changé si nécessaire.
- [ ] Les trois déploiements sont faits, dans l'ordre.
- [ ] Un match créé en production suit son cycle complet.
- [ ] Aucune erreur dans la console du navigateur ni dans les logs
      Functions.

## Commandes de test

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs
git status --short
grep -n "const CACHE" sw.js
git log --oneline -3

# Après déploiement des functions
firebase functions:log --only onMatchEcrit -n 20
```
