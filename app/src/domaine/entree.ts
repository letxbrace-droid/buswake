import { destinationSure } from './push';

/**
 * QUI VA OÙ À L'ENTRÉE.
 *
 * Cette décision vivait dans une suite de `if` au milieu du composant racine,
 * et elle y était intestable : il fallait monter React, Firebase et six
 * écrans chargés à la demande pour savoir si un lien survivait à une
 * connexion. Elle ne l'était donc pas — et elle était fausse.
 *
 * Le défaut : un joueur qui reçoit une notification alors qu'il est
 * déconnecté était renvoyé à la connexion, puis à l'accueil. Le match était
 * perdu, et c'était tout l'intérêt de la notification. Idem pour un lien
 * d'invitation partagé dans une conversation.
 */
export type Entree =
  /** On ne sait pas encore si quelqu'un est connecté. Ne rien montrer plutôt
   *  que de faire clignoter la connexion devant quelqu'un qui l'est déjà. */
  | { quoi: 'attendre' }
  | { quoi: 'rediriger'; vers: string; memoriser?: string | null }
  | { quoi: 'afficher' };

export interface Contexte {
  readonly uid: string | null;
  readonly enAttente: boolean;
  readonly chemin: string;
  /** Le premier lancement montre la promesse, pas un formulaire. */
  readonly accueilli: boolean;
  /** La destination retenue au moment où on a été renvoyé à l'entrée. */
  readonly destination: string | null;
  /** En développement la session est simulée connectée ; sans cette
   *  exception les écrans d'entrée deviendraient inatteignables, ni pour le
   *  travail visuel ni pour le harnais qui les mesure. */
  readonly dev: boolean;
}

const ECRANS_ENTREE = ['/connexion', '/bienvenue'];

export function ouAller(c: Contexte): Entree {
  if (c.enAttente) return { quoi: 'attendre' };

  const surEntree = ECRANS_ENTREE.includes(c.chemin);

  if (!c.uid) {
    // On retient d'où l'on vient — c'est la seule ligne qui sauve le lien.
    if (!surEntree) {
      return {
        quoi: 'rediriger',
        vers: c.accueilli ? '/connexion' : '/bienvenue',
        memoriser: destinationSure(c.chemin),
      };
    }
    // Le relais bienvenue → connexion doit repasser la destination, sinon
    // elle se perd sur ce saut-là et le défaut revient par la porte de côté.
    if (c.chemin === '/bienvenue' && c.accueilli) {
      return { quoi: 'rediriger', vers: '/connexion', memoriser: c.destination };
    }
    return { quoi: 'afficher' };
  }

  if (surEntree && !c.dev) {
    return { quoi: 'rediriger', vers: destinationSure(c.destination) ?? '/' };
  }
  return { quoi: 'afficher' };
}
