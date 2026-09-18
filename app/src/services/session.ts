import { useEffect, useState } from 'react';

export interface Session {
  readonly uid: string | null;
  /** Comment ce compte se connecte : 'password', 'google.com'… C'est ce qui
   *  décide si « changer mon mot de passe » a un sens. Figé en
   *  développement, où Firebase n'est pas joignable. */
  readonly fournisseurs: readonly string[];
  /** Vrai tant qu'on ne SAIT pas encore. C'est la distinction qui compte :
   *  « pas encore chargé » n'est pas « déconnecté ». Les confondre fait
   *  clignoter l'écran de connexion devant quelqu'un qui est connecté. */
  readonly enAttente: boolean;
}

export function useSession(): Session {
  const [session, setSession] = useState<Session>({
    uid: null, fournisseurs: [], enAttente: true,
  });

  useEffect(() => {
    // En développement, la session est simulée : le conteneur n'atteint pas
    // Firebase, et sans cela tous les écrans renverraient vers la connexion.
    // `import.meta.env.DEV` est une constante à la compilation — ce bloc
    // n'existe pas dans le bundle de production.
    if (import.meta.env.DEV) {
      setSession({ uid: 'u1', fournisseurs: ['password'], enAttente: false });
      return;
    }
    // IMPORT DYNAMIQUE, et ce n'est pas un détail de style : importer
    // ./auth en tête de module fait entrer tout Firebase dans le chunk
    // d'entrée. Mesuré : la première peinture passait de 136 à 326 Ko, soit
    // 150 Ko de Firebase téléchargés avant que le premier pixel s'affiche.
    // Ici il part en parallèle du rendu, et la session se résout ensuite —
    // ce qu'elle faisait de toute façon, puisqu'elle est asynchrone.
    let couper: (() => void) | undefined;
    let annule = false;
    import('./auth').then(({ surSession }) => {
      if (annule) return;
      couper = surSession((u) =>
        setSession({
          uid: u?.uid ?? null,
          fournisseurs: u?.providerData.map((p) => p.providerId) ?? [],
          enAttente: false,
        }),
      );
    });
    return () => {
      annule = true;
      couper?.();
    };
  }, []);

  return session;
}
