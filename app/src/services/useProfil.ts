import { useEffect, useState } from 'react';
import type { Utilisateur } from '../domaine/schemas';

export interface EtatProfil {
  readonly profil: Utilisateur | null;
  readonly enAttente: boolean;
}

/** Même précaution que pour la session : « pas encore chargé » n'est pas
 *  « pas de profil ». Les confondre affiche « 0 XP » une fraction de seconde
 *  à quelqu'un qui en a mille — et c'est le genre de clignotement qui fait
 *  croire à une perte de données. */
export function useProfil(uid: string | null, demo?: Utilisateur): EtatProfil {
  const [etat, setEtat] = useState<EtatProfil>({ profil: null, enAttente: true });

  useEffect(() => {
    if (!uid) {
      setEtat({ profil: null, enAttente: false });
      return;
    }
    if (import.meta.env.DEV && demo) {
      setEtat({ profil: demo, enAttente: false });
      return;
    }
    let couper: (() => void) | undefined;
    let annule = false;
    // Import dynamique : ce module importe Firestore, et le charger en tête
    // le ferait entrer dans le chunk d'entrée.
    import('./profil').then(({ ecouterProfil }) => {
      if (annule) return;
      couper = ecouterProfil(uid, (p) => setEtat({ profil: p, enAttente: false }));
    });
    return () => {
      annule = true;
      couper?.();
    };
  }, [uid, demo]);

  return etat;
}
