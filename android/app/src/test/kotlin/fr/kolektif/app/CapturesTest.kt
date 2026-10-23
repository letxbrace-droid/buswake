package fr.kolektif.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import fr.kolektif.app.ui.Dock
import fr.kolektif.app.ui.ecrans.Accueil
import fr.kolektif.app.ui.ecrans.Connexion
import fr.kolektif.app.ui.ecrans.DetailMatchContenu
import fr.kolektif.app.ui.ecrans.Matchs
import fr.kolektif.app.ui.ecrans.Profil
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.KolektifTheme
import fr.kolektif.domaine.Creneau
import fr.kolektif.domaine.Joueur
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.Statut
import fr.kolektif.domaine.rangerFil
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/** Les écrans, rendus SANS émulateur ni réseau, avec des données de démo.
 *  Ce sont ces images qu'on regarde avant de publier un APK. */
class CapturesTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6, theme = "android:Theme.Material.NoActionBar")

    private val h = { n: Long -> Instant.now().plusSeconds(n * 3600) }
    private val moi = Joueur("u1", "Sam", xp = 1240, historique = List(9) { "J" } + "D",
        matchsJoues = 12, hommeDuMatch = 2, buts = 17, passes = 9, lapins = 1)
    private val fiches = mapOf(
        "u1" to moi,
        "u2" to Joueur("u2", "Karim", historique = List(10) { "J" }),
        "u3" to Joueur("u3", "Naïm", historique = listOf("J", "L", "J", "D", "L", "J")),
        "u4" to Joueur("u4", "Théo"),
        "u8" to Joueur("u8", "Adam"),
    )
    private val sondage = Match(
        "m1", createurUid = "u2", statut = Statut.SONDAGE,
        joueursInscrits = listOf("u1", "u2", "u3", "u4"),
        creneaux = listOf(
            Creneau(h(30), "UrbanSoccer Orsay", "8 Avenue de la Baltique, 91140 Villebon"),
            Creneau(h(54), "LE FIVE Créteil"),
        ),
        votes = mapOf("0" to listOf("u1", "u2", "u3"), "1" to listOf("u4")),
        joueursMax = 10, message = "Match chill, bon esprit !",
    )
    private val confirmeBientot = sondage.copy(
        id = "m2", statut = Statut.CONFIRME, dateFinale = h(5), lieuFinal = "UrbanSoccer Orsay", waitlist = listOf("u8"),
    )

    private fun capture(avecDock: String? = null, contenu: @Composable () -> Unit) = paparazzi.snapshot {
        KolektifTheme {
            Box(Modifier.fillMaxSize().background(K.fond)) {
                contenu()
                if (avecDock != null) Dock(avecDock, Modifier.align(Alignment.BottomCenter)) {}
            }
        }
    }

    @Test fun connexion() = capture { Connexion() }
    @Test fun accueil() = capture("accueil") { Accueil(moi, confirmeBientot, {}, {}) }
    @Test fun matchs() = capture("matchs") { Matchs(rangerFil(listOf(sondage, confirmeBientot)), false, {}, {}) }
    @Test fun detailSondage() = capture { DetailMatchContenu(sondage, "u1", fiches, false, {}, { _, _ -> }, {}, { _, _, _ -> }) }
    @Test fun detailBientot() = capture { DetailMatchContenu(confirmeBientot, "u1", fiches, false, {}, { _, _ -> }, {}, { _, _, _ -> }) }
    @Test fun profil() = capture("profil") { Profil(moi, {}) }
}
