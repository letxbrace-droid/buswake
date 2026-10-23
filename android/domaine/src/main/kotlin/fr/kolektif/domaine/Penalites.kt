package fr.kolektif.domaine

import java.time.Duration
import java.time.Instant
import kotlin.math.roundToInt

/** Miroir de `PENALITE` (functions/index.js). C'est le SERVEUR qui applique ;
 *  l'app prévient, avec les mêmes chiffres. Un test lit le serveur. */
object Penalite {
    const val DESIST48 = -10
    const val DESIST24 = -25
    const val SUPPRESSION = -20
    const val PAR_JOUR = 3
}

/** Même arrondi que le serveur (Math.round de JS : vers +∞ sur les demis). */
fun penaliteDesistement(heuresAvant: Double, remplace: Boolean): Int {
    val p = when {
        heuresAvant < 24 -> Penalite.DESIST24
        heuresAvant < 48 -> Penalite.DESIST48
        else -> 0
    }
    return if (remplace) Math.floor(p / 2.0 + 0.5).roundToInt() else p
}

data class ApercuDesistement(val xp: Int, val xpSiRemplace: Int, val tardif: Boolean, val remplacantPret: Boolean)

fun apercuDesistement(m: Match, maintenant: Instant = Instant.now()): ApercuDesistement? {
    if (m.statut != Statut.SONDAGE && m.statut != Statut.CONFIRME) return null
    val coup = coupDEnvoi(m) ?: return null
    val heures = Duration.between(maintenant, coup).toMinutes() / 60.0
    return ApercuDesistement(
        xp = penaliteDesistement(heures, false),
        xpSiRemplace = penaliteDesistement(heures, true),
        tardif = heures < 24,
        remplacantPret = m.waitlist.isNotEmpty(),
    )
}
