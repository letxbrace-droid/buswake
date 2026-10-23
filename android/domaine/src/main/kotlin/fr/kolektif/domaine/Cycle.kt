package fr.kolektif.domaine

import java.time.Instant

/** Effectif minimal pour confirmer — repli pour les matchs d'avant le
 *  multi-sport. L'effectif appartient au match, jamais à l'app. */
const val MIN_CONFIRM = 10

fun maxJoueurs(m: Match): Int = m.joueursMax?.takeIf { it in 2..40 } ?: MIN_CONFIRM

enum class Place { TITULAIRE, BANC, DEJA_TITULAIRE, DEJA_BANC }

fun placeEnRejoignant(m: Match, uid: String): Place = when {
    uid in m.joueursInscrits -> Place.DEJA_TITULAIRE
    uid in m.waitlist -> Place.DEJA_BANC
    m.joueursInscrits.size >= maxJoueurs(m) -> Place.BANC
    else -> Place.TITULAIRE
}

data class Effectif(val joueursInscrits: List<String>, val waitlist: List<String>, val promu: String?)

/** Quitter : un titulaire qui part laisse sa place au PREMIER du banc. */
fun quitter(m: Match, uid: String): Effectif {
    if (uid in m.joueursInscrits) {
        val banc = m.waitlist.toMutableList()
        val promu = banc.removeFirstOrNull()
        val restants = m.joueursInscrits.filter { it != uid } + listOfNotNull(promu)
        return Effectif(restants, banc, promu)
    }
    return Effectif(m.joueursInscrits, m.waitlist.filter { it != uid }, null)
}

/** Le coup d'envoi : l'instant écrit par la confirmation. */
fun coupDEnvoi(m: Match): Instant? = m.dateFinale

/** Le créneau en tête du vote (le plus de voix, le premier en cas d'égalité). */
fun creneauEnTete(m: Match): Int? =
    m.creneaux.indices.maxByOrNull { i -> (m.votes[i.toString()] ?: emptyList()).size * 1000 - i }
        ?.takeIf { (m.votes[it.toString()] ?: emptyList()).isNotEmpty() }

/** Quand se joue le match : la date confirmée, sinon le créneau en tête,
 *  sinon le premier proposé. */
fun dateAffichee(m: Match): Instant? =
    m.dateFinale ?: creneauEnTete(m)?.let { m.creneaux[it].date } ?: m.creneaux.firstOrNull()?.date

fun lieuAffiche(m: Match): String =
    m.lieuFinal.ifBlank { creneauEnTete(m)?.let { m.creneaux[it].lieu } ?: m.creneaux.firstOrNull()?.lieu ?: "" }
