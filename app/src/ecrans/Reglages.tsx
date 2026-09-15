import { useState } from 'react';
import { Tiroir, Section, Ligne } from '../composants/Tiroir';
import { usePreferences } from '../services/preferences';
import { RAYONS, libelleRayon } from '../domaine/rayon';
import { gereSonMotDePasse } from '../domaine/compte';

export interface ActionsReglages {
  onDeconnexion(): void;
  onMotDePasse(): void;
  onSupprimerCompte(): void;
  onInviter(): void;
}

export function Reglages({
  ouvert, onFermer, pseudo, fournisseurs, actions,
}: {
  ouvert: boolean;
  onFermer(): void;
  pseudo: string;
  fournisseurs: readonly string[];
  actions: ActionsReglages;
}) {
  const km = usePreferences((s) => s.km);
  const setKm = usePreferences((s) => s.setKm);
  const [copie, setCopie] = useState(false);

  return (
    <Tiroir ouvert={ouvert} onFermer={onFermer} titre="Réglages">
      <p className="mb-5 text-sm text-(--color-encre-sec)">
        Connecté en tant que <b className="text-(--color-encre)">{pseudo}</b>
      </p>

      <Section titre="Rayon de recherche">
        {/* Le même réglage qu'en tête de l'écran Matchs, et c'est voulu : on
            le règle là où on s'en sert, et on le retrouve là où on cherche. */}
        <div className="flex gap-1.5">
          {RAYONS.map((k) => (
            <button
              key={k}
              onClick={() => setKm(k)}
              aria-pressed={km === k}
              className={`min-w-0 flex-1 rounded-(--radius-pill) px-1 py-1.5 text-xs whitespace-nowrap ${
                km === k
                  ? 'bg-(--color-vert) font-semibold text-(--color-fond)'
                  : 'bg-black/30 text-(--color-encre-sec)'
              }`}
            >
              {libelleRayon(k)}
            </button>
          ))}
        </div>
      </Section>

      <Section titre="Partager">
        <Ligne
          onClick={() => {
            actions.onInviter();
            setCopie(true);
            window.setTimeout(() => setCopie(false), 2000);
          }}
          aide={copie ? 'Lien copié' : 'Copie un lien vers ton prochain match'}
        >
          Inviter des joueurs
        </Ligne>
      </Section>

      <Section titre="Compte">
        {/* Un compte Google n'a pas de mot de passe chez nous : proposer le
            formulaire donnerait un échec incompréhensible. On le dit. */}
        {gereSonMotDePasse(fournisseurs) ? (
          <Ligne onClick={actions.onMotDePasse}>Changer mon mot de passe</Ligne>
        ) : (
          <Ligne aide="Ton compte passe par Google : le mot de passe s’y gère.">
            Mot de passe
          </Ligne>
        )}
        <Ligne onClick={actions.onDeconnexion}>Se déconnecter</Ligne>
      </Section>

      <Section titre="Zone sensible">
        <Ligne
          danger
          onClick={actions.onSupprimerCompte}
          aide="Ton compte, ta carte et tes XP seront définitivement supprimés."
        >
          Supprimer mon compte
        </Ligne>
      </Section>
    </Tiroir>
  );
}
