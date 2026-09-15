import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plaque } from '../composants/Plaque';
import { Blason } from '../composants/Blason';
import {
  classerEquipes, classerJoueurs, maPlace, ordrePodium, pointsEquipe,
  type JoueurClasse,
} from '../domaine/classement';
import { encreBlason, type Equipe } from '../domaine/equipe';
import { Segment } from '../composants/Segment';

type Mode = 'joueurs' | 'equipes';

const MEDAILLES = ['#FFD700', '#90A4AE', '#A05000'];

export function Classement({
  uid, joueurs, equipes,
}: {
  uid: string;
  joueurs: readonly JoueurClasse[];
  equipes: readonly Equipe[];
}) {
  const [mode, setMode] = useState<Mode>('joueurs');
  const classes = useMemo(() => classerJoueurs(joueurs), [joueurs]);
  const equipesClassees = useMemo(() => classerEquipes(equipes), [equipes]);
  const moi = useMemo(() => maPlace(uid, classes), [uid, classes]);

  return (
    <div className="terrain terrain-classement min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <header className="mb-3">
        <h1 className="font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
          Classement
        </h1>
        {/* Ni « cette semaine » ni « par sport » : l'XP est un total sans
            dimension temporelle, et un joueur n'a pas de sport. Les proposer
            aurait voulu dire inventer un classement. */}
        <p className="mt-1 text-xs text-(--color-encre-faible)">
          {classes.length} joueur{classes.length > 1 ? 's' : ''} · saison en cours
        </p>
      </header>

      <div className="mb-4">
        <Segment
          valeur={mode}
          onChange={setMode}
          options={[
            { cle: 'joueurs', label: 'Joueurs' },
            { cle: 'equipes', label: 'Équipes' },
          ]}
        />
      </div>

      {mode === 'joueurs' ? (
        <>
          {moi && <BandeauToi place={moi} pseudo={classes[moi.position - 1].pseudo} xp={classes[moi.position - 1].xp} />}
          <Podium trois={classes.slice(0, 3)} />
          <div className="mt-3 flex flex-col gap-2">
            {classes.slice(3).map((u, i) => (
              <Ligne key={u.id} position={i + 4} nom={u.pseudo} valeur={`${u.xp} XP`} moi={u.id === uid} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {equipesClassees.map((e, i) => (
            <Ligne
              key={e.id}
              position={i + 1}
              nom={e.nom}
              valeur={`${pointsEquipe(e)} pts`}
              blason={<Blason e={e} taille={30} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Où je suis, et COMBIEN POUR MONTER. Un classement qui se contente de dire
 *  « #7 » raconte le passé ; celui-ci donne le prochain geste. */
function BandeauToi({
  place, pseudo, xp,
}: {
  place: NonNullable<ReturnType<typeof maPlace>>;
  pseudo: string;
  xp: number;
}) {
  return (
    <Plaque variante="heros" className="mb-4 p-4">
      <div className="flex items-center gap-3">
        <span className="font-[family-name:var(--font-titre)] text-3xl text-(--color-encre-sec)">
          #{place.position}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">Toi · {pseudo}</p>
          <p className="text-xs text-(--color-encre-sec)">
            <i
              className="mr-1.5 inline-block size-2 rounded-full align-middle"
              style={{ background: place.rang.couleur }}
              aria-hidden
            />
            {place.rang.label} · {xp} XP
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-(--radius-pill) bg-white/10">
        <motion.div
          className="h-full rounded-(--radius-pill) bg-(--color-vert)"
          initial={{ width: 0 }}
          animate={{ width: `${place.fraction * 100}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <p className="mt-2 text-sm">
        {place.pourDepasser ? (
          <>
            <b className="text-(--color-vert)">+{place.pourDepasser.xp} XP</b>{' '}
            <span className="text-(--color-encre-sec)">
              pour dépasser {place.pourDepasser.pseudo}
            </span>
          </>
        ) : (
          <span className="text-(--color-encre-sec)">
            Tu domines le classement. Garde la couronne.
          </span>
        )}
      </p>

      {place.topPourcent !== null && (
        <span className="mt-3 inline-block rounded-(--radius-pill) bg-white/8 px-2.5 py-1 text-xs text-(--color-encre-sec)">
          Top <b className="text-(--color-encre)">{place.topPourcent} %</b>
        </span>
      )}
    </Plaque>
  );
}

/** Ordre visuel 2 — 1 — 3 : la forme se reconnaît sans lire les chiffres. */
function Podium({ trois }: { trois: readonly JoueurClasse[] }) {
  const cols = ordrePodium(trois);
  const hauteurs = [76, 104, 58];

  return (
    <section aria-label="Podium" className="flex items-end justify-center gap-2">
      {cols.map((u, i) => {
        if (!u) return <div key={i} className="flex-1" />;
        const medaille = MEDAILLES[trois.indexOf(u)];
        return (
          <div key={u.id} className="flex flex-1 flex-col items-center">
            {/* L'encre de la médaille se CALCULE. L'or et l'argent sont
                clairs, le bronze est sombre : une encre codée en dur passe
                sur deux médailles et échoue sur la troisième — mesuré à
                3.32:1, sous le seuil. */}
            <span
              className="mb-1.5 grid size-11 place-items-center rounded-full font-semibold"
              style={{ background: medaille, color: encreBlason(medaille) }}
            >
              {u.pseudo.slice(0, 2).toUpperCase()}
            </span>
            <p className="max-w-full truncate text-xs font-medium">{u.pseudo}</p>
            <p className="text-xs text-(--color-encre-faible)">{u.xp} XP</p>
            <motion.div
              className="mt-1.5 w-full rounded-t-(--radius-sm)"
              style={{ background: `color-mix(in srgb, ${medaille} 22%, #1C201A)`, borderTop: `2px solid ${medaille}` }}
              initial={{ height: 0 }}
              animate={{ height: hauteurs[i] }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: [0.34, 1.45, 0.64, 1] }}
            />
          </div>
        );
      })}
    </section>
  );
}

function Ligne({
  position, nom, valeur, moi = false, blason,
}: {
  position: number;
  nom: string;
  valeur: string;
  moi?: boolean;
  blason?: React.ReactNode;
}) {
  return (
    <Plaque
      action
      className={`flex items-center gap-3 p-3 ${moi ? 'ring-1 ring-(--color-vert)/45' : ''}`}
    >
      <span className="w-6 shrink-0 text-center text-sm tabular-nums text-(--color-encre-faible)">
        {position}
      </span>
      {blason}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{nom}</p>
      <span className="shrink-0 text-sm tabular-nums text-(--color-encre-sec)">{valeur}</span>
    </Plaque>
  );
}
