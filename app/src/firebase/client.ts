import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/** Cette configuration est PUBLIQUE par conception — elle part dans le bundle
 *  de toute façon, et Google la documente comme telle. Ce qui protège les
 *  données, ce sont les règles Firestore et App Check, jamais le secret de ces
 *  valeurs. La cacher dans un .env donnerait une fausse impression de sûreté.
 *
 *  À FAIRE (recommandation du cabinet, point 4) : activer Firebase App Check
 *  avec reCAPTCHA Enterprise. C'est lui qui empêche un tiers d'utiliser ces
 *  clés depuis un autre domaine. */
const firebaseConfig = {
  apiKey: 'AIzaSyDAtK1Yo0qg0zQsNNU19JFbqrBuFEfPRgc',
  authDomain: 'inrun-five.firebaseapp.com',
  projectId: 'inrun-five',
  storageBucket: 'inrun-five.firebasestorage.app',
  messagingSenderId: '942530257495',
  appId: '1:942530257495:web:c5ccdcf6d0de6ba2f27912',
  measurementId: 'G-M4Q43MD69E',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
