import { useEffect, useRef, useState } from 'react';

/**
 * L'ANIMATION D'ENTRÉE NE JOUE QU'À LA PREMIÈRE APPARITION.
 *
 * C'est la règle qui rend la signature supportable, et `DESIGN.md` la pose
 * explicitement : la liste se re-rend à chaque écriture Firestore. Sans
 * garde, la chaîne d'un match repartirait de zéro parce qu'un AUTRE match a
 * bougé — du bruit, pas du mouvement.
 *
 * Le conteneur porte `.anim-in` le temps que les animations se jouent, puis
 * la perd. Les changements suivants glissent par les transitions CSS : de
 * l'ancienne valeur à la nouvelle, ce qui est le bon geste pour un incrément.
 *
 * `cle` remet le compteur à zéro quand on change réellement de contenu —
 * changer d'onglet est une nouvelle liste, et elle a droit à son entrée.
 */
export function useEntree(cle: unknown = ''): string {
  const [actif, setActif] = useState(true);
  const precedente = useRef(cle);

  useEffect(() => {
    if (precedente.current !== cle) {
      precedente.current = cle;
      setActif(true);
    }
  }, [cle]);

  useEffect(() => {
    if (!actif) return;
    const t = window.setTimeout(() => setActif(false), 900);
    return () => window.clearTimeout(t);
  }, [actif]);

  return actif ? 'anim-in' : '';
}
