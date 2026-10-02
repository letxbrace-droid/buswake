import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plaque } from '../composants/Plaque';
import { messageErreur } from '../domaine/auth';
import { ChangementMdpSchema, estCompteGooglePur, type ChangementMdp } from '../domaine/compte';

export function MotDePasse({
  fournisseurs, onChanger,
}: {
  fournisseurs: readonly string[];
  onChanger(v: ChangementMdp): Promise<void>;
}) {
  const [erreur, setErreur] = useState('');
  const f = useForm<ChangementMdp>({
    resolver: zodResolver(ChangementMdpSchema),
    defaultValues: { actuel: '', nouveau: '', confirmation: '' },
  });

  // Un compte Google n'a pas de mot de passe chez nous. Montrer le
  // formulaire donnerait un échec incompréhensible après trois champs
  // remplis.
  if (estCompteGooglePur(fournisseurs)) {
    return (
      <Coque titre="Mot de passe">
        <Plaque className="p-5">
          <p className="text-sm text-(--color-encre-sec)">
            Ton compte passe par Google. Ton mot de passe se gère dans ton compte Google,
            pas ici.
          </p>
        </Plaque>
      </Coque>
    );
  }

  return (
    <Coque titre="Mot de passe">
      <Plaque className="p-5">
      <form
        noValidate
        onSubmit={f.handleSubmit(async (v) => {
          setErreur('');
          try {
            await onChanger(v);
            f.reset();
          } catch (e) {
            setErreur(messageErreur(e));
          }
        })}
        className="flex flex-col gap-3"
      >
        <Champ
          label="Mot de passe actuel"
          type="password"
          autoComplete="current-password"
          erreur={f.formState.errors.actuel?.message}
          {...f.register('actuel')}
        />
        <Champ
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          erreur={f.formState.errors.nouveau?.message}
          {...f.register('nouveau')}
        />
        <Champ
          label="Répète le nouveau"
          type="password"
          autoComplete="new-password"
          erreur={f.formState.errors.confirmation?.message}
          {...f.register('confirmation')}
        />
        {erreur && (
          <p role="alert" className="text-center text-sm text-(--color-feu)">
            {erreur}
          </p>
        )}
        <button
          type="submit"
          disabled={f.formState.isSubmitting}
          className="btn btn-vert mt-1 w-full"
        >
          {f.formState.isSubmitting ? 'Un instant…' : 'Changer mon mot de passe'}
        </button>
      </form>
      </Plaque>
    </Coque>
  );
}

export function SupprimerCompte({
  fournisseurs, onSupprimer, onRetour,
}: {
  fournisseurs: readonly string[];
  onSupprimer(motDePasse?: string): Promise<void>;
  onRetour(): void;
}) {
  const [mdp, setMdp] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const google = estCompteGooglePur(fournisseurs);

  // On fait ÉCRIRE le mot. Une case à cocher se coche sans lire ; taper
  // SUPPRIMER oblige à s'arrêter une seconde sur ce qu'on fait.
  const pret = confirme.trim().toUpperCase() === 'SUPPRIMER' && (google || mdp.length > 0);

  return (
    <Coque titre="Supprimer mon compte">
      <Plaque className="mb-4 p-5">
        <p className="text-sm text-(--color-encre)">
          Ton compte, ta carte joueur, tes statistiques et ton XP seront{' '}
          <b className="text-(--color-rouge)">définitivement supprimés</b>.
        </p>
        <p className="mt-2 text-sm text-(--color-encre-sec)">
          C’est irréversible : personne, pas même nous, ne peut les rétablir.
        </p>
        {/* On dit ce qui NE disparaît pas. Croire qu'on efface tout et
            découvrir son pseudo dans un vieux match est pire que d'être
            prévenu. */}
        <p className="mt-2 text-xs text-(--color-encre-faible)">
          Les matchs auxquels tu as participé restent visibles pour les autres joueurs.
        </p>
      </Plaque>

      <div className="flex flex-col gap-3">
        {!google && (
          <Champ
            label="Ton mot de passe"
            type="password"
            autoComplete="current-password"
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
          />
        )}
        <Champ
          label="Écris SUPPRIMER pour confirmer"
          value={confirme}
          autoCapitalize="characters"
          onChange={(e) => setConfirme(e.target.value)}
        />
        {erreur && (
          <p role="alert" className="text-center text-sm text-(--color-feu)">
            {erreur}
          </p>
        )}
        <button
          type="button"
          disabled={!pret || enCours}
          onClick={async () => {
            setErreur('');
            setEnCours(true);
            try {
              await onSupprimer(google ? undefined : mdp);
            } catch (e) {
              setErreur(messageErreur(e));
            } finally {
              setEnCours(false);
            }
          }}
          className="btn btn-danger-plein mt-1 w-full"
        >
          {enCours ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
        <button
          type="button"
          onClick={onRetour}
          className="btn btn-verre w-full"
        >
          Annuler
        </button>
      </div>
    </Coque>
  );
}

function Coque({
  titre, children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="terrain terrain-profil h-full overflow-y-auto px-4 pt-6 pb-(--reserve-dock)">
      <h1 className="titre-ecran mb-5">
        {titre}
      </h1>
      {children}
    </div>
  );
}

function Champ({
  label, erreur, ...reste
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; erreur?: string }) {
  const id = `c-${label.toLowerCase().replace(/[^a-z]/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-(--color-encre-sec)">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!erreur}
        className={`w-full rounded-(--radius-sm) border bg-(--color-carte) px-3.5 py-3 text-base ${
          erreur ? 'border-(--color-feu)' : 'border-white/12'
        }`}
        {...reste}
      />
      {erreur && <p className="mt-1 text-xs text-(--color-feu)">{erreur}</p>}
    </div>
  );
}
