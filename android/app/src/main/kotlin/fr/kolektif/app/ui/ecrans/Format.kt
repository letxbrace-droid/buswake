package fr.kolektif.app.ui.ecrans

import fr.kolektif.app.donnees.PARIS
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.Locale

private val JOUR = DateTimeFormatter.ofPattern("EEEE d", Locale.FRENCH)
private val HEURE = DateTimeFormatter.ofPattern("HH'h'mm", Locale.FRENCH)

/** « mardi 6 · 18h30 », à l'heure de Paris — là où les matchs se jouent. */
fun quand(i: Instant?): String {
    if (i == null) return "Date à caler"
    val z = i.atZone(PARIS)
    return JOUR.format(z).replaceFirstChar { it.uppercase() } + " · " + HEURE.format(z)
}
