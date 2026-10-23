package fr.kolektif.app.donnees

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.Query
import fr.kolektif.domaine.Joueur
import fr.kolektif.domaine.Match
import fr.kolektif.domaine.Place
import fr.kolektif.domaine.placeEnRejoignant
import fr.kolektif.domaine.quitter
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.Date

/** La SEULE couche qui parle à Firebase — comme `services/` dans la PWA.
 *  Les écritures sont les mêmes, à la virgule près : elles passent les mêmes
 *  règles Firestore, éprouvées par le banc de l'émulateur. */
object Depot {
    private val auth get() = FirebaseAuth.getInstance()
    private val db get() = FirebaseFirestore.getInstance()

    // ---------- Session ----------
    fun session(): Flow<String?> = callbackFlow {
        val l = FirebaseAuth.AuthStateListener { trySend(it.currentUser?.uid) }
        auth.addAuthStateListener(l)
        awaitClose { auth.removeAuthStateListener(l) }
    }

    suspend fun connecter(email: String, mdp: String) {
        auth.signInWithEmailAndPassword(email.trim(), mdp).await()
    }

    /** Le profil naît à ZÉRO — la règle `compteNeuf()` refuse tout le reste. */
    suspend fun inscrire(email: String, mdp: String, pseudo: String, codePostal: String) {
        val cred = auth.createUserWithEmailAndPassword(email.trim(), mdp).await()
        val uid = cred.user?.uid ?: error("Inscription impossible")
        db.collection("users").document(uid).set(
            mapOf(
                "email" to email.trim(),
                "pseudo" to pseudo.trim(),
                "posteFavori" to "milieu",
                "atouts" to mapOf("vitesse" to 70, "dribble" to 70, "frappe" to 70, "defense" to 70, "physique" to 70),
                "codePostal" to codePostal.trim().ifBlank { null },
                "xp" to 0,
                "badges" to emptyList<String>(),
                "stats" to mapOf("matchsJoues" to 0, "victoires" to 0, "hommeDuMatch" to 0),
                "profilComplet" to false,
                "createdAt" to FieldValue.serverTimestamp(),
            ),
        ).await()
    }

    fun deconnecter() = auth.signOut()

    // ---------- Lectures ----------
    fun profil(uid: String): Flow<Joueur?> = callbackFlow {
        val r = db.collection("users").document(uid).addSnapshotListener { s, _ ->
            trySend(if (s != null && s.exists()) s.versJoueur() else null)
        }
        awaitClose { r.remove() }
    }

    fun match(id: String): Flow<Match?> = callbackFlow {
        val r = db.collection("matchs").document(id).addSnapshotListener { s, _ ->
            trySend(if (s != null && s.exists()) s.versMatch() else null)
        }
        awaitClose { r.remove() }
    }

    /** Le fil : les trois requêtes BORNÉES de `services/fil.ts`, les seules que
     *  les règles autorisent. Une requête refusée rend une liste vide. */
    suspend fun fil(uid: String): List<Match> = coroutineScope {
        val maintenant = Date()
        val matchs = db.collection("matchs")
        suspend fun lire(q: Query): List<Match> =
            runCatching { q.get().await().documents.mapNotNull { it.versMatch() } }.getOrDefault(emptyList())
        val publics = async {
            lire(matchs.whereEqualTo("visibilite", "public").whereGreaterThan("finVisible", maintenant)
                .orderBy("finVisible", Query.Direction.ASCENDING).limit(60))
        }
        val miens = async {
            lire(matchs.whereArrayContains("joueursInscrits", uid).whereGreaterThan("finVisible", maintenant))
        }
        val histo = async {
            lire(matchs.whereArrayContains("joueursInscrits", uid).whereEqualTo("statut", "terminé").limit(20))
        }
        (publics.await() + miens.await() + histo.await()).distinctBy { it.id }
    }

    /** Pseudos et historiques, par lots de dix. */
    suspend fun fiches(uids: List<String>): Map<String, Joueur> = coroutineScope {
        uids.distinct().filter { it.isNotBlank() }.chunked(10).map { lot ->
            async {
                runCatching {
                    db.collection("users").whereIn(FieldPath.documentId(), lot).get().await()
                        .documents.map { it.versJoueur() }
                }.getOrDefault(emptyList())
            }
        }.flatMap { it.await() }.associateBy { it.uid }
    }

    // ---------- Écritures ----------
    /** arrayUnion : deux joueurs qui rejoignent à la même seconde ne
     *  s'effacent pas l'un l'autre. */
    suspend fun rejoindre(m: Match, uid: String): Place {
        val place = placeEnRejoignant(m, uid)
        val ref = db.collection("matchs").document(m.id)
        when (place) {
            Place.TITULAIRE -> ref.update(
                mapOf("joueursInscrits" to FieldValue.arrayUnion(uid), "waitlist" to FieldValue.arrayRemove(uid)),
            ).await()
            Place.BANC -> ref.update("waitlist", FieldValue.arrayUnion(uid)).await()
            else -> {}
        }
        return place
    }

    suspend fun quitterMatch(m: Match, uid: String) {
        val e = quitter(m, uid)
        db.collection("matchs").document(m.id)
            .update(mapOf("joueursInscrits" to e.joueursInscrits, "waitlist" to e.waitlist)).await()
    }

    suspend fun voter(m: Match, index: Int, uid: String, retirer: Boolean) {
        db.collection("matchs").document(m.id)
            .update("votes.$index", if (retirer) FieldValue.arrayRemove(uid) else FieldValue.arrayUnion(uid)).await()
    }
}

/** Les erreurs Firebase, en français et actionnables (domaine/erreurs.ts). */
fun messageErreur(e: Throwable): String = when (e) {
    is FirebaseAuthException -> when (e.errorCode) {
        "ERROR_INVALID_EMAIL" -> "Adresse e-mail invalide."
        "ERROR_WRONG_PASSWORD", "ERROR_INVALID_CREDENTIAL", "ERROR_USER_NOT_FOUND" -> "E-mail ou mot de passe incorrect."
        "ERROR_EMAIL_ALREADY_IN_USE" -> "Un compte existe déjà avec cet e-mail."
        "ERROR_WEAK_PASSWORD" -> "Mot de passe trop court : 6 caractères minimum."
        "ERROR_TOO_MANY_REQUESTS" -> "Trop de tentatives. Réessaie dans quelques minutes."
        else -> "Connexion impossible. Réessaie."
    }
    is FirebaseFirestoreException -> when (e.code) {
        FirebaseFirestoreException.Code.PERMISSION_DENIED ->
            "Le serveur a refusé cette action (permission refusée)."
        FirebaseFirestoreException.Code.UNAVAILABLE -> "Pas de connexion au serveur. Vérifie ton réseau."
        FirebaseFirestoreException.Code.NOT_FOUND -> "Cet élément n’existe plus."
        else -> "Ça n’a pas marché. Réessaie."
    }
    else -> e.message?.takeIf { it.isNotBlank() && it.any { c -> c in "éèàçù’" } } ?: "Ça n’a pas marché. Réessaie."
}
