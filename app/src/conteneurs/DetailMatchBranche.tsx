import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { DetailMatch } from '../ecrans/DetailMatch';
import { Plaque } from '../composants/Plaque';
import { useAction } from '../services/useAction';
import { usePseudos } from '../services/usePseudos';
import * as cycle from '../services/cycle';
import { lireMatch, type Match } from '../domaine/schemas';
import type { Votes } from '../domaine/cycle';
import { useNavigate } from 'react-router-dom';

/** Le conteneur : il lit, il appelle, il rafraîchit. L'écran, lui, ne sait
 *  rien de Firestore — c'est ce qui permet de le mesurer avec des fixtures et
 *  de le tester sans réseau. */
export function DetailMatchBranche({ uid }: { uid: string }) {
  const aller = useNavigate();
  const { id = '' } = useParams();

  const { data, isPending, isError } = useQuery({
    queryKey: ['match', id],
    queryFn: async (): Promise<{ m: Match; votes: Votes } | null> => {
      const snap = await getDoc(doc(db, 'matchs', id));
      if (!snap.exists()) return null;
      const m = lireMatch(id, snap.data());
      return m ? { m, votes: (snap.data().votes ?? {}) as Votes } : null;
    },
  });

  const rafraichir = [['match', id], ['fil', uid]] as const;
  const pseudos = usePseudos(data?.m.joueursInscrits ?? []);

  const voter = useAction((i: number) => cycle.voter(id, i, uid), {
    succes: (aVote) => (aVote ? 'Vote enregistré — 10 XP en route.' : 'Vote retiré.'),
    invalider: rafraichir,
  });

  const rejoindre = useAction(() => cycle.rejoindreMatch(id, uid), {
    succes: (r) =>
      r.place === 'titulaire'
        ? 'Tu es sur le terrain.'
        : 'Match plein — tu es sur le banc, prêt à entrer.',
    invalider: rafraichir,
  });

  const quitter = useAction(() => cycle.quitterMatch(id, uid), {
    // On dit qu'un remplaçant entre : sans ça, le créateur croit son match
    // tombé à neuf alors qu'il est toujours complet.
    succes: (r) =>
      r.promu ? 'Tu laisses ta place — un remplaçant entre.' : 'Tu ne joues plus ce match.',
    invalider: rafraichir,
  });

  const confirmer = useAction((i: number) => cycle.confirmer(id, i), {
    succes: () => 'Match confirmé. À vous de jouer.',
    invalider: rafraichir,
  });

  const supprimer = useAction(() => cycle.supprimer(id), {
    succes: () => 'Match supprimé. L’XP déjà distribuée est reprise.',
    invalider: [['fil', uid]],
    // Le match n'existe plus : rester sur sa page afficherait « introuvable ».
    apres: () => aller('/matchs', { replace: true }),
  });

  /**
   * PARTAGER. `navigator.share` ouvre la feuille de partage du système —
   * c'est ce qui met le lien dans la bonne conversation en un geste. Il
   * n'existe pas partout (bureau, navigateurs anciens) et l'utilisateur peut
   * l'annuler : on retombe alors sur le presse-papier, et on le DIT, sinon
   * l'appui a l'air d'avoir échoué.
   */
  const partager = useAction(
    async () => {
      const { invitation, lienDuMatch } = await import('../domaine/partage');
      const { nomDuLieu } = await import('../domaine/terrainDuMatch');
      const m = data?.m;
      if (!m) return 'rien';
      const lien = lienDuMatch(window.location.origin, window.location.pathname, m.id);
      const manque = Math.max(0, (m.joueursMax ?? 10) - (m.joueursInscrits ?? []).length);
      const inv = invitation(lien, nomDuLieu(m), '', manque);

      if (navigator.share) {
        // Une annulation par l'utilisateur lève aussi : on ne la traite pas
        // comme une panne, on ne dit simplement rien.
        try {
          await navigator.share({ title: inv.titre, text: inv.texte, url: inv.lien });
          return 'partage';
        } catch {
          return 'annule';
        }
      }
      await navigator.clipboard.writeText(`${inv.texte} ${inv.lien}`);
      return 'copie';
    },
    {
      succes: (r) =>
        r === 'copie' ? 'Lien copié — colle-le dans ta conversation.' : '',
    },
  );

  const occupe =
    voter.occupe || rejoindre.occupe || quitter.occupe || confirmer.occupe || supprimer.occupe;

  if (isPending) return <Attente />;
  if (isError || !data) return <Introuvable />;

  return (
    <DetailMatch
      m={data.m}
      votes={data.votes}
      uid={uid}
      occupe={occupe}
      pseudos={pseudos}
      actions={{
        onVoter: voter.lancer,
        onRejoindre: rejoindre.lancer,
        onQuitter: quitter.lancer,
        onConfirmer: confirmer.lancer,
        onSupprimer: supprimer.lancer,
        onPartager: partager.lancer,
      }}
    />
  );
}

function Attente() {
  return (
    <div className="terrain terrain-matchs min-h-full px-4 pt-6">
      <Plaque variante="heros" className="h-48 animate-pulse opacity-60" />
    </div>
  );
}

function Introuvable() {
  return (
    <div className="terrain terrain-matchs min-h-full px-4 pt-6">
      <Plaque className="p-8 text-center">
        <p className="font-[family-name:var(--font-titre)] text-xl">Match introuvable</p>
        <p className="mt-2 text-sm text-(--color-encre-sec)">
          Il a peut-être été annulé, ou le lien a expiré.
        </p>
      </Plaque>
    </div>
  );
}
