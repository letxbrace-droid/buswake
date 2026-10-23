package fr.kolektif.app.ui.ecrans

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fr.kolektif.app.ui.composants.Avatar
import fr.kolektif.app.ui.composants.BadgeFiabilite
import fr.kolektif.app.ui.composants.BoutonGris
import fr.kolektif.app.ui.composants.Carte
import fr.kolektif.app.ui.composants.Etiquette
import fr.kolektif.app.ui.composants.Titre
import fr.kolektif.app.ui.composants.couleurAvatar
import fr.kolektif.app.ui.theme.Anton
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.Typo
import fr.kolektif.domaine.Joueur
import fr.kolektif.domaine.StatutFiabilite
import fr.kolektif.domaine.fiabilite
import fr.kolektif.domaine.libelleFiabilite
import fr.kolektif.domaine.progressionDe

@Composable
fun Profil(moi: Joueur?, onDeconnexion: () -> Unit) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Titre("Profil")
        if (moi == null) {
            Carte { Text("Chargement…", style = Typo.sec) }
            return@Column
        }
        val p = progressionDe(moi.xp)
        Carte {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(moi.pseudo, 56, couleurAvatar(moi.uid))
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(moi.pseudo.uppercase(), fontFamily = Anton, fontSize = 24.sp, color = K.encre)
                    Text("${p.rang.label} · ${moi.xp} XP", color = Color(p.rang.couleur), style = Typo.sec.copy(color = Color(p.rang.couleur)))
                }
            }
            Spacer(Modifier.height(12.dp))
            Barre(p.fraction)
            Spacer(Modifier.height(6.dp))
            Text(p.suivant?.let { "${p.restant} XP avant ${it.label}" } ?: "Rang maximal atteint", style = Typo.sec)
        }

        val f = fiabilite(moi.historique)
        Carte {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Etiquette("Fiabilité")
                    Spacer(Modifier.height(4.dp))
                    Text(libelleFiabilite(f), style = Typo.corps)
                    if (f.statut == StatutFiabilite.LAPIN) {
                        Text("Le badge disparaît après quelques matchs honorés.", style = Typo.sec)
                    }
                }
                BadgeFiabilite(f)
            }
        }

        val stats = listOf(
            "Matchs joués" to moi.matchsJoues, "Homme du match" to moi.hommeDuMatch,
            "Buts" to moi.buts, "Passes déc." to moi.passes,
            "Lapins" to moi.lapins,
        )
        stats.chunked(2).forEach { ligne ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ligne.forEach { (libelle, valeur) ->
                    Carte(Modifier.weight(1f)) {
                        Etiquette(libelle)
                        Text("$valeur", fontFamily = Anton, fontSize = 32.sp, color = if (libelle == "Lapins" && valeur > 0) K.feu else K.encre)
                    }
                }
                if (ligne.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        BoutonGris("Se déconnecter", onDeconnexion, Modifier.fillMaxWidth())
        Spacer(Modifier.height(90.dp))
    }
}
