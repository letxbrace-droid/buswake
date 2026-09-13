# Skills KOLEKTIF

Six skills, une par domaine de décision. Elles ne remplacent pas
`ARCHITECTURE.md`, `DESIGN.md` et `AUDIT.md` — elles disent **comment
travailler** dessus et **comment vérifier**.

| Skill | Se déclenche quand |
|---|---|
| `kolektif-product-architecture` | modèle de données, cycle de vie d'un match, périmètre, compteurs |
| `kolektif-ui-design-system` | couleur, ombre, carte, fond, icône, mouvement |
| `kolektif-firestore-security` | règles, champ écrit par un client, chaîne affichée |
| `kolektif-testing-qa` | après toute modification, avant tout commit |
| `kolektif-pwa-performance` | asset, service worker, requête, écoute temps réel |
| `kolektif-release-checklist` | commit, push, `firebase deploy` |

Les scripts exécutables vivent dans `kolektif-testing-qa/scripts/` : les
cinq autres skills les appellent plutôt que d'en dupliquer.

```bash
cd ~/buswake
node .claude/skills/kolektif-testing-qa/scripts/tout.mjs
```
