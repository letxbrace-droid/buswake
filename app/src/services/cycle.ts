import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { lireMatch, CreerMatchSchema, type CreerMatch, type Match } from '../domaine/schemas';
import { basculerVote, finVisibleApres, peutConfirmer, quitter, rejoindre, type Votes } from '../domaine/cycle';
import { versDate } from '../domaine/match';
import { peutTerminer, validerResultat, type Resultat } from '../domaine/fin';
import type { Camp } from '../domaine/composition';

/** Écritures du cycle de vie. Cette couche fait TROIS choses et rien d'autre :
 *  relire l'état frais, appeler le domaine, envoyer le résultat.
 *
 *  Elle ne calcule aucune règle — c'est ce qui rend le domaine testable sans
 *  réseau, et ce qui garantit qu'une règle ne vit pas à deux endroits.
 *
 *  ET ELLE N'ÉCRIT JAMAIS D'XP. Les règles Firestore refusent les champs de
 *  jeu à tous les clients ; les Cloud Functions les attribuent depuis le
 *  document match, qui est la seule source. C'est ce qui ferme le trou où
 *  gagner puis annuler laissait l'XP acquise.
 */

async function relire(id: string): Promise<Match> {
  const snap = await getDoc(doc(db, 'matchs', id));
  const m = snap.exists() ? lireMatch(id, snap.data()) : null;
  if (!m) throw new Error('Ce match n’existe plus.');
  return m;
}

/** Le vote se fait en arrayUnion/arrayRemove et non en réécrivant le tableau :
 *  deux joueurs qui votent en même temps ne doivent pas s'effacer l'un
 *  l'autre. Le domaine sert ici à décider du SENS, pas à produire l'écriture. */
export async function voter(matchId: string, creneauIndex: number, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'matchs', matchId));
  const votes = ((snap.data()?.votes ?? {}) as Votes);
  const cle = String(creneauIndex);
  const avant = (votes[cle] ?? []).includes(uid);
  const apres = basculerVote(votes, cle, uid)[cle].includes(uid);

  await updateDoc(doc(db, 'matchs', matchId), {
    [`votes.${cle}`]: apres ? arrayUnion(uid) : arrayRemove(uid),
  });
  return !avant && apres;
}

export interface ResultatEffectif {
  readonly place: 'titulaire' | 'banc';
  readonly promu: string | null;
}

export async function rejoindreMatch(matchId: string, uid: string): Promise<ResultatEffectif> {
  const m = await relire(matchId);
  const e = rejoindre(m, uid);
  await updateDoc(doc(db, 'matchs', matchId), {
    joueursInscrits: e.joueursInscrits,
    waitlist: e.waitlist,
  });
  return { place: e.joueursInscrits.includes(uid) ? 'titulaire' : 'banc', promu: null };
}

export async function quitterMatch(matchId: string, uid: string): Promise<{ promu: string | null }> {
  const m = await relire(matchId);
  const e = quitter(m, uid);
  await updateDoc(doc(db, 'matchs', matchId), {
    joueursInscrits: e.joueursInscrits,
    waitlist: e.waitlist,
  });
  return { promu: e.promu };
}

export async function confirmer(matchId: string, creneauIndex: number): Promise<void> {
  const m = await relire(matchId);
  const c = peutConfirmer(m);
  if (!c.peut) {
    throw new Error(
      `Il faut ${c.requis} joueurs pour confirmer (${c.inscrits}/${c.requis}).`,
    );
  }

  const creneau = (m.creneauxProposes ?? [])[creneauIndex];
  const debut = versDate(creneau?.date);
  if (!creneau || !debut) throw new Error('Ce créneau n’existe plus.');

  await updateDoc(doc(db, 'matchs', matchId), {
    statut: 'confirmé',
    dateFinale: debut,
    // La borne suit le créneau retenu : les autres dates tombent.
    finVisible: finVisibleApres(debut),
    lieuFinal: creneau.lieu,
  });
}

/**
 * Supprime le match. DEUX raisons de le faire ainsi, toutes deux vérifiables
 * dans le dépôt — l'implémentation précédente se trompait sur les deux.
 *
 * Elle écrivait `statut: 'annulé'`, en expliquant que les Cloud Functions
 * avaient besoin de voir ce statut pour reprendre l'XP distribuée.
 *
 *  1. Les règles REFUSENT ce statut : `firestore.rules` borne `statut` à
 *     ['sondage', 'confirmé', 'terminé']. L'écriture partait et revenait en
 *     « permission denied » — le créateur n'arrivait tout simplement pas à
 *     supprimer son match, sans comprendre pourquoi.
 *  2. La fonction serveur ne réagit pas à ce statut : `onMatchEcrit` teste
 *     `if (!after)`, donc la SUPPRESSION du document. C'est elle qui déclenche
 *     `rembourser()`.
 *
 * `allow delete` autorise déjà le créateur. C'est le chemin que le serveur
 * attendait depuis le début.
 */
export async function supprimer(matchId: string): Promise<void> {
  await deleteDoc(doc(db, 'matchs', matchId));
}

export async function creer(saisie: CreerMatch, uid: string): Promise<string> {
  // Validation AVANT le réseau : un refus de règle Firestore est opaque,
  // un message de Zod dit quoi corriger. La borne à dix créneaux reflète
  // exactement la règle serveur (creneauxProposes.size() <= 10).
  const v = CreerMatchSchema.parse(saisie);

  const derniere = v.creneauxProposes.reduce(
    (max, c) => (c.date > max ? c.date : max),
    v.creneauxProposes[0].date,
  );

  const ref = await addDoc(collection(db, 'matchs'), {
    createurUid: uid,
    sport: v.sport,
    statut: 'sondage',
    joueursMax: v.joueursMax,
    joueursInscrits: [uid],
    waitlist: [],
    creneauxProposes: v.creneauxProposes,
    votes: {},
    visibilite: 'public',
    // Tant que le créneau n'est pas tranché, l'horizon suit la dernière date
    // proposée : le match doit rester visible jusqu'à ce qu'il soit joué ou
    // périmé. Sans cet horizon, il ne remonte dans aucune requête bornée.
    finVisible: finVisibleApres(derniere),
    creeLe: serverTimestamp(),
  });
  return ref.id;
}

// ===== FIN DE MATCH =====
/** Écrit le résultat. Le client pose le score, l'homme du match et les
 *  présences — RIEN D'AUTRE. L'XP, les séries, les badges et les statistiques
 *  sont calculés par la Cloud Function `gainsFinDeMatch` à partir de ces deux
 *  champs, et refusés au client par les règles. C'est ce qui a retiré au
 *  créateur le pouvoir de distribuer l'XP des autres. */
export async function terminer(matchId: string, r: Resultat): Promise<void> {
  const m = await relire(matchId);
  if (!peutTerminer(m)) throw new Error('Seul un match confirmé peut être terminé.');

  const v = validerResultat(m.joueursInscrits ?? [], r);
  if (!v.ok) throw new Error(v.probleme);

  await updateDoc(doc(db, 'matchs', matchId), {
    statut: 'terminé',
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    hommeDuMatchUid: r.hommeDuMatchUid,
    attendance: r.attendance,
    // Le client pose QUI a marqué, pas le total de chacun : c'est
    // `gainsFinDeMatch` qui incrémente `stats.buts` et `stats.passes` sur
    // les joueurs, et les règles refusent `stats` à tous les clients. Le
    // grand livre `_xp` retient ce qui a été crédité, donc la suppression du
    // match reprend aussi les buts — sans une ligne de plus.
    buts: r.buts,
    passes: r.passes,
  });
}

export async function enregistrerComposition(matchId: string, camps: readonly Camp[]): Promise<void> {
  await updateDoc(doc(db, 'matchs', matchId), { equipes: camps });
}
