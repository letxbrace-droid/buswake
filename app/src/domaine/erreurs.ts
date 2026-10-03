/** Le message d'une action ratée, en français et actionnable.
 *
 *  Firestore rejette en anglais technique : « Missing or insufficient
 *  permissions. » Affiché tel quel dans un toast, ça ne dit rien au joueur
 *  — ni à nous quand il nous envoie la capture. */
export function messageAction(e: unknown): string {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'permission-denied':
      return 'Le serveur a refusé cette action (permission refusée). Si l’app vient d’être mise à jour, ses règles ne le sont peut-être pas encore.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Pas de connexion au serveur. Vérifie ton réseau et réessaie.';
    case 'not-found':
      return 'Cet élément n’existe plus.';
    case 'unauthenticated':
      return 'Ta session a expiré : reconnecte-toi.';
  }
  if (e instanceof Error && e.message && !/^[A-Za-z ]+\.?$/.test(e.message)) return e.message;
  return 'Ça n’a pas marché. Réessaie.';
}
