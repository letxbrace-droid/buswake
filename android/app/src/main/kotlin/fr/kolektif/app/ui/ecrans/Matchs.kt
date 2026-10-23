package fr.kolektif.app.ui.ecrans

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fr.kolektif.app.ui.composants.Carte
import fr.kolektif.app.ui.composants.Etiquette
import fr.kolektif.app.ui.composants.Puce
import fr.kolektif.app.ui.composants.Titre
import fr.kolektif.app.ui.theme.Anton
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.Typo
import fr.kolektif.domaine.Fil
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.Onglet
import fr.kolektif.domaine.Statut
import fr.kolektif.domaine.dateAffichee
import fr.kolektif.domaine.lieuAffiche
import fr.kolektif.domaine.maxJoueurs

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Matchs(fil: Fil?, chargement: Boolean, onRafraichir: () -> Unit, onOuvrir: (String) -> Unit) {
    var onglet by remember { mutableStateOf(Onglet.SONDAGE) }
    PullToRefreshBox(isRefreshing = chargement, onRefresh = onRafraichir, modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                Titre("Matchs")
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Onglet.entries.forEach { o ->
                        Puce("${o.libelle} ${fil?.de(o)?.size ?: 0}", onglet == o, { onglet = o }, Modifier.weight(1f))
                    }
                }
            }
            val liste = fil?.de(onglet).orEmpty()
            if (fil != null && liste.isEmpty()) {
                item {
                    Carte {
                        Text("Rien ici pour l’instant", fontFamily = Anton, fontSize = 22.sp, color = K.encre)
                        Text("Tire vers le bas pour actualiser.", style = Typo.sec)
                    }
                }
            }
            items(liste, key = { it.id }) { m -> CarteMatch(m) { onOuvrir(m.id) } }
        }
    }
}

@Composable
fun CarteMatch(m: Match, onClick: () -> Unit) {
    val total = maxJoueurs(m)
    val libres = (total - m.joueursInscrits.size).coerceAtLeast(0)
    Carte(onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Etiquette(
                when (m.statut) { Statut.SONDAGE -> "À caler"; Statut.CONFIRME -> "Confirmé"; else -> "Joué" },
                Modifier.weight(1f),
            )
            if (m.statut != Statut.TERMINE) {
                Text(if (libres == 0) "Complet" else "$libres place${if (libres > 1) "s" else ""}",
                    color = if (libres == 0) K.encreSec else K.vert, style = Typo.sec)
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(quand(dateAffichee(m)), fontFamily = Anton, fontSize = 24.sp, color = K.encre)
        Text(lieuAffiche(m).ifBlank { "Lieu à préciser" }, style = Typo.sec)
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Points(m.joueursInscrits.size, total)
            Spacer(Modifier.weight(1f))
            Text("${m.joueursInscrits.size}/$total", style = Typo.corps)
        }
    }
}
