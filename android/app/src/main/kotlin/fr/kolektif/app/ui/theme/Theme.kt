@file:OptIn(ExperimentalTextApi::class)

package fr.kolektif.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import fr.kolektif.app.R

/** La palette de la PWA (styles/socle.css), PLEINE : aucune couleur à
 *  transparence pour une surface — c'est ce qui donnait l'effet « voile ». */
object K {
    val fond = Color(0xFF0F0F0F)
    val surface = Color(0xFF161616)
    val carteHaut = Color(0xFF2B2B2B)
    val carteBas = Color(0xFF1D1D1D)
    val creux = Color(0xFF121212)
    val bord = Color(0xFF2C2C2C)
    val bordClair = Color(0xFF3B3B3B)
    val vert = Color(0xFF5DD62C)
    val vertSombre = Color(0xFF337418)
    val feu = Color(0xFFFF8A3D)
    val rouge = Color(0xFFFF6B7D)
    val or = Color(0xFFFFD700)
    val encre = Color(0xFFF8F8F8)
    val encreSec = Color(0xFFD4D4D4)
    val encreFaible = Color(0xFFB3B3B3)
}

private fun groteskPoids(w: Int) =
    Font(R.font.spacegrotesk, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w)))

val Grotesk = FontFamily(groteskPoids(400), groteskPoids(500), groteskPoids(600), groteskPoids(700))
val Anton = FontFamily(Font(R.font.anton))

object Typo {
    val titre = TextStyle(fontFamily = Anton, fontSize = 30.sp, letterSpacing = 0.025.em, color = K.encre)
    val grandChiffre = TextStyle(fontFamily = Anton, fontSize = 34.sp, color = K.encre)
    val corps = TextStyle(fontFamily = Grotesk, fontSize = 15.sp, color = K.encre)
    val sec = TextStyle(fontFamily = Grotesk, fontSize = 13.sp, color = K.encreSec)
    /** L'étiquette de section : 13 sp, gras, capitales — lisible, pas pâle. */
    val etiquette = TextStyle(
        fontFamily = Grotesk, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.08.em, color = K.encreSec,
    )
}

@Composable
fun KolektifTheme(contenu: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = K.vert, onPrimary = K.fond,
            background = K.fond, onBackground = K.encre,
            surface = K.surface, onSurface = K.encre,
            surfaceVariant = K.carteBas, onSurfaceVariant = K.encreSec,
            error = K.rouge,
        ),
        content = contenu,
    )
}
