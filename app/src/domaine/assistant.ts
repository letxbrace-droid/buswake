/**
 * L'ASSISTANT DE CRÉATION — quatre étapes.
 *
 * Une seule page portait tout : les créneaux, le terrain, l'effectif. Sur un
 * téléphone, ça fait un formulaire qu'on parcourt au pouce sans savoir où on
 * en est, et dont on ne voit le message d'erreur qu'en bas.
 *
 * CE QUE L'ASSISTANT NE CHANGE PAS : on propose PLUSIEURS créneaux, et c'est
 * le vote qui tranche. La maquette montre une date unique ; ce serait retirer
 * le mécanisme sur lequel le produit est bâti — « coche-en plusieurs, le vote
 * tranchera » est la promesse de l'écran d'accueil, et un match à cinq se cale
 * rarement du premier coup.
 *
 * En revanche les créneaux ne sont plus IMPOSÉS. L'étape 1 offrait cinq
 * propositions calculées (« vendredi 19h, samedi 14h… ») : un raccourci pour
 * les cas courants, mais quelqu'un qui joue le mardi à 21 h n'avait aucun
 * moyen de le dire. On choisit maintenant ses dates au calendrier, et son
 * heure — autant qu'on veut, dans la limite des dix que les règles posent.
 *
 * L'état est PUR : la validation par étape, l'étape atteignable, ce qui
 * manque. C'est ce qui permet de l'éprouver sans monter un formulaire.
 */

export const ETAPES = ['infos', 'lieu', 'joueurs', 'publier'] as const;
export type Etape = (typeof ETAPES)[number];

export const LIBELLES: Record<Etape, string> = {
  infos: 'Infos',
  lieu: 'Lieu',
  joueurs: 'Joueurs',
  publier: 'Publier',
};

/** Durées proposées, en minutes. Ce sont les créneaux que les centres louent ;
 *  proposer « 45 min » inviterait à réserver ce qui n'existe pas. */
export const DUREES = [60, 90, 120] as const;
export type Duree = (typeof DUREES)[number];
export const DUREE_DEFAUT: Duree = 60;

export function libelleDuree(min: number): string {
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${r}` : `${h}h`;
}

/** Le niveau attendu. `tous` est le défaut et n'est PAS une valeur neutre
 *  qu'on affiche : un match « tous niveaux » se dit, un match sans niveau
 *  déclaré ne dit rien. */
export const NIVEAUX_MATCH = ['tous', 'debutant', 'intermediaire', 'confirme'] as const;
export type NiveauMatch = (typeof NIVEAUX_MATCH)[number];

export const LIBELLES_NIVEAU: Record<NiveauMatch, string> = {
  tous: 'Tous niveaux',
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  confirme: 'Confirmé',
};

/** Le mot du créateur. La borne vient des règles Firestore, qui refusent
 *  au-delà : la dire ici évite un refus opaque après l'envoi. */
export const MESSAGE_MAX = 200;

export interface Saisie {
  /** Les créneaux proposés, en dates pleines. C'étaient des INDICES dans une
   *  liste de suggestions : ça interdisait de proposer autre chose. */
  readonly creneaux: readonly Date[];
  readonly duree: Duree;
  readonly lieu: string | null;
  readonly joueursMax: number;
  readonly niveau: NiveauMatch;
  readonly message: string;
}

export const SAISIE_VIDE: Saisie = {
  creneaux: [],
  duree: DUREE_DEFAUT,
  lieu: null,
  joueursMax: 10,
  niveau: 'tous',
  message: '',
};

/** Ce qui manque à une étape — `null` quand elle est complète. */
export function manqueA(etape: Etape, s: Saisie): string | null {
  switch (etape) {
    case 'infos':
      if (s.creneaux.length === 0) return 'Coche au moins un créneau';
      if (s.creneaux.length > 10) return 'Dix créneaux au maximum';
      return null;
    case 'lieu':
      return s.lieu ? null : 'Choisis un terrain';
    case 'joueurs':
      if (!Number.isInteger(s.joueursMax) || s.joueursMax < 2 || s.joueursMax > 40) {
        return 'Entre 2 et 40 joueurs';
      }
      return null;
    case 'publier':
      // Le message est facultatif ; seule sa longueur peut poser problème,
      // et elle est bornée à la saisie. On revalide quand même : la borne
      // des règles refuserait l'écriture, et un refus après l'envoi est
      // beaucoup plus coûteux qu'un compteur sous le champ.
      return s.message.length > MESSAGE_MAX ? `${MESSAGE_MAX} caractères au maximum` : null;
  }
}

export function etapeComplete(etape: Etape, s: Saisie): boolean {
  return manqueA(etape, s) === null;
}

/**
 * Jusqu'où peut-on aller ?
 *
 * On ne saute pas une étape incomplète. Mais on peut REVENIR librement sur
 * une étape déjà franchie : corriger le terrain depuis la dernière page ne
 * doit pas coûter trois retours en arrière.
 */
export function etapeAtteignable(cible: Etape, s: Saisie): boolean {
  const i = ETAPES.indexOf(cible);
  return ETAPES.slice(0, i).every((e) => etapeComplete(e, s));
}

export function suivante(etape: Etape): Etape | null {
  const i = ETAPES.indexOf(etape);
  return i < ETAPES.length - 1 ? ETAPES[i + 1] : null;
}

export function precedente(etape: Etape): Etape | null {
  const i = ETAPES.indexOf(etape);
  return i > 0 ? ETAPES[i - 1] : null;
}

/** Prêt à publier : toutes les étapes, pas seulement la dernière. */
export function peutPublier(s: Saisie): boolean {
  return ETAPES.every((e) => etapeComplete(e, s));
}

/** La première étape incomplète — celle où renvoyer quelqu'un qui arrive au
 *  bout sans avoir tout rempli, plutôt que de lui griser un bouton sans dire
 *  où est le trou. */
export function premiereIncomplete(s: Saisie): Etape | null {
  return ETAPES.find((e) => !etapeComplete(e, s)) ?? null;
}
