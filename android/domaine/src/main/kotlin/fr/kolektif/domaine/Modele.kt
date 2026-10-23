package fr.kolektif.domaine

import java.time.Instant

/** Le match tel que l'app le lit — miroir de `MatchSchema` (app/src/domaine/schemas.ts).
 *  Chaque champ manquant prend une valeur sûre : un document ancien ou
 *  incomplet doit s'afficher, jamais faire tomber l'écran. */
data class Creneau(
    val date: Instant?,
    val lieu: String,
    val adresse: String? = null,
    val lat: Double? = null,
    val lon: Double? = null,
)

enum class Statut(val valeur: String) {
    SONDAGE("sondage"), CONFIRME("confirmé"), TERMINE("terminé"), ANNULE("annulé");

    companion object {
        fun de(v: String?): Statut = entries.firstOrNull { it.valeur == v } ?: SONDAGE
    }
}

data class Match(
    val id: String,
    val createurUid: String = "",
    val statut: Statut = Statut.SONDAGE,
    val joueursInscrits: List<String> = emptyList(),
    val waitlist: List<String> = emptyList(),
    val creneaux: List<Creneau> = emptyList(),
    /** Clé = index du créneau (« 0 », « 1 »…), valeur = votants. */
    val votes: Map<String, List<String>> = emptyMap(),
    val dateFinale: Instant? = null,
    val lieuFinal: String = "",
    val joueursMax: Int? = null,
    val duree: Int = 60,
    val niveau: String = "tous",
    val message: String = "",
)

data class Joueur(
    val uid: String,
    val pseudo: String,
    val xp: Int = 0,
    val posteFavori: String? = null,
    val historique: List<String> = emptyList(),
    val matchsJoues: Int = 0,
    val hommeDuMatch: Int = 0,
    val buts: Int = 0,
    val passes: Int = 0,
    val lapins: Int = 0,
)
