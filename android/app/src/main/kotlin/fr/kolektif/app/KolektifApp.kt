package fr.kolektif.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

/** Firebase, configuré EN CODE : le même projet que la PWA (`inrun-five`).
 *
 *  Ces valeurs sont publiques par conception — elles sont déjà dans le site
 *  web. Ce qui protège les données, ce sont les règles Firestore, appliquées
 *  à cette app exactement comme à la PWA. Pas de google-services.json : il
 *  faudrait enregistrer l'app Android dans la console Firebase pour l'obtenir,
 *  et Auth (e-mail) + Firestore n'en ont pas besoin. */
class KolektifApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (FirebaseApp.getApps(this).isEmpty()) {
            FirebaseApp.initializeApp(
                this,
                FirebaseOptions.Builder()
                    .setApiKey("AIzaSyDAtK1Yo0qg0zQsNNU19JFbqrBuFEfPRgc")
                    .setApplicationId("1:942530257495:web:c5ccdcf6d0de6ba2f27912")
                    .setProjectId("inrun-five")
                    .setStorageBucket("inrun-five.firebasestorage.app")
                    .setGcmSenderId("942530257495")
                    .build(),
            )
        }
    }
}
