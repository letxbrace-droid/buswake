import { describe, it, expect } from 'vitest';
import { ouAller, type Contexte } from './entree';

/** Où mène cette décision ? `null` si elle ne redirige pas — l'assertion
 *  porte alors sur le fait qu'on n'a PAS redirigé, ce qui est aussi une
 *  réponse. */
const vers = (c: Contexte) => {
  const e = ouAller(c);
  return e.quoi === 'rediriger' ? e.vers : null;
};

const c = (p: Partial<Contexte> = {}): Contexte => ({
  uid: null, enAttente: false, chemin: '/', accueilli: true,
  destination: null, dev: false, ...p,
});

describe('ouAller', () => {
  it('attend tant qu’on ne sait pas', () => {
    expect(ouAller(c({ enAttente: true }))).toEqual({ quoi: 'attendre' });
    // Même connecté : on ne décide rien avant de savoir.
    expect(ouAller(c({ enAttente: true, uid: 'u1' }))).toEqual({ quoi: 'attendre' });
  });

  it('montre la promesse au tout premier lancement, le formulaire ensuite', () => {
    expect(vers(c({ accueilli: false }))).toBe('/bienvenue');
    expect(vers(c({ accueilli: true }))).toBe('/connexion');
  });

  it('laisse un visiteur sur les écrans d’entrée', () => {
    expect(ouAller(c({ chemin: '/connexion' }))).toEqual({ quoi: 'afficher' });
    expect(ouAller(c({ chemin: '/bienvenue', accueilli: false }))).toEqual({ quoi: 'afficher' });
  });

  it('laisse passer quelqu’un de connecté', () => {
    expect(ouAller(c({ uid: 'u1', chemin: '/matchs' }))).toEqual({ quoi: 'afficher' });
  });

  // LE DÉFAUT. Une notification reçue déconnecté menait au formulaire puis à
  // l'accueil : le match était perdu, et c'était tout l'intérêt de la notif.
  it('retient le match visé et y revient après la connexion', () => {
    const renvoi = ouAller(c({ chemin: '/match/m1' }));
    expect(renvoi).toEqual({ quoi: 'rediriger', vers: '/connexion', memoriser: '/match/m1' });

    const apres = ouAller(c({ uid: 'u1', chemin: '/connexion', destination: '/match/m1' }));
    expect(apres).toEqual({ quoi: 'rediriger', vers: '/match/m1' });
  });

  // La destination se perdait sur ce saut-là, et le défaut revenait par la
  // porte de côté pour qui n'avait pas encore vu l'écran d'accueil.
  it('repasse la destination sur le relais bienvenue → connexion', () => {
    expect(ouAller(c({ chemin: '/bienvenue', accueilli: true, destination: '/match/m1' })))
      .toEqual({ quoi: 'rediriger', vers: '/connexion', memoriser: '/match/m1' });
  });

  it('retombe sur l’accueil quand il n’y a rien à retenir', () => {
    expect(vers(c({ uid: 'u1', chemin: '/connexion' }))).toBe('/');
  });

  // Une destination venue du hash est une entrée non fiable : `//ailleurs`
  // est une URL absolue pour le navigateur, et l'écran de connexion
  // deviendrait un tremplin vers n'importe quel site.
  it('ne suit pas une destination qui sort du site', () => {
    expect(vers(c({ uid: 'u1', chemin: '/connexion', destination: '//ailleurs.example' }))).toBe('/');
    expect(vers(c({ uid: 'u1', chemin: '/connexion', destination: 'https://ailleurs.example' }))).toBe('/');
  });

  // Se souvenir de l'écran de connexion lui-même ferait boucler dessus.
  it('ne retient jamais un écran d’entrée', () => {
    expect(ouAller(c({ chemin: '/connexion' }))).toEqual({ quoi: 'afficher' });
    expect(vers(c({ uid: 'u1', chemin: '/connexion', destination: '/connexion' }))).toBe('/');
  });

  it('laisse atteindre les écrans d’entrée en développement', () => {
    expect(ouAller(c({ uid: 'u1', chemin: '/bienvenue', dev: true }))).toEqual({ quoi: 'afficher' });
    expect(ouAller(c({ uid: 'u1', chemin: '/bienvenue', dev: false })).quoi).toBe('rediriger');
  });
});
