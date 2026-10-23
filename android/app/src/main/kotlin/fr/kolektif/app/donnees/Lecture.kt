package fr.kolektif.app.donnees

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import fr.kolektif.domaine.Creneau
import fr.kolektif.domaine.Joueur
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.Statut
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.Date

/** Lecture TOLÉRANTE des documents — le pendant de `lireMatch` (schemas.ts) :
 *  un champ absent ou mal typé prend une valeur sûre, un document illisible
 *  disparaît de la liste au lieu de faire tomber l'écran. */
val PARIS: ZoneId = ZoneId.of("Europe/Paris")

private fun Any?.enInstant(heure: String? = null): Instant? = when (this) {
    is Timestamp -> toDate().toInstant()
    is Date -> toInstant()
    is Number -> Instant.ofEpochMilli(toLong())
    // Documents de la v1 : « 2026-10-05 » et l'heure à part, heure de Paris.
    is String -> runCatching { Instant.parse(this) }.getOrNull()
        ?: runCatching {
            val h = heure?.let { LocalTime.parse(it) } ?: LocalTime.of(20, 0)
            LocalDate.parse(this).atTime(h).atZone(PARIS).toInstant()
        }.getOrNull()
    else -> null
}

private fun Any?.enChaines(): List<String> = (this as? List<*>)?.filterIsInstance<String>() ?: emptyList()
private fun Any?.enEntier(): Int? = (this as? Number)?.toInt()
private fun Any?.enDouble(): Double? = (this as? Number)?.toDouble()

fun DocumentSnapshot.versMatch(): Match? {
    val d = data ?: return null
    val creneaux = (d["creneauxProposes"] as? List<*>)?.mapNotNull { c ->
        val m = c as? Map<*, *> ?: return@mapNotNull null
        Creneau(
            date = m["date"].enInstant(m["heure"] as? String),
            lieu = m["lieu"] as? String ?: "",
            adresse = m["adresse"] as? String,
            lat = m["lat"].enDouble(),
            lon = m["lon"].enDouble(),
        )
    } ?: emptyList()
    val votes = (d["votes"] as? Map<*, *>)?.entries
        ?.associate { (k, v) -> k.toString() to v.enChaines() } ?: emptyMap()
    return Match(
        id = id,
        createurUid = d["createurUid"] as? String ?: "",
        statut = Statut.de(d["statut"] as? String),
        joueursInscrits = d["joueursInscrits"].enChaines(),
        waitlist = d["waitlist"].enChaines(),
        creneaux = creneaux,
        votes = votes,
        dateFinale = d["dateFinale"].enInstant(),
        lieuFinal = d["lieuFinal"] as? String ?: "",
        joueursMax = d["joueursMax"].enEntier(),
        duree = d["duree"].enEntier()?.takeIf { it in 30..240 } ?: 60,
        niveau = d["niveau"] as? String ?: "tous",
        message = (d["message"] as? String)?.take(200) ?: "",
    )
}

fun DocumentSnapshot.versJoueur(): Joueur {
    val d = data ?: emptyMap<String, Any?>()
    val st = d["stats"] as? Map<*, *> ?: emptyMap<String, Any?>()
    return Joueur(
        uid = id,
        pseudo = d["pseudo"] as? String ?: "Joueur",
        xp = d["xp"].enEntier() ?: 0,
        posteFavori = d["posteFavori"] as? String,
        historique = d["historique"].enChaines(),
        matchsJoues = st["matchsJoues"].enEntier() ?: 0,
        hommeDuMatch = st["hommeDuMatch"].enEntier() ?: 0,
        buts = st["buts"].enEntier() ?: 0,
        passes = st["passes"].enEntier() ?: 0,
        lapins = d["lapins"].enEntier() ?: st["lapins"].enEntier() ?: 0,
    )
}
