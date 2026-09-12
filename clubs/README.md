# Écussons de clubs

Dépose ici **dix fichiers PNG**, nommés exactement comme ci-dessous.
Dès qu'un fichier existe, l'app l'utilise à la place du CDN externe —
et il devient disponible **hors-ligne**, ce que le CDN ne permet pas.

| Fichier | Club |
|---|---|
| `psg.png` | Paris Saint-Germain |
| `om.png` | Olympique de Marseille |
| `ol.png` | Olympique Lyonnais |
| `monaco.png` | AS Monaco |
| `barca.png` | FC Barcelone |
| `real.png` | Real Madrid |
| `bayern.png` | Bayern Munich |
| `city.png` | Manchester City |
| `liverpool.png` | Liverpool FC |
| `chelsea.png` | Chelsea FC |

**Format attendu :** PNG carré à fond transparent, 128 × 128 px environ.
Plus grand ne sert à rien : le rendu maximal est de 60 px.

## Ordre de repli

1. `./clubs/<id>.png` — local, mis en cache, marche hors-ligne
2. `https://crests.football-data.org/<fdId>.png` — si le fichier manque
3. L'abréviation du club (PSG, RMA, LFC…) dans la couleur de l'équipe

Aucun fichier n'est obligatoire : sans eux l'app fonctionne, elle passe
simplement par les niveaux 2 et 3.

## Avertissement

Un écusson de club est une **marque déposée**. Les déposer ici revient à
les redistribuer depuis ce dépôt — ce qui est plus exposé que de pointer
vers un serveur tiers. C'est une décision à prendre en connaissance de
cause, pas un détail technique.
