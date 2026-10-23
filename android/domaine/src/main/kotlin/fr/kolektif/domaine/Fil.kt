package fr.kolektif.domaine

import java.time.Instant

enum class Onglet(val libelle: String) { SONDAGE("À caler"), CONFIRME("Confirmés"), TERMINE("Histo") }

data class Fil(val sondage: List<Match>, val confirme: List<Match>, val termine: List<Match>) {
    fun de(o: Onglet) = when (o) { Onglet.SONDAGE -> sondage; Onglet.CONFIRME -> confirme; Onglet.TERMINE -> termine }
    val placesLibres: Int get() = confirme.sumOf { maxOf(0, maxJoueurs(it) - it.joueursInscrits.size) }
}

/** Les matchs rangés par onglet, les plus proches dans le temps d'abord. */
fun rangerFil(matchs: List<Match>): Fil {
    val parDate = matchs.distinctBy { it.id }.sortedBy { dateAffichee(it) ?: Instant.MAX }
    return Fil(
        sondage = parDate.filter { it.statut == Statut.SONDAGE },
        confirme = parDate.filter { it.statut == Statut.CONFIRME },
        termine = parDate.filter { it.statut == Statut.TERMINE }.reversed(),
    )
}

/** Mon prochain match : le plus proche où je suis inscrit, encore à venir. */
fun prochainMatch(matchs: List<Match>, uid: String, maintenant: Instant = Instant.now()): Match? =
    matchs.filter { uid in it.joueursInscrits && it.statut != Statut.TERMINE }
        .filter { (dateAffichee(it) ?: Instant.MAX) > maintenant.minusSeconds(3 * 3600) }
        .minByOrNull { dateAffichee(it) ?: Instant.MAX }
