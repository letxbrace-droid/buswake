package fr.kolektif.domaine

/** Miroir de app/src/domaine/xp.ts. Couleurs en ARGB pour Compose. */
data class Rang(val min: Int, val label: String, val couleur: Long)

val RANGS = listOf(
    Rang(0, "Recrue", 0xFFA07B5B),
    Rang(200, "Stagiaire", 0xFFB8C0CC),
    Rang(500, "Titulaire", 0xFF3BA2FF),
    Rang(1000, "Cadre", 0xFF5DD62C),
    Rang(2000, "Capitaine", 0xFFFFC83D),
    Rang(4000, "Légende", 0xFFFF4D6D),
)

fun rangDe(xp: Int): Rang = RANGS.last { maxOf(0, xp) >= it.min }

data class Progression(val rang: Rang, val suivant: Rang?, val restant: Int, val fraction: Float)

fun progressionDe(xp: Int): Progression {
    val n = maxOf(0, xp)
    val rang = rangDe(n)
    val i = RANGS.indexOf(rang)
    val suivant = RANGS.getOrNull(i + 1) ?: return Progression(rang, null, 0, 1f)
    val etendue = suivant.min - rang.min
    return Progression(rang, suivant, suivant.min - n, (n - rang.min).toFloat() / etendue)
}
