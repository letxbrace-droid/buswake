/**
 * LE LIEN D'INVITATION.
 *
 * Il doit marcher collé dans une conversation, chez quelqu'un qui n'a pas
 * l'app. C'est donc une URL ABSOLUE — un `#/match/x` seul ne mène nulle part
 * hors du navigateur qui l'a produit.
 *
 * La route est celle de la v2. Les liens `#j=<id>` de la v1 circulent encore
 * et sont traduits au démarrage, mais on n'en fabrique plus de nouveaux.
 */
export function lienDuMatch(origine: string, chemin: string, matchId: string): string {
  // `chemin` est le sous-répertoire servi (/buswake/ sur GitHub Pages). On le
  // garde : sans lui le lien pointe à la racine du domaine, où il n'y a rien.
  const base = chemin.replace(/index\.html$/, '').replace(/\/+$/, '');
  return `${origine}${base}/#/match/${matchId}`;
}

export interface Invitation {
  readonly titre: string;
  readonly texte: string;
  readonly lien: string;
}

/** Ce qu'on met dans le partage. Le lieu et l'heure DANS le texte : un lien
 *  nu dans une conversation ne donne aucune raison de l'ouvrir. */
export function invitation(lien: string, lieu: string, quand: string, manque: number): Invitation {
  const ou = lieu ? ` au ${lieu}` : '';
  const appel =
    manque > 0
      ? `Il manque ${manque} joueur${manque > 1 ? 's' : ''}`
      : 'On est au complet';
  return {
    titre: 'Un match sur Kolektif',
    texte: `${appel}${ou}${quand ? ` — ${quand}` : ''}.`,
    lien,
  };
}

/** Le lien vers les équipes — pour inviter quelqu'un dans un club. Les
 *  règles n'autorisent qu'à s'ajouter SOI-MÊME : on ne peut pas inscrire
 *  autrui, on lui envoie de quoi entrer. */
export function lienDuClub(origine: string, chemin: string): string {
  const base = chemin.replace(/index\.html$/, '').replace(/\/+$/, '');
  return `${origine}${base}/#/equipes`;
}
