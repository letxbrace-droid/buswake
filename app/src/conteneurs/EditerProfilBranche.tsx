import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditerProfil } from '../ecrans/EditerProfil';
import { useAction } from '../services/useAction';
import { useToast } from '../composants/Toasts';
import { differences, type Edition } from '../domaine/editionProfil';
import { ATOUT_DEFAUT, type Atouts } from '../domaine/joueur';
import type { Utilisateur } from '../domaine/schemas';

export function EditerProfilBranche({
  uid, profil, email,
}: {
  uid: string;
  profil: Utilisateur;
  email: string | null;
}) {
  const aller = useNavigate();
  const toast = useToast();
  const [placement, setPlacement] = useState<string | null>(null);
  const [enLocalisation, setEnLocalisation] = useState(false);

  const a = profil.atouts ?? {};
  const initial: Edition = {
    pseudo: profil.pseudo,
    poste: profil.posteFavori,
    atouts: {
      vitesse: a.vitesse ?? ATOUT_DEFAUT, dribble: a.dribble ?? ATOUT_DEFAUT,
      frappe: a.frappe ?? ATOUT_DEFAUT, defense: a.defense ?? ATOUT_DEFAUT,
      physique: a.physique ?? ATOUT_DEFAUT,
    } as Atouts,
    codePostal: profil.codePostal ?? '',
  };

  // Où l'app place le joueur AUJOURD'HUI. Sans position, on ne prétend pas
  // qu'elle est à Massy : on dit qu'on ne sait pas.
  const lieu =
    placement ??
    (profil.domicileLat != null
      ? profil.codePostal ? `ton code postal ${profil.codePostal}` : 'ta position approximative'
      : null);

  const enregistrer = useAction(
    async (e: Edition) => {
      const d = differences(initial, e);
      // Nouveau code postal : on géocode TOUT DE SUITE, pour pouvoir dire au
      // joueur où on l'a placé. Si ça échoue (hors ligne), la position reste
      // vide et le rattrapage la recalculera à la prochaine ouverture.
      if (typeof d.codePostal === 'string') {
        const { geocoderCodePostal } = await import('../services/localisation');
        const l = await geocoderCodePostal(d.codePostal);
        if (l) {
          d.domicileLat = l.position.lat;
          d.domicileLon = l.position.lon;
          setPlacement(l.libelle);
        }
      }
      if (!Object.keys(d).length) return 'rien';
      const { majProfil } = await import('../services/profil');
      await majProfil(uid, d as Parameters<typeof majProfil>[1]);
      return 'ok';
    },
    {
      succes: (r) => (r === 'rien' ? 'Rien n’a changé.' : 'Carte enregistrée.'),
      apres: () => aller('/profil', { replace: true }),
    },
  );

  const localiser = async () => {
    setEnLocalisation(true);
    try {
      const { maPosition } = await import('../services/localisation');
      const r = await maPosition();
      if (!r.ok) {
        toast(
          r.raison === 'refus'
            ? 'Localisation refusée — tu peux utiliser ton code postal.'
            : 'Position indisponible — utilise ton code postal.',
          'erreur',
        );
        return;
      }
      const { majProfil } = await import('../services/profil');
      await majProfil(uid, { domicileLat: r.lat, domicileLon: r.lon });
      setPlacement('ta position approximative');
      toast('Position enregistrée, arrondie à environ 2 km.', 'succes');
    } catch {
      toast('Impossible d’enregistrer la position.', 'erreur');
    } finally {
      setEnLocalisation(false);
    }
  };

  return (
    <EditerProfil
      initial={initial}
      email={email}
      lieu={lieu}
      occupe={enregistrer.occupe}
      localisationEnCours={enLocalisation}
      actions={{
        onEnregistrer: enregistrer.lancer,
        onMaPosition: () => void localiser(),
        onAnnuler: () => aller('/profil'),
      }}
    />
  );
}
