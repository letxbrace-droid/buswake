import { useState, type ReactNode } from 'react';
import { Tiroir } from '../composants/Tiroir';
import { Icone, type NomIcone } from '../composants/Icone';
import { Avatar } from '../composants/Avatar';
import { usePreferences } from '../services/preferences';
import { RAYONS, libelleRayon } from '../domaine/rayon';
import { gereSonMotDePasse } from '../domaine/compte';
import { aidePush, libellePush, type EtatPush } from '../domaine/push';
import { progressionDe } from '../domaine/xp';

export interface ActionsReglages {
  onDeconnexion(): void;
  onMotDePasse(): void;
  onSupprimerCompte(): void;
  onInviter(): void;
  onProfil(): void;
  onModifierCarte(): void;
  /** Demande la permission puis enregistre le jeton. L'appel part d'un CLIC :
   *  une fenêtre de permission qui surgit toute seule se fait refuser, et un
   *  refus est définitif. */
  onActiverNotifications(): void;
}

/** LES RÉGLAGES.
 *
 *  Une liste de boutons gris tous pareils ne se parcourt pas : on lit chaque
 *  ligne pour trouver la bonne. Ici, chaque ligne a son icône et sa couleur,
 *  les lignes sont groupées par sujet, et l'état se voit sans lire — un
 *  interrupteur pour les notifications, un chevron pour ce qui ouvre un
 *  écran. En tête, le joueur lui-même : sa carte, son rang, sa progression. */
export function Reglages({
  ouvert, onFermer, uid, pseudo, xp, fournisseurs, actions, push, pushEnCours = false,
}: {
  ouvert: boolean;
  onFermer(): void;
  uid: string;
  pseudo: string;
  xp: number;
  fournisseurs: readonly string[];
  actions: ActionsReglages;
  push: EtatPush;
  pushEnCours?: boolean;
}) {
  const km = usePreferences((s) => s.km);
  const setKm = usePreferences((s) => s.setKm);
  const [copie, setCopie] = useState(false);
  const [quitter, setQuitter] = useState(false);
  const p = progressionDe(xp);
  const etatPush = libellePush(push);
  const pushActif = push === 'actif';

  return (
    <Tiroir ouvert={ouvert} onFermer={onFermer} titre="Réglages">
      {/* LE JOUEUR. Toute la carte ouvre le profil. */}
      <button
        type="button"
        onClick={actions.onProfil}
        className="plaque plaque-action mb-4 flex w-full items-center gap-3.5 p-4 text-left"
      >
        <Avatar uid={uid} pseudo={pseudo} taille={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-[family-name:var(--font-titre)] text-xl tracking-wide uppercase">
            {pseudo}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-(--color-encre-sec)">
            <i aria-hidden className="inline-block size-2 rounded-full" style={{ background: p.rang.couleur }} />
            {p.rang.label} · {xp} XP
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-(--radius-pill) bg-black/50">
            <span
              className="block h-full rounded-(--radius-pill) bg-(--color-vert)"
              style={{ width: `${Math.round(p.fraction * 100)}%` }}
            />
          </span>
          <span className="mt-1 block text-[11px] text-(--color-encre-faible)">
            {p.suivant ? `${p.restant} XP avant ${p.suivant.label}` : 'Rang maximal atteint'}
          </span>
        </span>
        <span className="text-(--color-encre-faible)"><Icone nom="chevron" taille={18} /></span>
      </button>

      {/* RACCOURCIS — les deux gestes qu'on vient chercher le plus souvent. */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Raccourci icone="crayon" label="Modifier ma carte" onClick={actions.onModifierCarte} />
        <Raccourci
          icone="partage"
          label={copie ? 'Lien copié !' : 'Inviter des joueurs'}
          onClick={() => {
            actions.onInviter();
            setCopie(true);
            window.setTimeout(() => setCopie(false), 2000);
          }}
        />
      </div>

      <Groupe titre="Préférences">
        <div className="px-3.5 pt-3 pb-3.5">
          <div className="mb-2.5 flex items-center gap-3">
            <Pastille icone="cible" teinte="vert" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Rayon de recherche</span>
              <span className="block text-xs text-(--color-encre-faible)">Les matchs proposés autour de chez toi</span>
            </span>
          </div>
          {/* Le même réglage qu'en tête de l'écran Matchs : on le règle là où
              on s'en sert, et on le retrouve là où on cherche. */}
          <div className="flex gap-1.5">
            {RAYONS.map((k) => (
              <button
                key={k}
                onClick={() => setKm(k)}
                aria-pressed={km === k}
                className="puce min-w-0 flex-1 px-1 text-xs whitespace-nowrap"
              >
                {libelleRayon(k)}
              </button>
            ))}
          </div>
        </div>

        {/* L'état se lit sur l'interrupteur. Le libellé dit pourquoi il est
            bloqué quand il l'est — une décision prise dans le navigateur, qui
            ne se reprend que là-bas. */}
        <Rangee
          icone="cloche"
          teinte="feu"
          titre="Notifications"
          aide={pushEnCours ? 'Activation…' : pushActif
            ? 'Nouveau match, confirmation, désistement, rappels'
            : aidePush(push) || etatPush.texte}
          onClick={etatPush.actif && !pushEnCours ? actions.onActiverNotifications : undefined}
          fin={<Interrupteur actif={pushActif} bloque={!etatPush.actif && !pushActif} />}
          role="switch"
          coche={pushActif}
        />
      </Groupe>

      <Groupe titre="Compte">
        {gereSonMotDePasse(fournisseurs) ? (
          <Rangee icone="cadenas" teinte="bleu" titre="Changer mon mot de passe" onClick={actions.onMotDePasse} chevron />
        ) : (
          // Un compte Google n'a pas de mot de passe chez nous : proposer le
          // formulaire donnerait un échec incompréhensible. On le dit.
          <Rangee icone="cadenas" teinte="bleu" titre="Mot de passe" aide="Géré par ton compte Google" />
        )}
        {!quitter ? (
          <Rangee icone="sortie" teinte="neutre" titre="Se déconnecter" onClick={() => setQuitter(true)} />
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 text-sm text-(--color-encre-sec)">Te déconnecter ?</span>
            <button type="button" onClick={() => setQuitter(false)} className="btn btn-verre min-h-11 px-4 text-sm">Non</button>
            <button type="button" onClick={actions.onDeconnexion} className="btn btn-vert min-h-11 px-4 text-sm">Oui</button>
          </div>
        )}
      </Groupe>

      <Groupe titre="Zone sensible">
        <Rangee
          icone="poubelle"
          teinte="rouge"
          titre="Supprimer mon compte"
          aide="Carte, statistiques et XP supprimés définitivement"
          onClick={actions.onSupprimerCompte}
          danger
          chevron
        />
      </Groupe>

      {/* Sans ce repère, « le correctif ne marche pas » et « je n'ai pas
          encore la version qui le contient » se ressemblent exactement. */}
      <p className="mt-6 text-center text-[11px] text-(--color-encre-faible)">
        KOLEKTIF · version {__VERSION__}
      </p>
    </Tiroir>
  );
}

type Teinte = 'vert' | 'feu' | 'bleu' | 'rouge' | 'neutre';
const TEINTES: Record<Teinte, string> = {
  vert: 'bg-[color-mix(in_srgb,var(--color-vert)_18%,var(--color-fond))] text-(--color-vert)',
  feu: 'bg-[color-mix(in_srgb,var(--color-feu)_18%,var(--color-fond))] text-(--color-feu)',
  bleu: 'bg-[color-mix(in_srgb,var(--color-bleu)_18%,var(--color-fond))] text-(--color-bleu)',
  rouge: 'bg-[color-mix(in_srgb,var(--color-rouge)_18%,var(--color-fond))] text-(--color-rouge)',
  neutre: 'bg-white/10 text-(--color-encre)',
};

function Pastille({ icone, teinte }: { icone: NomIcone; teinte: Teinte }) {
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-(--radius-sm) ${TEINTES[teinte]}`}>
      <Icone nom={icone} taille={18} />
    </span>
  );
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 px-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">{titre}</h3>
      {/* Une seule surface par groupe, des séparateurs fins entre les lignes :
          on lit un bloc, pas une pile de boutons. */}
      <div className="overflow-hidden rounded-(--radius-md) border border-white/8 bg-(--color-carte) [&>*+*]:border-t [&>*+*]:border-white/6">
        {children}
      </div>
    </section>
  );
}

function Rangee({
  icone, teinte, titre, aide, onClick, danger = false, chevron = false, fin, role, coche,
}: {
  icone: NomIcone;
  teinte: Teinte;
  titre: string;
  aide?: string;
  onClick?(): void;
  danger?: boolean;
  chevron?: boolean;
  fin?: ReactNode;
  role?: 'switch';
  coche?: boolean;
}) {
  const contenu = (
    <>
      <Pastille icone={icone} teinte={teinte} />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${danger ? 'text-(--color-rouge)' : ''}`}>{titre}</span>
        {aide && <span className="mt-0.5 block text-xs text-(--color-encre-faible)">{aide}</span>}
      </span>
      {fin}
      {chevron && <span className="text-(--color-encre-faible)"><Icone nom="chevron" taille={16} /></span>}
    </>
  );
  const classe = 'flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left';
  if (!onClick && !role) return <div className={classe}>{contenu}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      role={role}
      aria-checked={role === 'switch' ? !!coche : undefined}
      aria-disabled={!onClick || undefined}
      className={`${classe} transition-colors duration-(--duration-doigt) active:bg-white/5`}
    >
      {contenu}
    </button>
  );
}

function Interrupteur({ actif, bloque }: { actif: boolean; bloque: boolean }) {
  return (
    <span
      aria-hidden
      // Piste CREUSÉE, bouton en MÉTAL : l'interrupteur de la planche de
      // référence. Allumé, la piste se remplit de vert par l'intérieur.
      className={`relative h-7 w-12 shrink-0 rounded-(--radius-pill) shadow-(--creux) transition-colors duration-(--duration-interface) ${
        actif ? 'bg-(--color-vert-sombre)' : 'bg-(--color-creux)'
      } ${bloque ? 'opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-[linear-gradient(180deg,#f4f4f4,#a9a9a9)] shadow-[inset_0_1px_0_#fff,0_2px_4px_rgba(0,0,0,.6)] transition-transform duration-(--duration-interface) ease-(--ease-ressort) ${
          actif ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </span>
  );
}

function Raccourci({ icone, label, onClick }: { icone: NomIcone; label: string; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 flex-col items-start justify-between gap-2 rounded-(--radius-md) border border-white/8 bg-(--color-carte) p-3 text-left transition-transform duration-(--duration-doigt) active:scale-[0.97]"
    >
      <Pastille icone={icone} teinte="vert" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
