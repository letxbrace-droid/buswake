import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Accueil } from '../ecrans/Accueil';
import { usePreferences } from '../services/preferences';
import { useAction } from '../services/useAction';
import { terrainsDansLeRayon, vedette } from '../domaine/accueil';
import type { Position } from '../domaine/rayon';

/** L'accueil lit le MÊME fil que l'écran Matchs — même clé de cache, donc
 *  une seule lecture pour les deux, et surtout pas deux vérités. */
export function AccueilBranche({
  uid, pseudo, xp, domicile,
}: {
  uid: string | null;
  pseudo: string;
  xp: number;
  domicile: Position | null;
}) {
  const aller = useNavigate();
  const km = usePreferences((s) => s.km);

  const { data } = useQuery({
    queryKey: ['fil', uid],
    queryFn: async () => (await import('../services/fil')).filDeMatchs(uid),
  });

  const enTete = useMemo(() => vedette(data ?? [], uid, km, domicile), [data, uid, km, domicile]);
  const terrains = useMemo(() => terrainsDansLeRayon(domicile, km), [domicile, km]);

  const rejoindre = useAction(
    async (id: string) => {
      const { rejoindreMatch } = await import('../services/cycle');
      return rejoindreMatch(id, uid ?? '');
    },
    {
      invalider: [['fil', uid]],
      // On ouvre le match : le joueur vient de s'y inscrire, c'est là qu'il
      // va vouloir voter le créneau.
      apres: () => enTete && aller(`/match/${enTete.match.id}`),
    },
  );

  return (
    <Accueil
      pseudo={pseudo}
      xp={xp}
      vedette={enTete}
      terrains={terrains}
      km={km}
      actions={{
        onProfil: () => aller('/profil'),
        onOuvrirMatch: (id) => aller(`/match/${id}`),
        onRejoindre: rejoindre.lancer,
        onProposer: () => aller('/creer'),
        onRang: () => aller('/classement'),
        onTerrains: () => aller('/terrains'),
      }}
    />
  );
}
