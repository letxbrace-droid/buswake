package fr.kolektif.app.ui.ecrans

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fr.kolektif.app.donnees.Depot
import fr.kolektif.app.donnees.messageErreur
import fr.kolektif.app.ui.composants.BoutonVert
import fr.kolektif.app.ui.composants.Carte
import fr.kolektif.app.ui.composants.Champ
import fr.kolektif.app.ui.composants.Puce
import fr.kolektif.app.ui.theme.Anton
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.Typo
import kotlinx.coroutines.launch

@Composable
fun Connexion() {
    val ctx = LocalContext.current
    val portee = rememberCoroutineScope()
    var inscription by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var mdp by remember { mutableStateOf("") }
    var pseudo by remember { mutableStateOf("") }
    var cp by remember { mutableStateOf("") }
    var occupe by remember { mutableStateOf(false) }
    var erreur by remember { mutableStateOf<String?>(null) }

    // Mêmes bornes que les règles Firestore : 1 à 24 caractères, jamais l'e-mail.
    val probleme = when {
        email.isBlank() || mdp.isBlank() -> "Renseigne ton e-mail et ton mot de passe."
        inscription && pseudo.isBlank() -> "Choisis un pseudo."
        inscription && pseudo.trim().length > 24 -> "24 caractères au maximum pour le pseudo."
        inscription && pseudo.trim().equals(email.trim(), ignoreCase = true) -> "Ton pseudo ne peut pas être ton e-mail."
        else -> null
    }

    Column(
        Modifier.fillMaxSize().background(K.fond).systemBarsPadding().imePadding()
            .verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(40.dp))
        Text(
            buildAnnotatedString {
                withStyle(SpanStyle(color = K.vert)) { append("K") }
                append("OLEKTIF")
            },
            fontFamily = Anton, fontSize = 48.sp, color = K.encre,
        )
        Text("Trouve des joueurs, crée ton match, réunis les 10.", style = Typo.sec)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Puce("Connexion", !inscription, { inscription = false; erreur = null }, Modifier.weight(1f))
            Puce("Inscription", inscription, { inscription = true; erreur = null }, Modifier.weight(1f))
        }
        Carte {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Champ(email, { email = it }, "E-mail", clavier = KeyboardType.Email)
                Champ(mdp, { mdp = it }, "Mot de passe", motDePasse = true)
                if (inscription) {
                    Champ(pseudo, { pseudo = it.take(24) }, "Pseudo (visible par tous)")
                    Champ(cp, { cp = it.filter(Char::isDigit).take(5) }, "Code postal (facultatif)", clavier = KeyboardType.Number)
                }
            }
        }
        erreur?.let { Text(it, color = K.feu, style = Typo.sec) }
        BoutonVert(
            if (occupe) "Un instant…" else if (inscription) "Créer mon compte" else "Se connecter",
            onClick = {
                val p = probleme
                if (p != null) { erreur = p; return@BoutonVert }
                occupe = true; erreur = null
                portee.launch {
                    runCatching {
                        if (inscription) Depot.inscrire(email, mdp, pseudo, cp) else Depot.connecter(email, mdp)
                    }.onFailure {
                        erreur = messageErreur(it)
                        Toast.makeText(ctx, erreur, Toast.LENGTH_SHORT).show()
                    }
                    occupe = false
                }
            },
            modifier = Modifier.fillMaxWidth(),
            actif = !occupe,
        )
        Text(
            "La connexion Google de la version web arrivera dans une prochaine version de l’app.",
            style = Typo.sec.copy(color = K.encreFaible, fontSize = 12.sp),
        )
    }
}
