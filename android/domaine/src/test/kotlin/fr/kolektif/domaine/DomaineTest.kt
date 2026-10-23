package fr.kolektif.domaine

import java.io.File
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ConcordanceServeurTest {
    private val serveur = File(System.getProperty("kolektif.racine"), "functions/index.js").readText()

    private fun objet(nom: String): Map<String, Int> {
        val corps = Regex("const $nom = \\{([^}]*)\\}").find(serveur)?.groupValues?.get(1)
        assertNotNull(corps, "$nom introuvable dans functions/index.js")
        return Regex("(\\w+):\\s*(-?\\d+)").findAll(corps).associate { it.groupValues[1] to it.groupValues[2].toInt() }
    }

    @Test fun `le barème de désistement est celui du serveur`() {
        val p = objet("PENALITE")
        assertEquals(Penalite.DESIST48, p["desist48"])
        assertEquals(Penalite.DESIST24, p["desist24"])
        assertEquals(Penalite.SUPPRESSION, p["suppression"])
        assertEquals(Penalite.PAR_JOUR, p["parJour"])
    }

    @Test fun `le lapin coûte ce que le serveur prélève`() {
        assertEquals(-30, objet("XP")["lapin"])
    }
}

class PenalitesTest {
    private val maintenant = Instant.parse("2026-10-23T12:00:00Z")
    private fun dans(h: Long) = Match("m", statut = Statut.CONFIRME, dateFinale = maintenant.plusSeconds(h * 3600))

    @Test fun `gratuit au-delà de 48 h`() = assertEquals(0, apercuDesistement(dans(72), maintenant)!!.xp)
    @Test fun `-10 entre 48 et 24 h`() = assertEquals(-10, apercuDesistement(dans(30), maintenant)!!.xp)
    @Test fun `-25 sous 24 h, -12 si remplacé — même arrondi que JS`() {
        val a = apercuDesistement(dans(5).copy(waitlist = listOf("r")), maintenant)!!
        assertEquals(-25, a.xp); assertEquals(-12, a.xpSiRemplace); assertTrue(a.tardif); assertTrue(a.remplacantPret)
    }
    @Test fun `rien sans date fixée`() = assertNull(apercuDesistement(Match("m"), maintenant))
}

class FiabiliteTest {
    private fun j(n: Int) = List(n) { "J" }
    @Test fun nouveau() = assertEquals(StatutFiabilite.NOUVEAU, fiabilite(listOf("J", "L")).statut)
    @Test fun fiable() = assertEquals(StatutFiabilite.FIABLE, fiabilite(j(9) + "D").statut)
    @Test fun `lapin sous 70 %`() = assertEquals(StatutFiabilite.LAPIN, fiabilite(j(6) + listOf("D", "D", "D", "L")).statut)
    @Test fun `lapin dès deux lapins`() = assertEquals(StatutFiabilite.LAPIN, fiabilite(j(8) + listOf("L", "L")).statut)
    @Test fun `on se rachète`() = assertEquals(StatutFiabilite.FIABLE, fiabilite(listOf("L", "L", "L") + j(10)).statut)
    @Test fun libelle() = assertEquals("2 lapins récents · 80 % de présence", libelleFiabilite(fiabilite(j(8) + listOf("L", "L"))))
}

class CycleTest {
    @Test fun `place sur le banc quand c'est plein`() {
        val m = Match("m", joueursMax = 2, joueursInscrits = listOf("a", "b"))
        assertEquals(Place.BANC, placeEnRejoignant(m, "c"))
        assertEquals(Place.DEJA_TITULAIRE, placeEnRejoignant(m, "a"))
    }
    @Test fun `le premier du banc entre quand un titulaire part`() {
        val e = quitter(Match("m", joueursInscrits = listOf("a", "b"), waitlist = listOf("r1", "r2")), "a")
        assertEquals(listOf("b", "r1"), e.joueursInscrits); assertEquals(listOf("r2"), e.waitlist); assertEquals("r1", e.promu)
    }
    @Test fun `effectif hors bornes, repli à 10`() = assertEquals(10, maxJoueurs(Match("m", joueursMax = 500)))
}

class XpTest {
    @Test fun rangs() { assertEquals("Recrue", rangDe(-5).label); assertEquals("Cadre", rangDe(1240).label) }
    @Test fun progression() { val p = progressionDe(1240); assertEquals(760, p.restant); assertEquals("Capitaine", p.suivant?.label) }
}

class FilTest {
    private val t = Instant.parse("2026-10-23T12:00:00Z")
    @Test fun `prochain match, le plus proche où je joue`() {
        val a = Match("a", joueursInscrits = listOf("moi"), dateFinale = t.plusSeconds(7200), statut = Statut.CONFIRME)
        val b = Match("b", joueursInscrits = listOf("moi"), dateFinale = t.plusSeconds(3600), statut = Statut.CONFIRME)
        val c = Match("c", joueursInscrits = listOf("autre"), dateFinale = t.plusSeconds(60), statut = Statut.CONFIRME)
        assertEquals("b", prochainMatch(listOf(a, b, c), "moi", t)?.id)
    }
}
