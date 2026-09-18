import { describe, it, expect, beforeEach } from 'vitest';
import sourceWorker from '../../public/push.js?raw';
import { lireNotification } from './push';

/**
 * `public/push.js` tourne dans un SERVICE WORKER : pas de modules, donc pas
 * d'import du domaine. Il réimplémente donc à la main la lecture du payload
 * et la route d'un clic — la même duplication que le barème XP entre le
 * client et les Cloud Functions, avec le même risque : les deux dérivent, et
 * rien ne le dit.
 *
 * Ce fichier l'exécute avec des bouchons, exactement comme `functions.mjs`
 * exécute les fonctions serveur. C'est la seule façon d'éprouver l'endroit
 * où mène un tap sans avoir un téléphone sous la main — et c'est le point le
 * plus facile à casser sans que ça se voie : une notification qui ouvre
 * l'app a l'air de marcher.
 */

interface Affichee {
  titre: string;
  options: Record<string, unknown>;
}

interface Bac {
  surMessage: (p: unknown) => void;
  surClic: (e: unknown) => Promise<void>;
  affichees: Affichee[];
  ouvertes: string[];
  naviguees: string[];
  focus: number;
}

/** Monte le worker dans un bac à sable et rend de quoi le piloter. */
function monter(fenetres: Array<Record<string, unknown>> = []): Bac {
  const affichees: Affichee[] = [];
  const ouvertes: string[] = [];
  const naviguees: string[] = [];
  let focus = 0;
  let surMessage: (p: unknown) => void = () => {};
  let surClic: (e: unknown) => unknown = () => {};

  const self_ = {
    registration: {
      showNotification: (titre: string, options: Record<string, unknown>) =>
        affichees.push({ titre, options }),
    },
    addEventListener: (nom: string, f: (e: unknown) => unknown) => {
      if (nom === 'notificationclick') surClic = f;
    },
  };

  const firebase = {
    initializeApp: () => {},
    messaging: () => ({
      onBackgroundMessage: (f: (p: unknown) => void) => {
        surMessage = f;
      },
    }),
  };

  // `navigate()` résout vers un WindowClient — donc vers un objet qui a
  // `focus`. Un bouchon qui rend l'objet nu fait échouer le code pour une
  // raison qui n'existe pas dans un vrai navigateur.
  const clients = {
    matchAll: async () =>
      fenetres.map((f) => {
        const client: Record<string, unknown> = { ...f };
        client.focus = () => {
          focus++;
          return client;
        };
        client.navigate = async (u: string) => {
          naviguees.push(u);
          return client;
        };
        return client;
      }),
    openWindow: async (u: string) => {
      ouvertes.push(u);
    },
  };

  // `importScripts` ne fait rien : les SDK sont bouchonnés. Dans le vrai
  // worker il va chercher gstatic, et le try/catch du fichier couvre son
  // échec — c'est ce qui se passe ici aussi, sauf qu'on n'échoue pas.
  const importScripts = () => {};

  const executer = new Function(
    'self', 'firebase', 'clients', 'importScripts',
    `${sourceWorker}\n//# sourceURL=push.js`,
  );
  executer(self_, firebase, clients, importScripts);

  // Un attendu du code : attendre la promesse que le worker passe à
  // `waitUntil`, sinon on mesure avant que quoi que ce soit se produise.
  const clic = async (e: { notification: Record<string, unknown> }) => {
    let promesse: unknown = null;
    surClic({ ...e, waitUntil: (p: unknown) => (promesse = p) });
    await promesse;
  };

  return {
    surMessage,
    surClic: clic,
    affichees,
    ouvertes,
    naviguees,
    get focus() {
      return focus;
    },
  } as Bac;
}

const notif = (data: Record<string, unknown>) => ({
  notification: { close: () => {}, data },
});

describe('push.js — affichage en arrière-plan', () => {
  let bac: Bac;
  beforeEach(() => {
    bac = monter();
  });

  it('affiche le titre et le corps envoyés par les Cloud Functions', () => {
    bac.surMessage({ data: { title: 'C’est calé ✅', body: 'Mardi 19h', matchId: 'm1' } });
    expect(bac.affichees).toHaveLength(1);
    expect(bac.affichees[0].titre).toBe('C’est calé ✅');
    expect(bac.affichees[0].options.body).toBe('Mardi 19h');
  });

  // Le worker et le domaine lisent le MÊME payload, chacun de son côté.
  // C'est cette égalité-là qui doit tenir dans le temps.
  it('lit le payload comme `lireNotification` du domaine', () => {
    for (const d of [
      { title: 'A', body: 'B', matchId: 'm1' },
      { title: '  ', matchId: '  ' },
      { matchId: 'm2' },
      {},
    ]) {
      bac = monter();
      bac.surMessage({ data: d });
      const attendu = lireNotification(d);
      expect(bac.affichees[0].titre).toBe(attendu.titre);
      expect(bac.affichees[0].options.body).toBe(attendu.corps);
    }
  });

  it('retombe sur « Kolektif » plutôt que sur rien', () => {
    bac.surMessage({ data: {} });
    bac.surMessage({});
    bac.surMessage(null);
    expect(bac.affichees.map((a) => a.titre)).toEqual(['Kolektif', 'Kolektif', 'Kolektif']);
  });

  // Trois relances sur le même sondage ne doivent pas empiler trois
  // bannières : la deuxième remplace la première.
  it('groupe les notifications par match', () => {
    bac.surMessage({ data: { title: 'A', matchId: 'm1' } });
    bac.surMessage({ data: { title: 'B', matchId: 'm1' } });
    bac.surMessage({ data: { title: 'C' } });
    expect(bac.affichees.map((a) => a.options.tag)).toEqual(['match-m1', 'match-m1', 'kolektif']);
  });
});

describe('push.js — où mène le tap', () => {
  // LE POINT CRITIQUE. La v1 ouvrait `#j=<id>` ; ici le routeur attend
  // `#/match/<id>`. Envoyer l'ancien format ouvrirait l'accueil — la
  // notification aurait l'air de marcher et n'amènerait nulle part.
  it('ouvre LE match, à la route de la v2', async () => {
    const bac = monter();
    await bac.surClic(notif({ matchId: 'm1' }));
    expect(bac.ouvertes).toEqual(['./#/match/m1']);
  });

  // Écrit sur le COMPORTEMENT, pas sur la source. Un premier jet cherchait
  // `#j=` dans le fichier entier et échouait sur le commentaire qui explique
  // justement l'ancien format — la même erreur que de chercher une chaîne
  // n'importe où au lieu de l'endroit qui compte.
  it('n’utilise jamais l’ancien format `#j=`', async () => {
    for (const id of ['m1', 'abc', 'Z_9-x']) {
      const bac = monter();
      await bac.surClic(notif({ matchId: id }));
      expect(bac.ouvertes[0]).toBe(`./#/match/${id}`);
    }
  });

  it('ouvre l’accueil quand la notification ne vise aucun match', async () => {
    const bac = monter();
    await bac.surClic(notif({}));
    expect(bac.ouvertes).toEqual(['./#/']);
  });

  // Une app déjà ouverte se DÉPLACE. Sans ça, le tap ouvre un second
  // onglet par-dessus celui qu'on avait déjà.
  it('déplace une fenêtre déjà ouverte au lieu d’en ouvrir une seconde', async () => {
    const bac = monter([{ url: 'http://x/buswake/#/matchs' }]);
    await bac.surClic(notif({ matchId: 'm1' }));
    expect(bac.naviguees).toEqual(['./#/match/m1']);
    expect(bac.ouvertes).toEqual([]);
    expect(bac.focus).toBe(1);
  });

  it('se contente de revenir à l’app quand il n’y a pas de match à ouvrir', async () => {
    const bac = monter([{ url: 'http://x/buswake/#/' }]);
    await bac.surClic(notif({}));
    expect(bac.naviguees).toEqual([]);
    expect(bac.focus).toBe(1);
  });
});
