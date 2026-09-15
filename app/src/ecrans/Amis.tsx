import { useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { initiales } from '../domaine/joueur';
import { rangDe } from '../domaine/xp';
import { actionPossible, lienAvec, type RelationsJoueur } from '../domaine/social';

export interface JoueurTrouve {
  readonly uid: string;
  readonly pseudo: string;
  readonly xp: number;
}

export interface ActionsAmis {
  onChercher(terme: string): void;
  onAjouter(uid: string): void;
  onAccepter(uid: string): void;
  onRetirer(uid: string): void;
}

export function Amis({
  monUid, relations, annuaire, resultats, actions, enRecherche = false,
}: {
  monUid: string;
  relations: RelationsJoueur;
  /** Pseudos et XP des joueurs qu'on connaît déjà, par uid. */
  annuaire: Record<string, JoueurTrouve>;
  resultats: readonly JoueurTrouve[];
  actions: ActionsAmis;
  enRecherche?: boolean;
}) {
  const [terme, setTerme] = useState('');
  const recus = relations.friendRequestsReceived ?? [];
  const amis = relations.friends ?? [];

  return (
    <div className="terrain terrain-equipes min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-4 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Joueurs
      </h1>

      <Plaque className="mb-4 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            actions.onChercher(terme.trim());
          }}
        >
          <label htmlFor="rech-joueur" className="sr-only">
            Chercher un joueur
          </label>
          <input
            id="rech-joueur"
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            placeholder="Chercher un pseudo"
            className="w-full rounded-(--radius-sm) border border-white/12 bg-(--color-carte) px-3.5 py-2.5 text-base"
          />
        </form>
      </Plaque>

      {/* Les demandes reçues passent EN PREMIER : quelqu'un attend une
          réponse, et c'est la seule chose ici qui soit urgente. */}
      {recus.length > 0 && (
        <Bloc titre={`Demandes reçues · ${recus.length}`}>
          {recus.map((uid) => (
            <LigneJoueur
              key={uid}
              j={annuaire[uid] ?? { uid, pseudo: uid, xp: 0 }}
              action="accepter"
              onAction={() => actions.onAccepter(uid)}
            />
          ))}
        </Bloc>
      )}

      {terme && (
        <Bloc titre="Résultats">
          {enRecherche && <p className="text-sm text-(--color-encre-sec)">Recherche…</p>}
          {!enRecherche && resultats.length === 0 && (
            <p className="text-sm text-(--color-encre-sec)">Aucun joueur à ce nom.</p>
          )}
          {resultats.map((j) => {
            const lien = lienAvec(relations, monUid, j.uid);
            return (
              <LigneJoueur
                key={j.uid}
                j={j}
                action={actionPossible(lien)}
                etiquette={lien === 'demande-envoyee' ? 'Demande envoyée' : undefined}
                onAction={() => {
                  if (lien === 'inconnu') actions.onAjouter(j.uid);
                  if (lien === 'demande-recue') actions.onAccepter(j.uid);
                  if (lien === 'ami') actions.onRetirer(j.uid);
                }}
              />
            );
          })}
        </Bloc>
      )}

      <Bloc titre={`Mes amis · ${amis.length}`}>
        {amis.length === 0 ? (
          <p className="text-sm text-(--color-encre-sec)">
            Personne encore. Cherche un pseudo pour ajouter quelqu’un.
          </p>
        ) : (
          amis.map((uid) => (
            <LigneJoueur
              key={uid}
              j={annuaire[uid] ?? { uid, pseudo: uid, xp: 0 }}
              action="retirer"
              onAction={() => actions.onRetirer(uid)}
            />
          ))
        )}
      </Bloc>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
        {titre}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

const LIBELLES = {
  ajouter: 'Ajouter',
  accepter: 'Accepter',
  retirer: 'Retirer',
  aucune: '',
} as const;

function LigneJoueur({
  j, action, etiquette, onAction,
}: {
  j: JoueurTrouve;
  action: keyof typeof LIBELLES;
  etiquette?: string;
  onAction(): void;
}) {
  const rang = rangDe(j.xp);
  return (
    <Plaque className="flex items-center gap-3 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
        {initiales(j.pseudo)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{j.pseudo}</p>
        <p className="truncate text-xs text-(--color-encre-sec)">
          <i
            className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
            style={{ background: rang.couleur }}
            aria-hidden
          />
          {rang.label} · {j.xp} XP
        </p>
      </div>
      {action === 'aucune' ? (
        <span className="shrink-0 text-xs text-(--color-encre-faible)">{etiquette}</span>
      ) : (
        <button
          type="button"
          onClick={onAction}
          className={`shrink-0 rounded-(--radius-pill) px-3 py-1.5 text-xs font-medium ${
            action === 'retirer'
              ? // Fond noir sous le rouge : posé à nu sur la plaque il tombait
                // à 4.09:1. Le même piège que la pastille de tier et « EN TÊTE ».
                'border border-(--color-rouge)/45 bg-black/65 text-(--color-rouge)'
              : 'bg-(--color-vert) text-(--color-fond)'
          }`}
        >
          {LIBELLES[action]}
        </button>
      )}
    </Plaque>
  );
}
