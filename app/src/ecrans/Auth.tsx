import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Logo } from '../composants/Logo';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ConnexionSchema, InscriptionSchema, messageErreur,
  type Connexion, type Inscription,
} from '../domaine/auth';

type Onglet = 'connexion' | 'inscription';

export interface ActionsAuth {
  connecter(v: Connexion): Promise<void>;
  inscrire(v: Inscription): Promise<void>;
  avecGoogle(): Promise<void>;
}

export function Auth({ actions }: { actions: ActionsAuth }) {
  const [onglet, setOnglet] = useState<Onglet>('connexion');
  const [erreur, setErreur] = useState('');

  return (
    <div className="terrain terrain-accueil flex min-h-full flex-col justify-center px-5 py-10">
      {/* Pas de boîte autour du formulaire : le contenu respire, et la photo
          du terrain fait le décor. L'écran d'entrée doit donner envie de
          jouer, pas ressembler à un guichet. */}
      <header className="mb-8 text-center">
        <Logo largeur={230} className="mx-auto" />
        <p className="mt-2 text-sm text-(--color-encre-sec)">
          Trouve des joueurs, crée ton match, réunis les 10.
        </p>
      </header>

      <div
        role="tablist"
        className="mx-auto mb-5 flex w-full max-w-sm gap-1 rounded-(--radius-pill) bg-black/35 p-1"
      >
        {(['connexion', 'inscription'] as const).map((o) => (
          <button
            key={o}
            role="tab"
            aria-selected={onglet === o}
            onClick={() => {
              setOnglet(o);
              setErreur('');
            }}
            className={`flex-1 rounded-(--radius-pill) py-2 text-sm font-medium transition-colors duration-(--duration-doigt) ${
              onglet === o ? 'bg-white/12 text-(--color-encre)' : 'text-(--color-encre-sec)'
            }`}
          >
            {o === 'connexion' ? 'Connexion' : 'Inscription'}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-sm">
        {onglet === 'connexion' ? (
          <FormConnexion onErreur={setErreur} action={actions.connecter} />
        ) : (
          <FormInscription onErreur={setErreur} action={actions.inscrire} />
        )}

        {erreur && (
          <p role="alert" className="mt-3 text-center text-sm text-(--color-feu)">
            {erreur}
          </p>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/12" />
          <span className="text-xs text-(--color-encre-faible)">ou</span>
          <span className="h-px flex-1 bg-white/12" />
        </div>

        <button
          type="button"
          onClick={() => actions.avecGoogle().catch((e) => setErreur(messageErreur(e)))}
          className="w-full rounded-(--radius-pill) border border-white/15 bg-black/30 py-3 font-medium"
        >
          Continuer avec Google
        </button>
      </div>
    </div>
  );
}

function FormConnexion({
  action, onErreur,
}: {
  action(v: Connexion): Promise<void>;
  onErreur(m: string): void;
}) {
  const f = useForm<Connexion>({
    resolver: zodResolver(ConnexionSchema),
    defaultValues: { email: '', motDePasse: '' },
  });

  return (
    <form
      noValidate
      onSubmit={f.handleSubmit(async (v) => {
        onErreur('');
        try {
          await action(v);
        } catch (e) {
          onErreur(messageErreur(e));
        }
      })}
      className="flex flex-col gap-3"
    >
      <Champ
        label="Email"
        type="email"
        autoComplete="email"
        erreur={f.formState.errors.email?.message}
        {...f.register('email')}
      />
      <Champ
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        erreur={f.formState.errors.motDePasse?.message}
        {...f.register('motDePasse')}
      />
      <Valider enCours={f.formState.isSubmitting}>Se connecter</Valider>
    </form>
  );
}

function FormInscription({
  action, onErreur,
}: {
  action(v: Inscription): Promise<void>;
  onErreur(m: string): void;
}) {
  const f = useForm<Inscription>({
    resolver: zodResolver(InscriptionSchema),
    defaultValues: { pseudo: '', email: '', motDePasse: '', codePostal: '' },
  });

  return (
    <form
      noValidate
      onSubmit={f.handleSubmit(async (v) => {
        onErreur('');
        try {
          await action(v);
        } catch (e) {
          onErreur(messageErreur(e));
        }
      })}
      className="flex flex-col gap-3"
    >
      <Champ
        label="Pseudo"
        autoComplete="nickname"
        erreur={f.formState.errors.pseudo?.message}
        {...f.register('pseudo')}
      />
      <Champ
        label="Email"
        type="email"
        autoComplete="email"
        erreur={f.formState.errors.email?.message}
        {...f.register('email')}
      />
      <Champ
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        erreur={f.formState.errors.motDePasse?.message}
        {...f.register('motDePasse')}
      />
      {/* Facultatif, et dit comme tel : demander douze champs avant d'avoir
          montré quoi que ce soit fait fuir. */}
      <Champ
        label="Code postal"
        aide="Facultatif — sert à te montrer les terrains proches"
        inputMode="numeric"
        maxLength={5}
        autoComplete="postal-code"
        erreur={f.formState.errors.codePostal?.message}
        {...f.register('codePostal')}
      />
      <Valider enCours={f.formState.isSubmitting}>Créer mon compte</Valider>
    </form>
  );
}

function Champ({
  label, erreur, aide, ...reste
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  erreur?: string;
  aide?: string;
}) {
  const id = `champ-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-(--color-encre-sec)">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!erreur}
        aria-describedby={erreur ? `${id}-err` : aide ? `${id}-aide` : undefined}
        // Fond OPAQUE. Un champ de saisie posé sur une photo ne peut pas être
        // translucide : à 35 % de noir, les projecteurs du terrain passaient au
        // travers et le champ devenait illisible. La sonde de contraste ne l'a
        // pas vu — un champ vide n'a aucun texte à mesurer.
        className={`w-full rounded-(--radius-sm) border bg-(--color-carte) px-3.5 py-3 text-base text-(--color-encre) placeholder:text-(--color-encre-faible) ${
          erreur ? 'border-(--color-feu)' : 'border-white/12'
        }`}
        {...reste}
      />
      {erreur ? (
        <p id={`${id}-err`} className="mt-1 text-xs text-(--color-feu)">
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="mt-1 text-xs text-(--color-encre-faible)">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

function Valider({ enCours, children }: { enCours: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="mt-1 w-full rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) transition-transform duration-(--duration-doigt) active:scale-[0.98] disabled:opacity-60"
    >
      {enCours ? 'Un instant…' : children}
    </button>
  );
}

