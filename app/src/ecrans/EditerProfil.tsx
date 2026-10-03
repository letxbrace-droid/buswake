import { useMemo, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { CarteFut } from '../composants/CarteFut';
import { ATOUTS_LABELS, POSTES, type Atouts } from '../domaine/joueur';
import { ATOUT_MAX, ATOUT_MIN, PSEUDO_MAX, validerEdition, type Edition } from '../domaine/editionProfil';

export interface ActionsEdition {
  onEnregistrer(e: Edition): void;
  onMaPosition(): void;
  onAnnuler(): void;
}

export function EditerProfil({
  initial, email, lieu, occupe = false, localisationEnCours = false, actions,
}: {
  initial: Edition;
  email: string | null;
  /** Où l'app place le joueur aujourd'hui — « Ris-Orangis », « position
   *  approximative » — ou `null` si elle ne le sait pas. On le DIT : c'est ce
   *  qui aurait révélé que tout le monde était placé à Massy. */
  lieu: string | null;
  occupe?: boolean;
  localisationEnCours?: boolean;
  actions: ActionsEdition;
}) {
  const [e, setE] = useState<Edition>(initial);
  const probleme = useMemo(() => validerEdition(e, email), [e, email]);
  const maj = <K extends keyof Edition>(k: K, v: Edition[K]) => setE((p) => ({ ...p, [k]: v }));

  return (
    <div className="terrain terrain-profil h-full overflow-y-auto px-4 pt-6 pb-(--reserve-dock)">
      <h1 className="titre-ecran mb-4">
        Ma carte
      </h1>

      {/* La carte se met à jour pendant qu'on règle : on voit ce qu'on
          publie avant de l'avoir publié. */}
      <div className="mb-5">
        <CarteFut
          j={{ pseudo: e.pseudo.trim() || '…', poste: e.poste, atouts: e.atouts }}
          largeur={220}
        />
      </div>

      <Plaque className="mb-3 p-4">
        <label className="block">
          <span className="mb-1.5 block etiquette">
            Pseudo
          </span>
          <input
            value={e.pseudo}
            maxLength={PSEUDO_MAX}
            onChange={(ev) => maj('pseudo', ev.target.value)}
            className="champ px-3 py-2.5"
          />
        </label>
        <p className="mt-1 text-xs text-(--color-encre-faible)">Visible par tous les joueurs.</p>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-2 etiquette">Poste</p>
        <div className="grid grid-cols-4 gap-1.5">
          {POSTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => maj('poste', p.id)}
              aria-pressed={e.poste === p.id}
              className="puce py-2 text-sm"
            >
              {p.abbr}
            </button>
          ))}
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-1 etiquette">Atouts</p>
        <p className="mb-3 text-xs text-(--color-encre-sec)">
          Ton auto-évaluation. Les notes que te donnent les autres après un match, elles, ne se
          règlent pas ici.
        </p>
        <div className="flex flex-col gap-3">
          {(Object.keys(ATOUTS_LABELS) as (keyof Atouts)[]).map((k) => (
            <label key={k} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-(--color-encre-sec)">{ATOUTS_LABELS[k]}</span>
              <input
                type="range"
                min={ATOUT_MIN}
                max={ATOUT_MAX}
                value={e.atouts[k]}
                onChange={(ev) => maj('atouts', { ...e.atouts, [k]: Number(ev.target.value) })}
                className="min-w-0 flex-1 accent-(--color-vert)"
              />
              <span className="w-7 shrink-0 text-right text-sm font-bold tabular-nums">{e.atouts[k]}</span>
            </label>
          ))}
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-1 etiquette">
          Où tu joues
        </p>
        {/* DIRE OÙ L'APP TE PLACE. Sans cette ligne, un joueur placé à tort
            n'a aucun moyen de le savoir — c'est exactement ce qui s'est
            passé pour tous les comptes créés par la v2. */}
        <p className="mb-3 text-xs text-(--color-encre-sec)">
          {lieu ? (
            <>Tes distances se mesurent depuis <b className="text-(--color-encre)">{lieu}</b>.</>
          ) : (
            <>Ta position n’est pas encore connue : les distances sont approximatives.</>
          )}
        </p>
        <label className="block">
          <span className="sr-only">Code postal</span>
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={e.codePostal}
            onChange={(ev) => maj('codePostal', ev.target.value.replace(/\D/g, ''))}
            placeholder="Code postal"
            className="champ px-3 py-2.5"
          />
        </label>
        <button
          type="button"
          onClick={actions.onMaPosition}
          disabled={localisationEnCours}
          className="btn btn-verre mt-2 w-full"
        >
          {localisationEnCours ? 'Localisation…' : 'Utiliser ma position'}
        </button>
        {/* Le document profil est lisible par tous les joueurs connectés :
            on dit ce qu'on en fait avant qu'ils appuient. */}
        <p className="mt-1.5 text-xs text-(--color-encre-faible)">
          Arrondie à environ 2 km avant d’être enregistrée — jamais ton adresse exacte.
        </p>
      </Plaque>

      {probleme && <p className="mb-2 text-center text-sm text-(--color-feu)">{probleme.message}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={actions.onAnnuler}
          className="btn btn-verre px-5"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={occupe || !!probleme}
          onClick={() => actions.onEnregistrer(e)}
          className="btn btn-vert flex-1"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
