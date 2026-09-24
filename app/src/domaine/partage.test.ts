import { describe, it, expect } from 'vitest';
import { invitation, lienDuMatch } from './partage';

describe('lienDuMatch', () => {
  // Le lien doit marcher collé dans une conversation, chez quelqu'un qui
  // n'a pas l'app : un `#/match/x` seul ne mène nulle part.
  it('produit une URL absolue, sous-répertoire compris', () => {
    expect(lienDuMatch('https://x.github.io', '/buswake/', 'm1'))
      .toBe('https://x.github.io/buswake/#/match/m1');
  });

  it('marche à la racine d’un domaine', () => {
    expect(lienDuMatch('https://kolektif.app', '/', 'm1'))
      .toBe('https://kolektif.app/#/match/m1');
  });

  it('retire index.html quand le serveur l’expose', () => {
    expect(lienDuMatch('https://x.io', '/buswake/index.html', 'm1'))
      .toBe('https://x.io/buswake/#/match/m1');
  });

  // On ne fabrique plus de `#j=` : c'est l'ancien format, traduit au
  // démarrage pour les liens qui circulent encore, mais pas reconduit.
  it('emploie la route de la v2', () => {
    expect(lienDuMatch('https://x.io', '/', 'm1')).not.toContain('#j=');
  });
});

describe('invitation', () => {
  // Un lien nu dans une conversation ne donne aucune raison de l'ouvrir.
  it('dit ce qui manque, où et quand', () => {
    const i = invitation('L', 'LE FIVE Massy', 'jeudi 19h', 3);
    expect(i.texte).toBe('Il manque 3 joueurs au LE FIVE Massy — jeudi 19h.');
    expect(i.lien).toBe('L');
  });

  it('accorde le singulier', () => {
    expect(invitation('L', 'X', 'j', 1).texte).toContain('Il manque 1 joueur au');
    expect(invitation('L', 'X', 'j', 1).texte).not.toContain('joueurs');
  });

  it('ne réclame personne quand le match est complet', () => {
    expect(invitation('L', 'X', 'j', 0).texte).toContain('On est au complet');
  });

  it('se passe du lieu et de l’heure quand on ne les a pas', () => {
    expect(invitation('L', '', '', 2).texte).toBe('Il manque 2 joueurs.');
  });
});
