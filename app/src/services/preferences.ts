import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RAYON_DEFAUT, RAYONS, type Rayon } from '../domaine/rayon';

interface Preferences {
  km: Rayon;
  setKm: (km: Rayon) => void;
}

/** Préférences locales au téléphone — jamais dans Firestore.
 *  Zustand « avec parcimonie », comme recommandé : un seul store, pour ce qui
 *  n'est ni de l'état serveur (TanStack Query) ni de l'état d'un composant. */
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      km: RAYON_DEFAUT,
      setKm: (km) => set({ km: RAYONS.includes(km) ? km : RAYON_DEFAUT }),
    }),
    { name: 'kolektif.preferences' },
  ),
);
