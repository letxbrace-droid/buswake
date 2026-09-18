import { useNavigate } from 'react-router-dom';
import { MotDePasse, SupprimerCompte } from '../ecrans/Compte';
import { useToast } from '../composants/Toasts';
import type { ChangementMdp } from '../domaine/compte';

/** En développement, `auth.currentUser` est nul — le conteneur n'atteint pas
 *  Firebase. Les fournisseurs sont figés pour que l'écran reste travaillable
 *  et mesurable. Éliminé du bundle de production. */
const fournisseursLocaux = () =>
  import.meta.env.DEV
    ? Promise.resolve(['password'])
    : import('../services/compte').then((m) => m.fournisseurs());

export function MotDePasseBranche({ fournisseurs }: { fournisseurs: readonly string[] }) {
  const aller = useNavigate();
  const toast = useToast();
  return (
    <MotDePasse
      fournisseurs={fournisseurs}
      onRetour={() => aller(-1)}
      onChanger={async (v: ChangementMdp) => {
        const { changerMotDePasse } = await import('../services/compte');
        await changerMotDePasse(v);
        toast('Mot de passe changé.', 'succes');
        aller(-1);
      }}
    />
  );
}

export function SupprimerCompteBranche({ fournisseurs }: { fournisseurs: readonly string[] }) {
  const aller = useNavigate();
  return (
    <SupprimerCompte
      fournisseurs={fournisseurs}
      onRetour={() => aller(-1)}
      onSupprimer={async (motDePasse) => {
        const { supprimerCompte } = await import('../services/compte');
        await supprimerCompte(motDePasse);
        // Pas de toast : le compte n'existe plus, la session tombe, et le
        // garde-fou renvoie vers l'entrée. Annoncer « c'est fait » à
        // quelqu'un qui vient de partir n'a pas de destinataire.
        aller('/connexion', { replace: true });
      }}
    />
  );
}

export { fournisseursLocaux };
