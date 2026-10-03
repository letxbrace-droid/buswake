import { describe, it, expect } from 'vitest';
/**
 * UNE APPARENCE PAR RÔLE.
 *
 * Avant la matière commune (styles/verre.css), chaque écran recopiait son
 * bouton vert : `rounded-pill bg-vert py-3`, puis `py-3.5`, puis `py-4`, avec
 * trois façons différentes de dire « désactivé ». Trente variantes qui
 * divergeaient déjà. Ce test empêche la trente et unième.
 */
const SOURCES = import.meta.glob('./{ecrans,composants,conteneurs}/*.tsx', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const classes = Object.entries(SOURCES).flatMap(([f, src]) =>
  [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => [f, m[1] ?? m[2]] as const),
);

describe('matière commune', () => {
  it('aucun bouton d’action recopié à la main', () => {
    const fautifs = classes.filter(
      ([, c]) => /rounded-\(--radius-pill\)/.test(c) && /\bpy-(2\.5|3|3\.5|4)\b/.test(c)
        && /bg-\(--color-(vert|or|rouge-fond)\)/.test(c),
    );
    expect(fautifs.map(([f]) => f), 'utiliser .btn .btn-vert / .btn-or / .btn-danger-plein').toEqual([]);
  });
  it('aucune puce sélectionnée en aplat vert plein', () => {
    const fautifs = classes.filter(([, c]) => /'bg-\(--color-vert\) font-semibold text-\(--color-fond\)'/.test(c));
    expect(fautifs.map(([f]) => f), 'utiliser .puce et aria-pressed').toEqual([]);
  });
  it('tout champ de saisie est creusé (.champ)', () => {
    // Un champ posé à plat sur la carte se confond avec elle : la planche
    // « tactile » creuse ce qu'on peut écrire. Un nouvel <input> qui
    // recopierait l'ancien style à plat serait le premier écart.
    // On découpe chaque balise jusqu'à « /> » au lieu d'une regex `[^>]*` :
    // les `=>` des gestionnaires (onChange={(e) => …}) coupaient la balise
    // avant son className, et le contrôle ne voyait que 2 champs sur 14.
    const balises = Object.entries(SOURCES).flatMap(([f, src]) =>
      src.split(/<(?=input\b|textarea\b)/).slice(1).map((b) => [f, b.slice(0, b.indexOf('/>'))] as const),
    );
    expect(balises.length, 'aucun champ trouvé : le découpage est cassé').toBeGreaterThan(10);
    const fautifs = balises
      .filter(([, b]) => !/type="(range|checkbox|radio|hidden)"/.test(b))
      .filter(([, b]) => !/className=(?:"[^"]*\bchamp\b|\{`[^`]*\bchamp\b)/.test(b))
      .map(([f]) => f);
    expect(fautifs, 'utiliser la classe .champ').toEqual([]);
  });
  it('aucun libellé gris illisible', () => {
    // Retour utilisateur : « les écritures en gris ne sont pas bien
    // lisibles ». Les étiquettes de section passent par `.etiquette`, et
    // aucun texte gris ne descend sous 12 px.
    const fautifs = classes.filter(([, c]) =>
      (/uppercase/.test(c) && /text-\(--color-encre-faible\)/.test(c) && /\btext-(xs|\[1[01]px\])\b/.test(c))
      || (/text-\(--color-encre-(faible|sec)\)/.test(c) && /text-\[(9|10|11)px\]/.test(c)),
    );
    expect(fautifs.map(([f, c]) => `${f} : ${c}`)).toEqual([]);
  });
});
