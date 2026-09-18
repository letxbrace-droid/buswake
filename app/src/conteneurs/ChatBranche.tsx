import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { Chat } from '../ecrans/Chat';
import { useAction } from '../services/useAction';
import { ecouterMessages, envoyerMessage } from '../services/chat';
import { chatOuvert } from '../domaine/chat';
import { lireMatch } from '../domaine/schemas';
import type { Message } from '../domaine/chat';
import { usePseudos } from '../services/usePseudos';

export function ChatBranche({ uid }: { uid: string }) {
  const { id = '' } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);

  // Écoute temps réel : un chat qui ne se met à jour qu'au rechargement n'est
  // pas un chat.
  useEffect(() => {
    if (!id) return;
    // Même convention que useSession et useProfil : en développement le
    // conteneur n'atteint pas Firestore, donc le fil serait toujours vide et
    // l'écran impossible à travailler. Éliminé du bundle de production.
    if (import.meta.env.DEV) {
      import('../demo').then((d) => setMessages(d.CHAT_DEMO.messages));
      return;
    }
    return ecouterMessages(id, setMessages);
  }, [id]);

  const { data: match } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'matchs', id));
      return snap.exists() ? lireMatch(id, snap.data()) : null;
    },
  });


  // Les pseudos se lisent ICI, où l'on connaît la liste des joueurs. Le
  // shell passait une table venue des données de démonstration : vide en
  // production, elle faisait afficher des identifiants bruts.
  const pseudos = usePseudos(match?.joueursInscrits ?? []);

  const envoyer = useAction((texte: string) => envoyerMessage(id, uid, texte));

  return (
    <Chat
      messages={messages}
      pseudos={pseudos}
      monUid={uid}
      ouvert={match ? chatOuvert(match) : true}
      onEnvoyer={envoyer.lancer}
    />
  );
}
