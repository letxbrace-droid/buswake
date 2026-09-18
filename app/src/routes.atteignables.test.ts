import { describe, it, expect } from 'vitest';
/**
 * TOUTE ROUTE DOIT ÊTRE ATTEIGNABLE.
 *
 * `/profil` — et avec elle la carte joueur, un des écrans les plus
 * travaillés du projet — n'était liée depuis NULLE PART : ni la barre du
 * bas, ni un bouton, ni un lien. La route existait, l'écran rendait
 * parfaitement, les sondes le mesuraient en le visitant par son URL. Il
 * était simplement impossible d'y arriver en se servant de l'app.
 *
 * Aucune sonde ne pouvait le voir : elles naviguent toutes par l'adresse.
 * C'est un défaut de GRAPHE, pas de rendu — il se lit dans le source ou pas
 * du tout.
 */
/** `import.meta.glob` plutôt que `node:fs` : `src/` est typé pour le
 *  navigateur, et lui ouvrir les globales Node pour un seul test ferait
 *  passer `process` et `fs` pour disponibles dans tout le code d'application.
 *  Vite inline ces sources à la compilation. */
const MODULES = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Les COMMENTAIRES ne sont pas du code.
 *
 *  Sans ce nettoyage, un commentaire qui mentionne `/profil` pour expliquer
 *  le défaut compte comme un lien vers `/profil` : le contrôle passe au vert
 *  grâce à la phrase qui décrit le bug. Vu en l'éprouvant. C'est la même
 *  erreur que de chercher une chaîne n'importe où au lieu de la construction
 *  qui compte. */
function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const tout = sansCommentaires(
  Object.entries(MODULES)
    .filter(([f]) => !/\.test\./.test(f))
    .map(([, src]) => src)
    .join('\n'),
);
const app = MODULES['./App.tsx'];

describe('routes atteignables', () => {
  const routes = [...app.matchAll(/path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((r) => r !== '*');

  it('déclare bien des routes', () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  it.each(routes)('on peut arriver sur %s depuis l’app', (route) => {
    // Une route paramétrée se rejoint par un gabarit : `/match/:id` se
    // construit avec `/match/${id}`. On compare sur le préfixe stable.
    const base = route.split('/:')[0];
    const echappe = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Le critère : le chemin apparaît QUELQUE PART AILLEURS que dans sa
    // propre déclaration `path="…"`. Un lien direct (`to="/x"`), une
    // navigation (`aller('/x')`), ou une redirection calculée qui renvoie
    // ce chemin (`ouAller` rend '/bienvenue') comptent toutes — viser les
    // seules formes littérales rejetait `/bienvenue`, qui est pourtant
    // parfaitement atteignable.
    const toutes = tout.match(new RegExp(`["'\`]${echappe}(?=["'\`/])`, 'g')) ?? [];
    const declarations = app.match(new RegExp(`path="${echappe}(?=["/])`, 'g')) ?? [];

    expect(
      toutes.length - declarations.length,
      `aucun lien ni navigation vers ${route} — la route existe mais rien n’y mène`,
    ).toBeGreaterThan(0);
  });
});
