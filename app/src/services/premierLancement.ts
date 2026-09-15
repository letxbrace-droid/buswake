const CLE = 'kolektif.accueilli';

/** Le passage par l'écran d'accueil se retient LOCALEMENT, pas dans Firestore :
 *  c'est une propriété de cet appareil-ci, pas du compte. Quelqu'un qui
 *  installe l'app sur un second téléphone mérite de revoir la promesse.
 *
 *  Un stockage indisponible (navigation privée, site data bloqué) ne doit pas
 *  faire échouer le lancement : dans le doute on montre l'écran, ce qui coûte
 *  un clic — l'inverse bloquerait l'entrée. */
export function dejaAccueilli(): boolean {
  try {
    return localStorage.getItem(CLE) === '1';
  } catch {
    return false;
  }
}

export function marquerAccueilli(): void {
  try {
    localStorage.setItem(CLE, '1');
  } catch {
    // Sans mémoire, l'écran réapparaîtra. C'est le moindre mal.
  }
}
