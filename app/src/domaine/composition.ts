/** COMPOSITION DES ÉQUIPES.
 *
 *  Deux équipes, et un banc qui contient tout ce qui n'est pas encore placé.
 *  La composition est MANUELLE : on ne répartit pas automatiquement à partir
 *  des atouts, parce que ces atouts sont auto-déclarés. Un équilibrage calculé
 *  sur des notes que chacun s'attribue donnerait une fausse objectivité —
 *  et c'est le genre de chiffre qui déclenche des discussions au bord du
 *  terrain plutôt que d'en éviter.
 */

export interface Camp {
  readonly nom: string;
  readonly couleur: string;
  readonly joueurs: string[];
}

export const CAMPS_PAR_DEFAUT: readonly Camp[] = [
  { nom: 'Chasubles', couleur: '#FF6A00', joueurs: [] },
  { nom: 'Verts', couleur: '#5DD62C', joueurs: [] },
] as const;

export function banc(inscrits: readonly string[], camps: readonly Camp[]): string[] {
  const places = new Set(camps.flatMap((c) => c.joueurs));
  return inscrits.filter((u) => !places.has(u));
}

/** Place un joueur dans un camp — et l'enlève de l'autre. Sans ce retrait,
 *  un joueur pouvait figurer des deux côtés et le total dépassait l'effectif. */
export function placer(camps: readonly Camp[], uid: string, cible: number): Camp[] {
  return camps.map((c, i) => ({
    ...c,
    joueurs: i === cible
      ? c.joueurs.includes(uid) ? c.joueurs : [...c.joueurs, uid]
      : c.joueurs.filter((x) => x !== uid),
  }));
}

export function retirer(camps: readonly Camp[], uid: string): Camp[] {
  return camps.map((c) => ({ ...c, joueurs: c.joueurs.filter((x) => x !== uid) }));
}

/** Répartit en alternance ceux qui restent sur le banc. Ce n'est PAS un
 *  équilibrage par niveau : c'est un tirage, et il est présenté comme tel.
 *  L'ordre d'inscription n'a rien à voir avec le niveau, donc alterner vaut
 *  autant qu'autre chose — et personne ne peut contester un tirage. */
export function repartirAlternativement(
  inscrits: readonly string[],
  camps: readonly Camp[],
): Camp[] {
  const restants = banc(inscrits, camps);
  const copie = camps.map((c) => ({ ...c, joueurs: [...c.joueurs] }));
  // On commence par le camp le moins garni, sinon un camp déjà rempli à la
  // main reste plus gros à la fin.
  restants.forEach((uid) => {
    const cible = copie[0].joueurs.length <= copie[1].joueurs.length ? 0 : 1;
    copie[cible].joueurs.push(uid);
  });
  return copie;
}

export interface EtatComposition {
  readonly complet: boolean;
  readonly ecart: number;
  readonly reste: number;
}

export function etatComposition(
  inscrits: readonly string[],
  camps: readonly Camp[],
): EtatComposition {
  const reste = banc(inscrits, camps).length;
  return {
    complet: reste === 0,
    ecart: Math.abs((camps[0]?.joueurs.length ?? 0) - (camps[1]?.joueurs.length ?? 0)),
    reste,
  };
}
