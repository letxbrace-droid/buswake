pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
        google()
    }
}

rootProject.name = "kolektif-android"

// La règle métier, en Kotlin pur : compilable et testable sans SDK Android.
include(":domaine")

// L'application exige le SDK Android. La CI (GitHub Actions) l'a toujours ;
// un poste sans SDK peut quand même faire tourner les tests du domaine.
// Sur la CI, l'absence de SDK fait ÉCHOUER le build (voir le workflow) au
// lieu de sauter l'app en silence.
if (System.getenv("ANDROID_HOME") != null || System.getenv("ANDROID_SDK_ROOT") != null ||
    file("local.properties").exists()
) {
    include(":app")
}
