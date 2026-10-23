package fr.kolektif.app.ui.ecrans

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fr.kolektif.app.donnees.Depot
import fr.kolektif.app.donnees.messageErreur
import fr.kolektif.app.ui.composants.Avatar
import fr.kolektif.app.ui.composants.BadgeFiabilite
import fr.kolektif.app.ui.composants.BoutonGris
import fr.kolektif.app.ui.composants.BoutonVert
import fr.kolektif.app.ui.composants.Carte
import fr.kolektif.app.ui.composants.Etiquette
import fr.kolektif.app.ui.composants.Icones
import fr.kolektif.app.ui.composants.couleurAvatar
import fr.kolektif.app.ui.theme.Anton
import fr.kolektif.app.ui.theme.Grotesk
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.Typo
import fr.kolektif.domaine.Joueur
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.Place
import fr.kolektif.domaine.Statut
import fr.kolektif.domaine.apercuDesistement
import fr.kolektif.domaine.dateAffichee
import fr.kolektif.domaine.fiabilite
import fr.kolektif.domaine.lieuAffiche
import fr.kolektif.domaine.maxJoueurs
import fr.kolektif.domaine.placeEnRejoignant
import kotlinx.coroutines.launch

@Composable
fun DetailMatch(id: String, uid: String, onRetour: () -> Unit) {
    val ctx = LocalContext.current
    val portee = rememberCoroutineScope()
    val m by remember(id) { Depot.match(id) }.collectAsState(initial = null)
    var fiches by remember { mutableStateOf<Map<String, Joueur>>(emptyMap()) }
    var occupe by remember { mutableStateOf(false) }

    val tous = m?.let { it.joueursInscrits + it.waitlist }.orEmpty()
    LaunchedEffect(tous) { if (tous.isNotEmpty()) fiches = Depot.fiches(tous) }

    fun action(succes: String, bloc: suspend () -> Unit) {
        occupe = true
        portee.launch {
            runCatching { bloc() }
                .onSuccess { if (succes.isNotEmpty()) Toast.makeText(ctx, succes, Toast.LENGTH_SHORT).show() }
                .onFailure { Toast.makeText(ctx, messageErreur(it), Toast.LENGTH_LONG).show() }
            occupe = false
        }
    }

    DetailMatchContenu(
        m, uid, fiches, occupe, onRetour,
        onRejoindre = { match, banc ->
            action(if (banc) "Tu es sur le banc." else "Tu es sur le terrain.") { Depot.rejoindre(match, uid) }
        },
        onQuitter = { match -> action("Tu ne joues plus ce match.") { Depot.quitterMatch(match, uid) } },
        onVoter = { match, i, mien ->
            action(if (mien) "Vote retiré — tes 10 XP sont repris." else "Vote enregistré — 10 XP en route.") {
                Depot.voter(match, i, uid, retirer = mien)
            }
        },
    )
}

/** L'écran sans accès réseau : ce que les captures de test affichent. */
@Composable
fun DetailMatchContenu(
    m: Match?, uid: String, fiches: Map<String, Joueur>, occupe: Boolean, onRetour: () -> Unit,
    onRejoindre: (Match, Boolean) -> Unit, onQuitter: (Match) -> Unit, onVoter: (Match, Int, Boolean) -> Unit,
) {
    var confirmerDepart by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icones.retour, "Retour", tint = K.encre,
                modifier = Modifier.size(44.dp).clip(CircleShape).background(K.carteHaut).clickable(onClick = onRetour).padding(11.dp),
            )
            Spacer(Modifier.width(12.dp))
            Text("MATCH", fontFamily = Anton, fontSize = 26.sp, color = K.encre)
        }
        val match = m
        if (match == null) {
            Carte { Text("Chargement…", style = Typo.sec) }
            return@Column
        }
        val total = maxJoueurs(match)
        val place = placeEnRejoignant(match, uid)
        val cout = if (place == Place.DEJA_TITULAIRE) apercuDesistement(match) else null

        Carte {
            Etiquette(when (match.statut) { Statut.SONDAGE -> "À caler"; Statut.CONFIRME -> "Confirmé"; else -> "Joué" })
            Spacer(Modifier.height(4.dp))
            Text(quand(dateAffichee(match)), fontFamily = Anton, fontSize = 30.sp, color = K.encre)
            Text(lieuAffiche(match), style = Typo.corps)
            match.creneaux.firstOrNull { it.lieu == lieuAffiche(match) }?.adresse?.let {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                    Icon(Icones.carte, null, tint = K.vert, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(it, style = Typo.sec)
                }
            }
            if (match.message.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text("« ${match.message} »", style = Typo.sec)
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Points(match.joueursInscrits.size, total)
                Spacer(Modifier.weight(1f))
                Text("${match.joueursInscrits.size}/$total", style = Typo.corps)
            }
            if (match.statut == Statut.SONDAGE || match.statut == Statut.CONFIRME) {
                Spacer(Modifier.height(14.dp))
                when {
                    confirmerDepart && cout != null -> {
                        // Se désister qui COÛTE se confirme, chiffre à l'appui.
                        Column(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(K.creux)
                                .border(1.dp, K.feu.copy(alpha = 0.5f), RoundedCornerShape(14.dp)).padding(14.dp),
                        ) {
                            Text(
                                "Te désister maintenant te coûte ${-cout.xp} XP" +
                                    if (cout.remplacantPret) " — ${-cout.xpSiRemplace} seulement, car un remplaçant prendra ta place." else ".",
                                style = Typo.corps,
                            )
                            if (cout.tardif) Text("À moins de 24 h, c’est un désistement tardif : il compte dans ta fiabilité.", style = Typo.sec)
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                BoutonVert("Je viens quand même", { confirmerDepart = false }, Modifier.weight(1f))
                                BoutonGris("Me désister", {
                                    confirmerDepart = false
                                    onQuitter(match)
                                }, Modifier.weight(1f), actif = !occupe)
                            }
                        }
                    }
                    place == Place.DEJA_TITULAIRE || place == Place.DEJA_BANC -> BoutonGris(
                        if (place == Place.DEJA_BANC) "Quitter le banc" else "Je ne viens plus",
                        {
                            if (cout != null && cout.xp < 0) confirmerDepart = true
                            else onQuitter(match)
                        },
                        Modifier.fillMaxWidth(), actif = !occupe,
                    )
                    else -> {
                        BoutonVert(
                            if (place == Place.BANC) "Match plein — me mettre sur le banc" else "Je viens",
                            { onRejoindre(match, place == Place.BANC) },
                            Modifier.fillMaxWidth(), actif = !occupe,
                        )
                        if (place == Place.BANC) Text("Tu entres dès que quelqu’un se désiste.", style = Typo.sec, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }
        }

        if (match.statut == Statut.SONDAGE && match.creneaux.isNotEmpty()) {
            Carte {
                Etiquette("Quel créneau ?")
                Spacer(Modifier.height(10.dp))
                match.creneaux.forEachIndexed { i, c ->
                    val votants = match.votes[i.toString()].orEmpty()
                    val mien = uid in votants
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 4.dp).clip(RoundedCornerShape(12.dp))
                            .background(if (mien) K.creux else K.carteBas)
                            .border(1.dp, if (mien) K.vert.copy(alpha = 0.6f) else K.bord, RoundedCornerShape(12.dp))
                            .clickable(enabled = !occupe) { onVoter(match, i, mien) }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(quand(c.date), fontFamily = Grotesk, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = K.encre)
                            Text(c.lieu, style = Typo.sec)
                        }
                        Text("${votants.size}", fontFamily = Grotesk, fontSize = 16.sp, color = if (mien) K.vert else K.encreSec)
                    }
                }
            }
        }

        Carte {
            Etiquette("Sur le terrain · ${match.joueursInscrits.size}")
            Spacer(Modifier.height(8.dp))
            match.joueursInscrits.forEach { j -> LigneJoueur(j, uid, fiches[j]) }
            if (match.waitlist.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Etiquette("Sur le banc · ${match.waitlist.size}")
                Spacer(Modifier.height(8.dp))
                match.waitlist.forEach { j -> LigneJoueur(j, uid, fiches[j]) }
            }
        }
        Spacer(Modifier.height(90.dp))
    }
}

@Composable
private fun LigneJoueur(j: String, moi: String, fiche: Joueur?) {
    val pseudo = fiche?.pseudo ?: "Joueur"
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Avatar(pseudo, 30, couleurAvatar(j))
        Text(if (j == moi) "Toi" else pseudo, style = Typo.corps.copy(fontWeight = if (j == moi) FontWeight.SemiBold else FontWeight.Normal))
        BadgeFiabilite(fiche?.let { fiabilite(it.historique) })
    }
}
