import { Plaque } from '../composants/Plaque';
import { CarteFut, type Joueur } from '../composants/CarteFut';
import { progressionDe } from '../domaine/xp';
import { noteMoyenne } from '../domaine/club';

export interface ProfilJoueur extends Joueur {
  readonly xp: number;
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

export function Profil({ j }: { j: ProfilJoueur }) {
  const p = progressionDe(j.xp);
  const s = j.stats ?? {};
  const note = noteMoyenne(j.noteSum ?? 0, j.noteCount ?? 0);

  return (
    <div className="terrain terrain-profil h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-4 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Profil
      </h1>

      <div className="mb-5">
        <CarteFut j={j} largeur={280} />
      </div>

      {/* LA NOTE MOYENNE. Elle n'apparaît que si quelqu'un a noté : « 0,0 »
          à côté du nom de quelqu'un qui vient d'arriver serait faux, et
          décourageant pour une raison qui n'existe pas. */}
      {note != null && (
        <Plaque className="mb-3 flex items-center gap-3 p-4">
          <span className="font-[family-name:var(--font-titre)] text-4xl text-(--color-vert)">
            {note.toFixed(1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-(--color-encre-faible) uppercase">Note moyenne</span>
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
          <p className="text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">Badges</p>
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
      <p className="text-xs text-(--color-encre-faible) uppercase">{label}</p>
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
