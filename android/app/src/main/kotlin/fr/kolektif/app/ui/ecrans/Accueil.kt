package fr.kolektif.app.ui.ecrans

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fr.kolektif.app.ui.composants.BoutonGris
import fr.kolektif.app.ui.composants.BoutonVert
import fr.kolektif.app.ui.composants.Carte
import fr.kolektif.app.ui.composants.Etiquette
import fr.kolektif.app.ui.theme.Anton
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.Typo
import fr.kolektif.domaine.Joueur
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.dateAffichee
import fr.kolektif.domaine.lieuAffiche
import fr.kolektif.domaine.maxJoueurs
import fr.kolektif.domaine.progressionDe

@Composable
fun Accueil(moi: Joueur?, prochain: Match?, onOuvrir: (String) -> Unit, onMatchs: () -> Unit) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("SALUT ${(moi?.pseudo ?: "").uppercase()}", fontFamily = Anton, fontSize = 30.sp, color = K.encre, modifier = Modifier.weight(1f))
            Text("${moi?.xp ?: 0} XP", style = Typo.sec)
        }

        Carte(onClick = prochain?.let { { onOuvrir(it.id) } }) {
            Etiquette("Le prochain")
            Spacer(Modifier.height(6.dp))
            if (prochain == null) {
                Text("Aucun match prévu", fontFamily = Anton, fontSize = 28.sp, color = K.encre)
                Text("Rejoins un match près de chez toi.", style = Typo.sec)
                Spacer(Modifier.height(14.dp))
                BoutonVert("Voir les matchs", onMatchs, Modifier.fillMaxWidth())
            } else {
                Text(quand(dateAffichee(prochain)), fontFamily = Anton, fontSize = 30.sp, color = K.encre)
                Text(
                    "${lieuAffiche(prochain)} · ${prochain.joueursInscrits.size} inscrits sur ${maxJoueurs(prochain)}",
                    style = Typo.sec,
                )
                Spacer(Modifier.height(14.dp))
                BoutonVert("Voir le match", { onOuvrir(prochain.id) }, Modifier.fillMaxWidth())
            }
        }

        if (moi != null) {
            val p = progressionDe(moi.xp)
            Carte {
                Etiquette("Ton rang")
                Spacer(Modifier.height(6.dp))
                Text(p.rang.label, color = Color(p.rang.couleur), fontFamily = Anton, fontSize = 26.sp)
                Spacer(Modifier.height(10.dp))
                Barre(p.fraction)
                Spacer(Modifier.height(6.dp))
                Text(p.suivant?.let { "${p.restant} XP avant ${it.label}" } ?: "Rang maximal atteint", style = Typo.sec)
            }
        }
        BoutonGris("Tous les matchs", onMatchs, Modifier.fillMaxWidth())
        Spacer(Modifier.height(90.dp))
    }
}

@Composable
fun Barre(fraction: Float, couleur: Color = K.vert) {
    Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(K.creux)) {
        Box(Modifier.fillMaxWidth(fraction.coerceIn(0f, 1f)).height(8.dp).clip(CircleShape).background(couleur))
    }
}

/** Les places : un point par joueur, plein quand quelqu'un est là. */
@Composable
fun Points(inscrits: Int, total: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) {
        repeat(total.coerceAtMost(20)) { i ->
            Box(Modifier.size(if (i < inscrits) 9.dp else 7.dp).clip(CircleShape).background(if (i < inscrits) K.vert else K.bordClair))
        }
    }
}
