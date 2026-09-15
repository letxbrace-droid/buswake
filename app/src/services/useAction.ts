import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../composants/Toasts';

interface Options<T> {
  /** Ce qu'on annonce quand ça marche. Reçoit le résultat, pour pouvoir dire
   *  ce qui s'est réellement passé plutôt qu'un « c'est fait » générique. */
  succes?: (r: T) => string;
  /** Les clés de cache à rafraîchir après l'écriture. */
  invalider?: readonly (readonly unknown[])[];
  apres?: (r: T) => void;
}

/** Enveloppe une écriture : état d'attente, message, rafraîchissement.
 *
 *  Deux garde-fous qui évitent des dégâts réels :
 *
 *  1. `occupe` bloque le second appel. Deux clics sur « Je viens » partent
 *     sinon en parallèle, chacun ayant lu l'effectif AVANT l'autre — et le
 *     second écrase le premier.
 *  2. L'erreur est TOUJOURS montrée. Une écriture qui échoue en silence
 *     laisse l'écran afficher un état qui n'existe pas côté serveur, et le
 *     joueur se croit inscrit à un match où il ne l'est pas.
 */
export function useAction<A extends unknown[], T>(
  faire: (...args: A) => Promise<T>,
  options: Options<T> = {},
) {
  const [occupe, setOccupe] = useState(false);
  const toast = useToast();
  const query = useQueryClient();

  const lancer = useCallback(
    async (...args: A) => {
      if (occupe) return;
      setOccupe(true);
      try {
        const r = await faire(...args);
        if (options.succes) toast(options.succes(r), 'succes');
        for (const cle of options.invalider ?? []) {
          await query.invalidateQueries({ queryKey: [...cle] });
        }
        options.apres?.(r);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Ça n’a pas marché. Réessaie.', 'erreur');
      } finally {
        setOccupe(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occupe, faire, toast, query],
  );

  return { lancer, occupe };
}
