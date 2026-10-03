import { Plaque } from '../composants/Plaque';
import { CarteFut, type Joueur } from '../composants/CarteFut';
import { progressionDe } from '../domaine/xp';
import { noteMoyenne } from '../domaine/club';
import { fiabilite, libelleFiabilite } from '../domaine/fiabilite';
import { BadgeFiabilite } from '../composants/BadgeFiabilite';

export interface ProfilJoueur extends Joueur {
  readonly xp: number;
  readonly historique?: readonly string[];
  readonly badges?: readonly string[];
  readonly stats?: {
    matchsJoues?: number; hommeDuMatch?: number; presences?: number; lapins?: number;
    buts?: number; passes?: number;
  };
  /** Somme et nombre des notes reçues — la moyenne s'en déduit. `noteCount`
   *  à zéro veut dire « jamais noté », pas « noté zéro ». */
  readonly noteSum?: number;
  readonly noteCount?: number;
}

export function Profil({ j, onModifier }: { j: ProfilJoueur; onModifier?: () => void }) {
  const p = progressionDe(j.xp);
  const s = j.stats ?? {};
  const note = noteMoyenne(j.noteSum ?? 0, j.noteCount ?? 0);
  const fia = fiabilite(j.historique);

  return (
    <div className="terrain terrain-profil h-full overflow-y-auto px-4 pt-6 pb-(--reserve-dock)">
      <h1 className="titre-ecran mb-4">
        Profil
      </h1>

      <div className="mb-3">
        <CarteFut j={j} largeur={280} />
      </div>

      {/* La carte se modifie. `majProfil` existait et aucun écran ne
          l'appelait : poste, atouts et code postal étaient figés à
          l'inscription. */}
      {onModifier && (
        <button
          type="button"
          onClick={onModifier}
          className="btn btn-verre mx-auto mb-5 flex px-5 w-fit"
        >
          Modifier ma carte
        </button>
      )}

      {/* LA FIABILITÉ — ce que les organisateurs voient de toi. On le dit
          au joueur lui-même : c'est ce qui donne envie de venir. */}
      <Plaque className="mb-3 flex items-center gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="block etiquette">Fiabilité</span>
          <span className="mt-0.5 block text-sm text-(--color-encre-sec)">{libelleFiabilite(fia)}</span>
          {fia.statut === 'lapin' && (
            <span className="mt-1 block text-xs text-(--color-encre-sec)">
              Le badge disparaît après quelques matchs honorés.
            </span>
          )}
        </span>
        <BadgeFiabilite f={fia} plein />
      </Plaque>

      {/* LA NOTE MOYENNE. Elle n'apparaît que si quelqu'un a noté : « 0,0 »
          à côté du nom de quelqu'un qui vient d'arriver serait faux, et
          décourageant pour une raison qui n'existe pas. */}
      {note != null && (
        <Plaque className="mb-3 flex items-center gap-3 p-4">
          <span className="font-[family-name:var(--font-titre)] text-4xl text-(--color-vert)">
            {note.toFixed(1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block etiquette">Note moyenne</span>
            <span className="block text-xs text-(--color-encre-sec)">
              sur {j.noteCount} match{(j.noteCount ?? 0) > 1 ? 's' : ''} noté
              {(j.noteCount ?? 0) > 1 ? 's' : ''}
            </span>
          </span>
        </Plaque>
      )}

      <Plaque className="mb-3 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold" style={{ color: p.rang.couleur }}>
            {p.rang.label}
          </p>
          <p className="text-sm tabular-nums text-(--color-encre-sec)">{j.xp} XP</p>
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-(--radius-pill) bg-white/10">
          <div
            className="h-full rounded-(--radius-pill) bg-(--color-vert) transition-[width] duration-(--duration-recompense) ease-(--ease-kolektif)"
            style={{ width: `${p.fraction * 100}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-(--color-encre-sec)">
          {p.suivant ? (
            <>
              <b className="text-(--color-encre)">{p.restant} XP</b> avant {p.suivant.label}
            </>
          ) : (
            'Rang maximal atteint.'
          )}
        </p>
      </Plaque>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Matchs joués" valeur={s.matchsJoues ?? 0} />
        <Stat label="Homme du match" valeur={s.hommeDuMatch ?? 0} accent />
        {/* Saisis en fin de match par le créateur, agrégés par la Cloud
            Function — le client n'a pas le droit d'écrire `stats`. */}
        <Stat label="Buts" valeur={s.buts ?? 0} />
        <Stat label="Passes déc." valeur={s.passes ?? 0} />
        <Stat label="Présences" valeur={s.presences ?? 0} />
        {/* Le lapin se compte aussi. Ne montrer que les bons chiffres ferait
            du profil une vitrine ; c'est un bilan. */}
        <Stat label="Lapins" valeur={s.lapins ?? 0} malus={(s.lapins ?? 0) > 0} />
      </div>

      {j.badges && j.badges.length > 0 && (
        <Plaque className="mt-3 p-4">
          <p className="etiquette">Badges</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {j.badges.map((b) => (
              <span
                key={b}
                className="rounded-(--radius-pill) bg-white/8 px-2.5 py-1 text-xs text-(--color-encre-sec)"
              >
                {b}
              </span>
            ))}
          </div>
        </Plaque>
      )}
    </div>
  );
}

function Stat({
  label, valeur, accent = false, malus = false,
}: {
  label: string;
  valeur: number;
  accent?: boolean;
  malus?: boolean;
}) {
  return (
    <Plaque className="p-4">
      <p className="etiquette">{label}</p>
      <p
        className={`mt-1 font-[family-name:var(--font-titre)] text-3xl tabular-nums ${
          accent ? 'text-(--color-feu)' : malus ? 'text-(--color-encre-sec)' : ''
        }`}
      >
        {valeur}
      </p>
    </Plaque>
  );
}
