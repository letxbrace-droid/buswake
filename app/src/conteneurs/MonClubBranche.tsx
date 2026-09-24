import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MonClub } from '../ecrans/MonClub';
import { useAction } from '../services/useAction';
import { bilanDuClub, membresDuClub, monClub, type FicheMembre } from '../domaine/club';
import { classerEquipes } from '../domaine/classement';

export function MonClubBranche({ uid }: { uid: string | null }) {
  const aller = useNavigate();

  const { data: equipes } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => (await import('../services/annuaire')).listerEquipes(),
  });
  const toutes = useMemo(() => equipes ?? [], [equipes]);
  const club = useMemo(() => monClub(toutes, uid), [toutes, uid]);

  // Les fiches des membres — pseudo, poste ET note. La note vient de
  // `noteSum`/`noteCount`, qui n'étaient pas déclarés au schéma : elle était
  // donc incalculable alors que toute la donnée était en base.
  const { data: fiches } = useQuery({
    queryKey: ['fiches-club', club?.id ?? '', (club?.membres ?? []).join(',')],
    enabled: !!club?.membres?.length,
    staleTime: 60_000,
    queryFn: async () =>
      (await import('../services/annuaire')).lireFichesCompletes(club?.membres ?? []),
  });

  const membres = useMemo(
    () => (club ? membresDuClub(club, (fiches ?? {}) as Record<string, FicheMembre>) : []),
    [club, fiches],
  );
  const bilan = useMemo(() => (club ? bilanDuClub(club, toutes) : null), [club, toutes]);
  const classement = useMemo(() => classerEquipes(toutes), [toutes]);

  /** On ne peut pas inscrire quelqu'un d'autre : les règles n'autorisent qu'à
   *  s'ajouter soi-même. On partage donc un lien vers les équipes. */
  const inviter = useAction(
    async () => {
      if (!club) return 'rien';
      const { lienDuClub } = await import('../domaine/partage');
      const lien = lienDuClub(window.location.origin, window.location.pathname);
      const texte = `Rejoins ${club.nom} sur Kolektif.`;
      if (navigator.share) {
        try {
          await navigator.share({ title: club.nom, text: texte, url: lien });
          return 'partage';
        } catch {
          return 'annule';
        }
      }
      await navigator.clipboard.writeText(`${texte} ${lien}`);
      return 'copie';
    },
    { succes: (r) => (r === 'copie' ? 'Lien copié — colle-le dans ta conversation.' : '') },
  );

  return (
    <MonClub
      club={club}
      membres={membres}
      bilan={bilan}
      classement={classement}
      monUid={uid}
      actions={{
        onInviter: inviter.lancer,
        onVoirEquipes: () => aller('/equipes'),
        onCreer: () => aller('/equipes'),
      }}
    />
  );
}
