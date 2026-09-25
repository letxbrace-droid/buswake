import { useMemo, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { Icone } from '../composants/Icone';
import { terrainsProches } from '../domaine/creation';
import { Calendrier } from '../composants/Calendrier';
import { ajouterCreneau, composer, libelleCreneau, retirerCreneau } from '../domaine/calendrier';
import { libelleDistance, type Position } from '../domaine/rayon';
import {
  DUREES, ETAPES, etapeAtteignable, etapeComplete, libelleDuree, LIBELLES,
  LIBELLES_NIVEAU, manqueA, MESSAGE_MAX, NIVEAUX_MATCH, peutPublier, precedente,
  SAISIE_VIDE, suivante, type Etape, type Saisie as Brouillon,
} from '../domaine/assistant';
import type { TerrainVerifie } from '../domaine/terrains';
import type { CreerMatch as Saisie } from '../domaine/schemas';

const EFFECTIFS = [6, 8, 10, 12] as const;

export function CreerMatch({
  domicile, occupe = false, onCreer,
}: {
  domicile: Position | null;
  occupe?: boolean;
  onCreer(v: Saisie): void;
}) {
  const terrains = useMemo(() => terrainsProches(domicile, 3), [domicile]);
  const [terrain, setTerrain] = useState<TerrainVerifie | null>(null);
  const [etape, setEtape] = useState<Etape>('infos');
  const [b, setB] = useState<Brouillon>(SAISIE_VIDE);

  const maj = <K extends keyof Brouillon>(cle: K, v: Brouillon[K]) =>
    setB((p) => ({ ...p, [cle]: v }));

  /** Le jour sélectionné au calendrier, et l'heure tapée. Ils ne deviennent
   *  un créneau qu'à l'ajout : on choisit un jour, une heure, puis on ajoute
   *  — et on recommence. C'est ce qui permet d'en proposer plusieurs. */
  const [jour, setJour] = useState<Date | null>(null);
  const [heure, setHeure] = useState('19:00');
  const [refus, setRefus] = useState<string | null>(null);

  const ajouter = () => {
    const r = ajouterCreneau(b.creneaux, composer(jour ?? new Date(NaN), heure));
    if (!r.ok) {
      setRefus(r.probleme);
      return;
    }
    setRefus(null);
    maj('creneaux', r.creneaux);
  };

  const manque = manqueA(etape, b);
  const suite = suivante(etape);
  const retour = precedente(etape);

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto px-4 pt-6 pb-28">
      <h1 className="mb-4 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
        Créer un match
      </h1>

      {/* LE CHEMIN PARCOURU. Un formulaire d'une page ne dit pas où on en est
          ni combien il en reste ; quatre pastilles le disent d'un coup d'œil.
          Une étape franchie reste cliquable — corriger le terrain depuis la
          dernière page ne doit pas coûter trois retours en arrière. */}
      <nav aria-label="Étapes" className="mb-5 flex items-center">
        {ETAPES.map((e, i) => {
          const faite = etapeComplete(e, b) && ETAPES.indexOf(etape) > i;
          const courante = e === etape;
          const ouverte = etapeAtteignable(e, b);
          return (
            <div key={e} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                disabled={!ouverte}
                onClick={() => ouverte && setEtape(e)}
                aria-current={courante ? 'step' : undefined}
                className="flex min-w-0 flex-col items-center gap-1 disabled:opacity-40"
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-(--duration-doigt) ${
                    courante
                      ? 'bg-(--color-vert) text-(--color-fond)'
                      : faite
                        ? 'bg-(--color-vert)/25 text-(--color-vert)'
                        : 'bg-white/10 text-(--color-encre-faible)'
                  }`}
                >
                  {faite ? '✓' : i + 1}
                </span>
                <span
                  className={`max-w-full truncate text-[11px] ${
                    courante ? 'text-(--color-encre)' : 'text-(--color-encre-faible)'
                  }`}
                >
                  {LIBELLES[e]}
                </span>
              </button>
              {i < ETAPES.length - 1 && (
                <span
                  aria-hidden
                  className={`mb-4 h-px min-w-2 flex-1 ${faite ? 'bg-(--color-vert)/40' : 'bg-white/10'}`}
                />
              )}
            </div>
          );
        })}
      </nav>

      {etape === 'infos' && (
        <>
          <Plaque className="mb-3 p-4">
            <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Quand
            </p>
            {/* ON EN PROPOSE PLUSIEURS, et c'est le vote qui tranche. Le
                calendrier sert à les composer soi-même : choisir un jour, une
                heure, ajouter — et recommencer. */}
            <p className="mb-3 text-xs text-(--color-encre-sec)">
              Choisis un jour et une heure, puis ajoute. Propose-en plusieurs :
              c’est le vote qui tranchera.
            </p>

            <Calendrier choisi={jour} onChoisir={(d) => { setJour(d); setRefus(null); }} />

            <div className="mt-3 flex items-center gap-2">
              <label className="flex-1">
                <span className="sr-only">Heure du match</span>
                <input
                  type="time"
                  step={900}
                  value={heure}
                  onChange={(e) => { setHeure(e.target.value); setRefus(null); }}
                  className="w-full rounded-(--radius-sm) bg-(--color-fond)/92 px-3 py-2.5 text-center text-base font-semibold text-(--color-encre) outline-none focus:ring-1 focus:ring-(--color-vert)"
                />
              </label>
              <button
                type="button"
                disabled={!jour}
                onClick={ajouter}
                className="rounded-(--radius-pill) bg-(--color-vert) px-5 py-2.5 text-sm font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
              >
                Ajouter
              </button>
            </div>

            {/* On dit POURQUOI l'ajout n'a pas pris. Un appui sans effet se
                lit comme une panne. */}
            {refus && <p className="mt-2 text-xs text-(--color-feu)">{refus}</p>}

            {b.creneaux.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {b.creneaux.map((c) => (
                  <li
                    key={c.getTime()}
                    className="flex items-center gap-2 rounded-(--radius-sm) bg-(--color-vert)/12 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm first-letter:uppercase">
                      {libelleCreneau(c)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Retirer ${libelleCreneau(c)}`}
                      onClick={() => maj('creneaux', retirerCreneau(b.creneaux, c))}
                      className="grid size-7 shrink-0 place-items-center rounded-full text-(--color-encre-faible)"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Plaque>

          <Plaque className="p-4">
            <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Durée
            </p>
            <Choix
              options={DUREES.map((d) => ({ cle: d, label: libelleDuree(d) }))}
              valeur={b.duree}
              onChange={(d) => maj('duree', d)}
            />
          </Plaque>
        </>
      )}

      {etape === 'lieu' && (
        <Plaque className="p-4">
          <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
            Où
          </p>
          <p className="mb-3 text-xs text-(--color-encre-sec)">
            Les terrains les plus proches de chez toi, tous vérifiés.
          </p>
          <div className="flex flex-col gap-2">
            {terrains.map(({ terrain: t, km }) => {
              const actif = terrain?.n === t.n;
              return (
                <button
                  key={t.n}
                  type="button"
                  onClick={() => {
                    setTerrain(t);
                    maj('lieu', t.n);
                  }}
                  aria-pressed={actif}
                  className={`rounded-(--radius-md) border p-3 text-left transition-colors duration-(--duration-doigt) ${
                    actif ? 'border-(--color-vert) bg-(--color-vert)/12' : 'border-white/10 bg-black/25'
                  }`}
                >
                  <p className="text-sm font-medium">{t.n}</p>
                  <p className="mt-0.5 text-xs text-(--color-encre-sec)">{t.adr}</p>
                  {km != null && (
                    <p className="mt-0.5 text-xs text-(--color-encre-faible)">{libelleDistance(km)}</p>
                  )}
                </button>
              );
            })}
          </div>
        </Plaque>
      )}

      {etape === 'joueurs' && (
        <>
          <Plaque className="mb-3 p-4">
            <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Combien de joueurs
            </p>
            <Choix
              options={EFFECTIFS.map((n) => ({ cle: n, label: String(n) }))}
              valeur={b.joueursMax}
              onChange={(n) => maj('joueursMax', n)}
            />
          </Plaque>

          <Plaque className="p-4">
            <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Niveau
            </p>
            {/* « Tous niveaux » se DIT. Un match sans niveau déclaré ne dit
                rien, et c'est ce qui fait hésiter un débutant. */}
            <p className="mb-3 text-xs text-(--color-encre-sec)">
              Indicatif — personne n’est refusé à la porte.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NIVEAUX_MATCH.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => maj('niveau', n)}
                  aria-pressed={b.niveau === n}
                  className={`rounded-(--radius-pill) px-3 py-1.5 text-sm transition-colors duration-(--duration-doigt) ${
                    b.niveau === n
                      ? 'bg-(--color-vert) font-semibold text-(--color-fond)'
                      : 'bg-black/30 text-(--color-encre-sec)'
                  }`}
                >
                  {LIBELLES_NIVEAU[n]}
                </button>
              ))}
            </div>
          </Plaque>
        </>
      )}

      {etape === 'publier' && (
        <>
          <Plaque className="mb-3 p-4">
            <p className="mb-1 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Un mot
            </p>
            <p className="mb-3 text-xs text-(--color-encre-sec)">
              Facultatif — « match chill, bon esprit », « on cherche un gardien ».
            </p>
            <textarea
              value={b.message}
              onChange={(ev) => maj('message', ev.target.value.slice(0, MESSAGE_MAX))}
              rows={3}
              maxLength={MESSAGE_MAX}
              aria-label="Un mot sur le match"
              className="w-full resize-none rounded-(--radius-sm) bg-(--color-fond)/92 p-3 text-sm text-(--color-encre) outline-none placeholder:text-(--color-encre-faible) focus:ring-1 focus:ring-(--color-vert)"
              placeholder="Match chill, bon esprit, venez motivés !"
            />
            <p className="mt-1 text-right text-[11px] text-(--color-encre-faible) tabular-nums">
              {b.message.length}/{MESSAGE_MAX}
            </p>
          </Plaque>

          {/* LE RÉCAPITULATIF. On relit avant de publier : c'est le dernier
              moment où une erreur coûte un appui plutôt qu'un message dans le
              fil du match. */}
          <Plaque className="p-0">
            {[
              { icone: 'calendrier' as const, label: `${b.creneaux.length} créneau${b.creneaux.length > 1 ? 'x' : ''} proposé${b.creneaux.length > 1 ? 's' : ''}`, vers: 'infos' as const },
              { icone: 'ballon' as const, label: `${libelleDuree(b.duree)} de jeu`, vers: 'infos' as const },
              { icone: 'carte' as const, label: b.lieu ?? '', vers: 'lieu' as const },
              { icone: 'joueur' as const, label: `${b.joueursMax} joueurs · ${LIBELLES_NIVEAU[b.niveau]}`, vers: 'joueurs' as const },
            ].map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={() => setEtape(l.vers)}
                className="flex w-full items-center gap-3 border-b border-white/6 px-4 py-3 text-left last:border-0"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/8 text-(--color-vert)">
                  <Icone nom={l.icone} taille={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-(--color-encre-sec)">
                  {l.label}
                </span>
                <span className="shrink-0 text-xs text-(--color-encre-faible)">Changer</span>
              </button>
            ))}
          </Plaque>
        </>
      )}

      {/* On dit ce qui manque AVANT de griser le bouton. Un bouton mort sans
          explication laisse croire que l'app est cassée. */}
      {manque && <p className="mt-3 text-center text-sm text-(--color-feu)">{manque}</p>}

      <div className="mt-4 flex gap-2">
        {retour && (
          <button
            type="button"
            onClick={() => setEtape(retour)}
            className="rounded-(--radius-pill) bg-white/10 px-5 py-3.5 text-sm font-medium"
          >
            Retour
          </button>
        )}
        {suite ? (
          <button
            type="button"
            disabled={!etapeComplete(etape, b)}
            onClick={() => setEtape(suite)}
            className="flex-1 rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
          >
            Suivant
          </button>
        ) : (
          <button
            type="button"
            disabled={occupe || !peutPublier(b)}
            onClick={() =>
              b.lieu &&
              onCreer({
                sport: 'foot5',
                joueursMax: b.joueursMax,
                duree: b.duree,
                niveau: b.niveau,
                message: b.message.trim(),
                creneauxProposes: b.creneaux.map((date) => ({
                  date,
                  lieu: b.lieu as string,
                })),
              })
            }
            className="flex-1 rounded-(--radius-pill) bg-(--color-vert) py-3.5 font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
          >
            Proposer le match
          </button>
        )}
      </div>
    </div>
  );
}

/** Une rangée de pastilles à choix unique. */
function Choix<T extends string | number>({
  options, valeur, onChange,
}: {
  options: readonly { cle: T; label: string }[];
  valeur: T;
  onChange(v: T): void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.cle)}
          type="button"
          onClick={() => onChange(o.cle)}
          aria-pressed={valeur === o.cle}
          className={`min-w-0 flex-1 rounded-(--radius-pill) px-2 py-2 text-sm transition-colors duration-(--duration-doigt) ${
            valeur === o.cle
              ? 'bg-(--color-vert) font-semibold text-(--color-fond)'
              : 'bg-black/30 text-(--color-encre-sec)'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
