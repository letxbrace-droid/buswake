import { useCallback, useEffect, useState } from 'react';
import type { EtatPush } from '../domaine/push';

/**
 * L'état des notifications, et les deux choses qu'on en fait.
 *
 * TOUS les accès à `./push` sont DYNAMIQUES. Ce module est monté à la racine
 * de l'app ; l'importer en tête ferait entrer Firestore et le SDK Messaging
 * dans le chunk de première peinture, pour une fonctionnalité qu'on ne touche
 * qu'en ouvrant les réglages ou en recevant un message.
 */
export function usePush(uid: string | null, montrer: (titre: string, corps: string) => void) {
  const [etat, setEtat] = useState<EtatPush>('indisponible');
  const [enCours, setEnCours] = useState(false);

  // L'état de départ, sans rien demander à personne.
  useEffect(() => {
    let vivant = true;
    import('./push').then(({ lireEtatPush }) =>
      lireEtatPush().then((e) => {
        if (vivant) setEtat(e);
      }),
    );
    return () => {
      vivant = false;
    };
  }, []);

  // Les jetons FCM expirent. Sans ce rafraîchissement à la connexion, les
  // notifications s'éteignent d'elles-mêmes au bout de quelques semaines —
  // sans erreur, sans message : le joueur croit simplement qu'elles ne
  // marchent pas.
  useEffect(() => {
    if (!uid) return;
    import('./push').then(({ rafraichirJeton }) => rafraichirJeton(uid));
  }, [uid]);

  // Messages reçus app OUVERTE : le système n'affiche rien dans ce cas, donc
  // sans ça le joueur ne verrait rien passer pendant qu'il s'en sert.
  useEffect(() => {
    if (!uid) return;
    let couper: (() => void) | undefined;
    let annule = false;
    import('./push').then(({ ecouterAuPremierPlan }) =>
      ecouterAuPremierPlan(montrer).then((c) => {
        if (annule) c();
        else couper = c;
      }),
    );
    return () => {
      annule = true;
      couper?.();
    };
  }, [uid, montrer]);

  const activer = useCallback(async () => {
    if (!uid || enCours) return;
    setEnCours(true);
    try {
      const { activerPush } = await import('./push');
      const e = await activerPush(uid);
      setEtat(e);
      if (e === 'actif') montrer('Notifications activées', '');
      else if (e === 'refuse') montrer('Notifications refusées', '');
    } catch {
      // Une notification est un bonus : quand elle échoue, on le dit, et
      // l'app continue. Jamais d'écran cassé pour ça.
      montrer('Impossible d’activer les notifications', '');
    } finally {
      setEnCours(false);
    }
  }, [uid, enCours, montrer]);

  return { etat, enCours, activer };
}
