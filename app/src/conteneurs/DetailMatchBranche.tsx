import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { DetailMatch } from '../ecrans/DetailMatch';
import { Plaque } from '../composants/Plaque';
import { useAction } from '../services/useAction';
import * as cycle from '../services/cycle';
import { lireMatch, type Match } from '../domaine/schemas';
import type { Votes } from '../domaine/cycle';

/** Le conteneur : il lit, il appelle, il rafraîchit. L'écran, lui, ne sait
 *  rien de Firestore — c'est ce qui permet de le mesurer avec des fixtures et
 *  de le tester sans réseau. */
export function DetailMatchBranche({ uid }: { uid: string }) {
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

  const annuler = useAction(() => cycle.annuler(id), {
    succes: () => 'Match annulé. L’XP déjà distribuée est reprise.',
    invalider: rafraichir,
  });

  const occupe =
    voter.occupe || rejoindre.occupe || quitter.occupe || confirmer.occupe || annuler.occupe;

  if (isPending) return <Attente />;
  if (isError || !data) return <Introuvable />;

  return (
    <DetailMatch
      m={data.m}
      votes={data.votes}
      uid={uid}
      occupe={occupe}
      actions={{
        onVoter: voter.lancer,
        onRejoindre: rejoindre.lancer,
        onQuitter: quitter.lancer,
        onConfirmer: confirmer.lancer,
        onAnnuler: annuler.lancer,
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
