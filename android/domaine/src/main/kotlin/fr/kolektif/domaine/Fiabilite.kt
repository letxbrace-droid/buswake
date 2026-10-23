package fr.kolektif.domaine

import kotlin.math.roundToInt

/** Miroir de app/src/domaine/fiabilite.ts : les dix derniers matchs
 *  (J joué, L lapin, D désistement tardif), pas un seuil d'XP. */
object Seuils {
    const val MINIMUM = 3
    const val FIABLE = 0.9
    const val LAPIN = 0.7
    const val LAPINS_RECENTS = 2
}

enum class StatutFiabilite { NOUVEAU, FIABLE, NEUTRE, LAPIN }

data class Fiabilite(val statut: StatutFiabilite, val taux: Double?, val lapins: Int, val matchs: Int)

fun fiabilite(historique: List<String>?): Fiabilite {
    val h = (historique ?: emptyList()).filter { it == "J" || it == "L" || it == "D" }.takeLast(10)
    val joues = h.count { it == "J" }
    val lapins = h.count { it == "L" }
    if (h.size < Seuils.MINIMUM) return Fiabilite(StatutFiabilite.NOUVEAU, null, lapins, h.size)
    val taux = joues.toDouble() / h.size
    val statut = when {
        taux < Seuils.LAPIN || lapins >= Seuils.LAPINS_RECENTS -> StatutFiabilite.LAPIN
        taux >= Seuils.FIABLE -> StatutFiabilite.FIABLE
        else -> StatutFiabilite.NEUTRE
    }
    return Fiabilite(statut, taux, lapins, h.size)
}

fun libelleFiabilite(f: Fiabilite): String {
    if (f.statut == StatutFiabilite.NOUVEAU) return "Pas encore assez de matchs"
    val pct = ((f.taux ?: 0.0) * 100).roundToInt()
    if (f.statut == StatutFiabilite.LAPIN) {
        val s = if (f.lapins > 1) "s" else ""
        return "${f.lapins} lapin$s récent$s · $pct % de présence"
    }
    return "$pct % de présence sur ${f.matchs} matchs"
}
