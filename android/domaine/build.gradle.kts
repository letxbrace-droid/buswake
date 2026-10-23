plugins {
    id("org.jetbrains.kotlin.jvm")
}

// Cible Java 17 sans imposer de JDK précis : la CI tourne en 17, un poste
// en 21 compile pareil.
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }

dependencies {
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.3")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    // Les tests de concordance lisent functions/index.js : le barème du
    // serveur fait autorité, l'app ne fait que l'annoncer.
    systemProperty("kolektif.racine", rootProject.projectDir.parentFile.absolutePath)
}
