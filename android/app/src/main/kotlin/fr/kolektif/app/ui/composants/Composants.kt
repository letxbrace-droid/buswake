package fr.kolektif.app.ui.composants

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fr.kolektif.app.ui.theme.Grotesk
import fr.kolektif.app.ui.theme.K
import fr.kolektif.app.ui.theme.Typo
import fr.kolektif.domaine.Fiabilite
import fr.kolektif.domaine.StatutFiabilite

private val FormeCarte = RoundedCornerShape(20.dp)

/** LA CARTE — pleine, sans flou. Le relief vient de la lumière : une face
 *  plus claire en haut et une arête haute éclairée (le dégradé du bord). */
@Composable
fun Carte(modifier: Modifier = Modifier, onClick: (() -> Unit)? = null, contenu: @Composable ColumnScope.() -> Unit) {
    val source = remember { MutableInteractionSource() }
    val appuye by source.collectIsPressedAsState()
    Column(
        modifier
            .fillMaxWidth()
            .offset(y = if (appuye) 2.dp else 0.dp)
            .shadow(if (appuye) 2.dp else 8.dp, FormeCarte, ambientColor = Color.Black, spotColor = Color.Black)
            .clip(FormeCarte)
            .background(Brush.verticalGradient(listOf(K.carteHaut, K.carteBas)))
            .border(BorderStroke(1.dp, Brush.verticalGradient(listOf(Color(0x40FFFFFF), Color(0x0FFFFFFF)))), FormeCarte)
            .then(if (onClick != null) Modifier.clickable(interactionSource = source, indication = null, onClick = onClick) else Modifier)
            .padding(16.dp),
        content = contenu,
    )
}

@Composable
fun Titre(texte: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(texte.uppercase(), style = Typo.titre)
        Spacer(Modifier.height(6.dp))
        Box(Modifier.width(28.dp).height(3.dp).clip(CircleShape).background(K.vert))
    }
}

@Composable
fun Etiquette(texte: String, modifier: Modifier = Modifier) =
    Text(texte.uppercase(), style = Typo.etiquette, modifier = modifier)

/** Le bouton d'action : vert plein, tranche sombre dessous, et il DESCEND
 *  quand on appuie — comme une vraie touche. */
@Composable
fun BoutonVert(texte: String, onClick: () -> Unit, modifier: Modifier = Modifier, actif: Boolean = true) =
    Bouton(texte, onClick, modifier, actif, fond = K.vert, tranche = K.vertSombre, encre = K.fond)

@Composable
fun BoutonGris(texte: String, onClick: () -> Unit, modifier: Modifier = Modifier, actif: Boolean = true, encre: Color = K.encre) =
    Bouton(texte, onClick, modifier, actif, fond = K.bordClair, tranche = Color.Black, encre = encre)

@Composable
private fun Bouton(texte: String, onClick: () -> Unit, modifier: Modifier, actif: Boolean, fond: Color, tranche: Color, encre: Color) {
    val source = remember { MutableInteractionSource() }
    val appuye by source.collectIsPressedAsState()
    val forme = RoundedCornerShape(50)
    Box(modifier.heightIn(min = 52.dp)) {
        // La tranche : la même forme, décalée de 3 dp, plus sombre.
        Box(Modifier.matchParentSize().offset(y = 3.dp).clip(forme).background(if (actif) tranche else K.creux))
        Box(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 50.dp)
                .offset(y = if (appuye && actif) 3.dp else 0.dp)
                .clip(forme)
                .background(if (actif) fond else K.bord)
                .clickable(enabled = actif, interactionSource = source, indication = null, onClick = onClick)
                .padding(horizontal = 20.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(texte, fontFamily = Grotesk, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = if (actif) encre else K.encreSec)
        }
    }
}

/** Une puce de choix : en relief au repos, ENFONCÉE quand choisie. */
@Composable
fun Puce(texte: String, choisie: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val forme = RoundedCornerShape(50)
    Box(
        modifier
            .heightIn(min = 44.dp)
            .clip(forme)
            .background(if (choisie) Color(0xFF1B2A15) else K.carteHaut)
            .border(1.dp, if (choisie) K.vert.copy(alpha = 0.55f) else K.bordClair, forme)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texte, fontFamily = Grotesk, fontSize = 14.sp,
            fontWeight = if (choisie) FontWeight.SemiBold else FontWeight.Medium,
            color = if (choisie) K.vert else K.encreSec)
    }
}

/** Le champ creusé : on écrit DANS la surface. */
@Composable
fun Champ(
    valeur: String, onChange: (String) -> Unit, libelle: String,
    modifier: Modifier = Modifier, motDePasse: Boolean = false, clavier: KeyboardType = KeyboardType.Text,
) {
    Column(modifier.fillMaxWidth()) {
        Text(libelle, style = Typo.sec)
        Spacer(Modifier.height(6.dp))
        BasicTextField(
            value = valeur,
            onValueChange = onChange,
            singleLine = true,
            textStyle = Typo.corps.copy(fontSize = 16.sp),
            cursorBrush = SolidColor(K.vert),
            visualTransformation = if (motDePasse) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = if (motDePasse) KeyboardType.Password else clavier),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(K.creux)
                .border(1.dp, Brush.verticalGradient(listOf(Color.Black, Color(0x14FFFFFF))), RoundedCornerShape(12.dp))
                .padding(horizontal = 14.dp, vertical = 14.dp),
        )
    }
}

/** Le widget lapin — et son contraire, « Fiable ». Rien entre les deux. */
@Composable
fun BadgeFiabilite(f: Fiabilite?) {
    if (f == null || (f.statut != StatutFiabilite.LAPIN && f.statut != StatutFiabilite.FIABLE)) return
    val lapin = f.statut == StatutFiabilite.LAPIN
    val c = if (lapin) K.feu else K.vert
    Row(
        Modifier.clip(CircleShape).background(if (lapin) Color(0xFF2B1A0F) else Color(0xFF1B2A15)).padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(if (lapin) Icones.lapin else Icones.verifie, null, tint = c, modifier = Modifier.size(14.dp))
        Text(if (lapin) "Lapin" else "Fiable", color = c, fontFamily = Grotesk, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
    }
}

/** Les icônes de la PWA (composants/Icone.tsx), mêmes tracés : une seule
 *  identité visuelle entre le web et l'Android. */
object Icones {
    private fun trace(nom: String, d: String) = ImageVector.Builder(nom, 24.dp, 24.dp, 24f, 24f).apply {
        addPath(
            pathData = addPathNodes(d),
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        )
    }.build()

    val accueil = trace("accueil", "M3 10.6 12 3l9 7.6M5.4 9.2V20a1 1 0 0 0 1 1h3.3v-5.4h4.6V21h3.3a1 1 0 0 0 1-1V9.2")
    val ballon = trace("ballon", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.6 4.1 3-1.6 4.8H9.5L7.9 10.6l4.1-3Z")
    val joueur = trace("joueur", "M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.5 20.5a7.5 7.5 0 0 1 15 0")
    val retour = trace("retour", "M15 5l-7 7 7 7")
    val lapin = trace("lapin", "M9.6 10.6C8.2 8 7.6 4.4 8.8 3.5c1.3-.9 2.9 2.2 3.1 5.6m2.5 1.5c1.4-2.6 2-6.2.8-7.1-1.3-.9-2.9 2.2-3.1 5.6M12 21a5.4 5.4 0 1 0 0-10.8A5.4 5.4 0 0 0 12 21Zm-2.1-5.6h.01m4.2 0h.01M11 18.2h2")
    val verifie = trace("verifie", "M12 3.4 19 6v5.4c0 4-2.8 7.3-7 9.1-4.2-1.8-7-5.1-7-9.1V6l7-2.6Zm-2.8 8.5 2 2 3.6-3.7")
    val carte = trace("carte", "M9 4.2 3.8 6.4v13.4L9 17.6l6 2.2 5.2-2.2V4.2L15 6.4 9 4.2Zm0 0v13.4m6-11v13.4")
}

/** Initiales sur pastille — l'avatar sans photo. */
@Composable
fun Avatar(pseudo: String, taille: Int = 36, couleur: Color = Color(0xFF2D4A8C)) {
    Box(Modifier.size(taille.dp).clip(CircleShape).background(couleur), contentAlignment = Alignment.Center) {
        Text(pseudo.take(2).uppercase(), color = K.encre, fontFamily = Grotesk, fontWeight = FontWeight.Bold, fontSize = (taille / 3).sp)
    }
}

/** Couleur d'avatar stable par joueur (même idée que domaine/avatar.ts). */
fun couleurAvatar(uid: String): Color {
    val teintes = listOf(0xFF2D4A8C, 0xFF6B3A8C, 0xFF3D6B2E, 0xFF2E4F8C, 0xFF8C2E4A, 0xFF2E6B5A, 0xFF6B5A2E)
    return Color(teintes[Math.floorMod(uid.hashCode(), teintes.size)])
}
