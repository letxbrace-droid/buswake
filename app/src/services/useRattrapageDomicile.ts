import { useEffect, useRef } from 'react';
import { domicileAManquer } from '../domaine/localisation';
import type { Utilisateur } from '../domaine/schemas';

/**
 * RATTRAPE LES COMPTES SANS DOMICILE, sans rien leur demander.
 *
 * Tous les comptes créés par la v2 jusqu'ici ont un code postal et pas de
 * position : l'inscription demandait l'un et n'écrivait jamais l'autre. À la
 * première ouverture après cette version, on géocode leur code postal et on
 * écrit la position — une fois.
 *
 * « Une fois » est tenu par une garde de session : si le géocodage échoue
 * (hors ligne, API indisponible), on ne réessaie pas à chaque rendu — on
 * réessaiera à la prochaine ouverture de l'app. Sans cette garde, un échec
 * relancerait la requête à chaque mise à jour du profil en temps réel.
 *
 * La garde porte sur le COUPLE joueur + code postal, pas sur le joueur seul.
 * Posée sur le joueur, elle empêchait de re-géocoder quelqu'un qui change de
 * code postal dans la même session : son ancienne position effacée, la
 * nouvelle jamais calculée.
 */
export function useRattrapageDomicile(uid: string | null, profil: Utilisateur | null) {
  const tente = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !profil || import.meta.env.DEV) return;
    if (!domicileAManquer(profil)) return;
    const cle = `${uid}:${profil.codePostal}`;
    if (tente.current === cle) return;
    tente.current = cle;

    (async () => {
      const { geocoderCodePostal } = await import('./localisation');
      const l = await geocoderCodePostal(profil.codePostal);
      if (!l) return;
      const { majProfil } = await import('./profil');
      await majProfil(uid, { domicileLat: l.position.lat, domicileLon: l.position.lon }).catch(() => {});
    })();
  }, [uid, profil]);
}
