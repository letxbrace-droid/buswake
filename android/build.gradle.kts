// Le plugin Android (AGP) est déclaré dans app/build.gradle.kts, pas ici :
// il ne se résout que là où le dépôt Maven de Google est joignable (la CI).
// Ainsi le domaine se compile et se teste partout.
plugins {
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.jvm") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
