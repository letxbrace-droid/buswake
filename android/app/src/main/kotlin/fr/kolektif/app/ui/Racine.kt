package fr.kolektif.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import fr.kolektif.app.donnees.Depot
import fr.kolektif.app.ui.composants.Icones
import fr.kolektif.app.ui.ecrans.Accueil
import fr.kolektif.app.ui.ecrans.Connexion
import fr.kolektif.app.ui.ecrans.DetailMatch
import fr.kolektif.app.ui.ecrans.Matchs
import fr.kolektif.app.ui.ecrans.Profil
import fr.kolektif.app.ui.theme.Grotesk
import fr.kolektif.app.ui.theme.K
import fr.kolektif.domaine.Fil
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.prochainMatch
import fr.kolektif.domaine.rangerFil
import kotlinx.coroutines.launch

internal data class OngletDock(val route: String, val libelle: String, val icone: ImageVector)

internal val ONGLETS = listOf(
    OngletDock("accueil", "Accueil", Icones.accueil),
    OngletDock("matchs", "Matchs", Icones.ballon),
    OngletDock("profil", "Profil", Icones.joueur),
)

@Composable
fun Racine() {
    val uid by remember { Depot.session() }.collectAsState(initial = "…")
    Box(Modifier.fillMaxSize().background(K.fond)) {
        when (val u = uid) {
            "…" -> {}
            null -> Connexion()
            else -> Connecte(u)
        }
    }
}

@Composable
private fun Connecte(uid: String) {
    val nav = rememberNavController()
    val portee = rememberCoroutineScope()
    val moi by remember(uid) { Depot.profil(uid) }.collectAsState(initial = null)
    var matchs by remember { mutableStateOf<List<Match>>(emptyList()) }
    var fil by remember { mutableStateOf<Fil?>(null) }
    var chargement by remember { mutableStateOf(false) }

    fun rafraichir() {
        chargement = true
        portee.launch {
            matchs = runCatching { Depot.fil(uid) }.getOrDefault(emptyList())
            fil = rangerFil(matchs)
            chargement = false
        }
    }
    LaunchedEffect(uid) { rafraichir() }

    val entree by nav.currentBackStackEntryAsState()
    val route = entree?.destination?.route

    Box(Modifier.fillMaxSize().statusBarsPadding()) {
        NavHost(nav, startDestination = "accueil", modifier = Modifier.fillMaxSize()) {
            composable("accueil") {
                Accueil(moi, prochainMatch(matchs, uid), onOuvrir = { nav.navigate("match/$it") }, onMatchs = { aller(nav, "matchs") })
            }
            composable("matchs") {
                Matchs(fil, chargement, onRafraichir = ::rafraichir, onOuvrir = { nav.navigate("match/$it") })
            }
            composable("profil") { Profil(moi, onDeconnexion = { Depot.deconnecter() }) }
            composable("match/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { e ->
                DetailMatch(e.arguments?.getString("id").orEmpty(), uid, onRetour = {
                    nav.popBackStack()
                    rafraichir()
                })
            }
        }
        if (route in ONGLETS.map { it.route }) {
            Dock(route, Modifier.align(Alignment.BottomCenter)) { aller(nav, it) }
        }
    }
}

private fun aller(nav: NavHostController, route: String) {
    nav.navigate(route) {
        popUpTo("accueil") { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

/** Le dock : PLEIN, détaché des bords. L'onglet actif est une touche
 *  graphite en relief ; le vert est porté par l'icône et le libellé. */
@Composable
internal fun Dock(actif: String?, modifier: Modifier, onAller: (String) -> Unit) {
    val forme = RoundedCornerShape(24.dp)
    Row(
        modifier
            .navigationBarsPadding()
            .padding(12.dp)
            .fillMaxWidth()
            .height(66.dp)
            .shadow(16.dp, forme, ambientColor = Color.Black, spotColor = Color.Black)
            .clip(forme)
            .background(Brush.verticalGradient(listOf(K.carteHaut, K.carteBas)))
            .border(1.dp, Brush.verticalGradient(listOf(Color(0x33FFFFFF), Color(0x0AFFFFFF))), forme)
            .padding(6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        ONGLETS.forEach { o ->
            val choisi = o.route == actif
            Column(
                Modifier
                    .weight(1f)
                    .fillMaxSize()
                    .clip(RoundedCornerShape(18.dp))
                    .background(if (choisi) Brush.verticalGradient(listOf(K.bordClair, K.carteHaut)) else Brush.verticalGradient(listOf(Color.Transparent, Color.Transparent)))
                    .clickable { onAller(o.route) },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(o.icone, o.libelle, tint = if (choisi) K.vert else K.encreSec, modifier = Modifier.size(22.dp))
                Text(o.libelle, color = if (choisi) K.vert else K.encreSec, fontFamily = Grotesk,
                    fontWeight = if (choisi) FontWeight.SemiBold else FontWeight.Medium, fontSize = 11.sp)
            }
        }
    }
}
