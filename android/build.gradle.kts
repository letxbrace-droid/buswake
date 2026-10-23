// Tous les plugins sont déclarés ICI, à la racine : Kotlin-Android doit voir
// les classes du plugin Android dans le même chargeur de classes. Les
// déclarer dans des sous-projets différents fait échouer le build
// (« Could not generate a decorated class for type KotlinAndroidTarget »).
//
// Conséquence : le projet ne se configure que là où le dépôt Maven de Google
// est joignable (la CI). Les tests du domaine y tournent avant l'APK.
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.jvm") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    // Captures d'écran des composables, rendues sur la JVM (sans émulateur).
    id("app.cash.paparazzi") version "1.3.5" apply false
}
