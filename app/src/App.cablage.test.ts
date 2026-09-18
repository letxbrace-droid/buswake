import { describe, it, expect } from 'vitest';
import sourceApp from './App.tsx?raw';

/**
 * LE DÉFAUT QUI A COÛTÉ LE PLUS CHER, et le seul contrôle qui l'aurait vu.
 *
 * Le shell passait aux écrans des données de DÉMONSTRATION :
 *
 *     <Equipes equipes={equipesDemo} />
 *     {amisDemo && <Amis ... />}
 *
 * Ces variables ne sont remplies que sous `import.meta.env.DEV`. En
 * production `equipesDemo` valait `[]` et `amisDemo` valait `null` : l'écran
 * Équipes affichait « Aucune équipe » quoi qu'il y ait en base, et l'onglet
 * Joueurs ne rendait RIEN — écran noir.
 *
 * Et c'était invisible partout où on regardait. En développement les écrans
 * étaient parfaits. Le harnais mesurait le développement. Le site construit
 * se mesure déconnecté, donc toutes les routes renvoient à l'accueil : aucune
 * sonde ne pouvait voir ces écrans-là en production.
 *
 * Il restait donc une vérification STRUCTURELLE : le shell n'a pas le droit
 * de donner de la donnée de démonstration à un écran. Les écrans la
 * reçoivent d'un conteneur, qui la lit ; le développement s'amorce par le
 * cache de ce conteneur (`client.setQueryData`), pas à côté de lui.
 */
describe('câblage du shell', () => {
  it('ne passe aucune donnée de démonstration en propriété JSX', () => {
    // `nom={...Demo...}` — une propriété alimentée par une variable de démo.
    const fautes = [...sourceApp.matchAll(/(\w+)=\{[^}]*Demo[^}]*\}/g)].map((m) => m[0]);
    expect(fautes).toEqual([]);
  });

  it('ne rend aucun écran sous condition d’une donnée de démonstration', () => {
    // `{amisDemo && <Amis .../>}` — la route ne rend rien hors développement.
    expect(sourceApp).not.toMatch(/\{\s*\w*Demo\s*&&/);
  });

  it('ne code en dur aucun identifiant de joueur', () => {
    // `uid="u1"` était passé à NEUF écrans. Les lectures visaient donc un
    // autre compte que celui connecté, et les écritures étaient refusées par
    // les règles Firestore : `createur == request.auth.uid` ne tenait pas.
    expect(sourceApp).not.toMatch(/uid=["']u1["']/);
  });

  // La démo ne doit exister que dans la branche éliminée à la compilation.
  //
  // On vise `await import('./demo')` — le chargement RÉEL — et pas
  // `typeof import('./demo')`, qui n'est qu'un type et disparaît à la
  // compilation. Un premier jet cherchait la chaîne n'importe où et tombait
  // sur l'alias de type en tête de fichier : il échouait sur du code
  // parfaitement correct.
  it('ne charge la démo que sous import.meta.env.DEV', () => {
    const chargements = [...sourceApp.matchAll(/await import\(['"]\.\/demo['"]\)/g)];
    expect(chargements.length).toBeGreaterThan(0);
    for (const c of chargements) {
      const avant = sourceApp.slice(0, c.index);
      const garde = avant.lastIndexOf('if (import.meta.env.DEV)');
      // La garde doit être ouverte juste avant, et pas refermée entre-temps.
      expect(garde, 'chargement de la démo hors de la garde DEV').toBeGreaterThan(-1);
      expect(avant.slice(garde)).not.toMatch(/\n\}/);
    }
  });
});
