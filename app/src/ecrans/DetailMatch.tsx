import { useState } from 'react';
import { Plaque } from '../composants/Plaque';
import {
  aVote, creneauGagnant, peutConfirmer, placeEnRejoignant, type Votes,
} from '../domaine/cycle';
import { maxJoueurs, versDate } from '../domaine/match';
import type { Match } from '../domaine/schemas';
import { Pulse } from '../composants/Pulse';
import { Icone } from '../composants/Icone';
import { YAller } from '../composants/YAller';
import { Avatar, RangeeJoueurs } from '../composants/Avatar';
import {
  ambianceDuTerrain, detailsDuLieu, ficheDuTerrain, formatDuMatch, nomDuLieu,
  type Ambiance,
} from '../domaine/terrainDuMatch';
// Importées et non écrites en chemin : Vite les empreinte et les résout
// depuis `src/`. Un `src="./terrain-indoor.jpg"` ne charge rien.
import photoIndoor from '../../../terrain-indoor.jpg';
import photoUrbain from '../../../terrain-urban.jpg';
import photoPleinAir from '../../../terrain-plein-air.jpg';

const PHOTOS: Record<Ambiance, string> = {
  indoor: photoIndoor,
  urbain: photoUrbain,
  'plein-air': photoPleinAir,
};
import { useEntree } from '../services/useEntree';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function quand(d: Date): string {
  const min = d.getMinutes();
  return `${JOURS[d.getDay()]} ${d.getDate()} · ${d.getHours()}h${min ? String(min).padStart(2, '0') : ''}`;
}

export interface ActionsMatch {
  onVoter(index: number): void;
  onRejoindre(): void;
  onQuitter(): void;
  onConfirmer(index: number): void;
  onSupprimer(): void;
  onPartager(): void;
}

export function DetailMatch({
  m, votes, uid, actions, occupe = false, pseudos = {},
}: {
  m: Match;
  votes: Votes;
  uid: string;
  actions: ActionsMatch;
  /** Vrai pendant qu'une écriture est en vol : on grise plutôt que de
   *  laisser cliquer deux fois. */
  occupe?: boolean;
  /** uid → pseudo. Absent, la rangée ne rend pas plutôt que d'afficher des
   *  identifiants bruts. */
  pseudos?: Record<string, string>;
}) {
  const inscrits = m.joueursInscrits ?? [];
  const banc = (m as Match & { waitlist?: string[] }).waitlist ?? [];
  const total = maxJoueurs(m);
  const place = placeEnRejoignant(m, uid);
  const dedans = place === 'deja-titulaire' || place === 'deja-banc';
  const createur = m.createurUid === uid;
  const [confirme, setConfirme] = useState(false);
  // Rejouer le geste quand l'effectif change : quelqu'un vient d'arriver.
  const entree = useEntree(inscrits.length);
  const conf = peutConfirmer(m);
  const fiche = ficheDuTerrain(m);
  const photo = PHOTOS[ambianceDuTerrain(fiche)];
  const details = detailsDuLieu(m, fiche);
  const gagnant = creneauGagnant(m, votes);
  const finale = versDate(m.dateFinale);
  const enTete =
    gagnant != null ? versDate((m.creneauxProposes ?? [])[gagnant.index]?.date) : null;

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto pb-28">
      {/* LA PHOTO D'AMBIANCE. Elle est choisie sur le TYPE de terrain, pas par
          lieu : il n'existe pas de photo par centre, et en afficher une prise
          ailleurs ferait croire à une vue du terrain réel. */}
      <div className="relative -mt-px h-44 overflow-hidden">
        <img
          src={photo}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-(--color-fond) via-(--color-fond)/35 to-(--color-fond)/55" />

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 px-4 pb-3">
          <span className="rounded-(--radius-pill) bg-black/55 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
            {formatDuMatch(m)}
          </span>
          <span className="rounded-(--radius-pill) bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-(--color-encre-sec) backdrop-blur-sm">
            {m.statut === 'sondage' ? 'À caler' : m.statut === 'confirmé' ? 'Confirmé' : m.statut}
          </span>
          {conf.manque > 0 ? (
            <span className="rounded-(--radius-pill) bg-(--color-vert) px-2.5 py-1 text-[11px] font-bold text-(--color-fond)">
              {conf.manque} place{conf.manque > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="rounded-(--radius-pill) bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-(--color-encre-faible) backdrop-blur-sm">
              Complet
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
      <Plaque variante="heros" className="mb-4 p-5">
        {/* Même règle que sur la carte : l'œil cherche une date. Tant que le
            créneau n'est pas tranché, on montre CELUI QUI MÈNE, et on dit que
            c'est provisoire — « créneau en cours de vote » en titre géant
            occupe la place la plus visible pour ne rien dire. */}
        <p className="mt-2 font-[family-name:var(--font-titre)] text-3xl">
          {finale ? quand(finale) : enTete ? quand(enTete) : 'Aucun créneau proposé'}
        </p>
        {!finale && enTete && (
          <p className="text-xs text-(--color-encre-faible)">en tête du vote</p>
        )}
        <p className="mt-1 text-(--color-encre-sec)">{nomDuLieu(m) || 'Lieu à définir'}</p>

        {/* QUI VIENT, avant combien. La maquette montre les visages en
            premier : c'est ce qui donne envie d'entrer, pas un ratio. */}
        {inscrits.length > 0 && Object.keys(pseudos).length > 0 && (
          <div className="mt-3.5">
            <RangeeJoueurs
              joueurs={inscrits.map((u) => ({ uid: u, pseudo: pseudos[u] ?? '?' }))}
              total={total}
              taille={34}
              maxVisibles={5}
            />
          </div>
        )}

        {/* Le détail est un moment qu'on REGARDE : le Pulse y a plus de place
            qu'en liste, et c'est là que le geste compte le plus — c'est
            l'écran où l'on vient voir si l'équipe se réunit. */}
        <div className={`mt-4 flex items-center gap-2.5 ${entree}`}>
          <div className="min-w-0 flex-1">
            <Pulse pris={inscrits.length} total={total} hauteur={20} />
          </div>
          <span className="kpulse-cnt shrink-0 text-sm font-bold tabular-nums text-(--color-encre-sec)">
            <b className="text-(--color-encre)">{inscrits.length}</b>/{total}
          </span>
        </div>

        {conf.manque > 0 && m.statut === 'sondage' && (
          <p className="mt-2 text-xs text-(--color-feu)">
            {conf.manque === 1 ? 'Il manque 1 joueur' : `Il manque ${conf.manque} joueurs`}
          </p>
        )}

        <button
          type="button"
          disabled={occupe}
          onClick={dedans ? actions.onQuitter : actions.onRejoindre}
          className={`mt-4 w-full rounded-(--radius-pill) py-3 font-semibold transition-transform duration-(--duration-doigt) active:scale-[0.98] disabled:opacity-50 ${
            dedans
              ? 'bg-white/10 text-(--color-encre)'
              : 'bg-(--color-vert) text-(--color-fond)'
          }`}
        >
          {dedans
            ? place === 'deja-banc'
              ? 'Quitter le banc'
              : 'Je ne viens plus'
            : place === 'banc'
              ? 'Match plein — me mettre sur le banc'
              : 'Je viens'}
        </button>

        {/* Le banc n'est pas un refus : on le dit AVANT de cliquer, sinon le
            joueur croit qu'il s'inscrit et découvre après coup qu'il attend. */}
        {!dedans && place === 'banc' && (
          <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
            Tu entres dès que quelqu’un se désiste.
          </p>
        )}
      </Plaque>

      {m.statut === 'sondage' && (m.creneauxProposes ?? []).length > 0 && (
        <Plaque className="mb-4 p-4">
          <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
            Quel créneau ?
          </p>

          <div className="flex flex-col gap-2">
            {(m.creneauxProposes ?? []).map((c, i) => {
              const d = versDate(c.date);
              const voix = (votes[String(i)] ?? []).length;
              const mien = aVote(votes, String(i), uid);
              const gagne = gagnant?.index === i;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={occupe}
                  onClick={() => actions.onVoter(i)}
                  aria-pressed={mien}
                  className={`flex items-center gap-3 rounded-(--radius-md) border p-3 text-left transition-colors duration-(--duration-doigt) disabled:opacity-50 ${
                    mien
                      ? 'border-(--color-vert) bg-(--color-vert)/12'
                      : 'border-white/10 bg-black/25'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d ? quand(d) : 'Date à définir'}</p>
                    <p className="truncate text-xs text-(--color-encre-sec)">{c.lieu}</p>
                  </div>
                  {gagne && voix > 0 && (
                    <span // Fond noir et non une teinte du vert sous du vert : mesuré à 3.85:1,
                      // sous le seuil — le même piège que la pastille de tier.
                      className="shrink-0 rounded-(--radius-pill) bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-(--color-vert)">
                      EN TÊTE
                    </span>
                  )}
                  <span className="shrink-0 text-sm tabular-nums text-(--color-encre-sec)">
                    {voix}
                  </span>
                </button>
              );
            })}
          </div>

          {createur && (
            <>
              <button
                type="button"
                disabled={occupe || !conf.peut || !gagnant}
                onClick={() => gagnant && actions.onConfirmer(gagnant.index)}
                className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
              >
                Confirmer le créneau en tête
              </button>
              {/* On dit POURQUOI c'est grisé. Un bouton mort sans explication
                  laisse le créateur croire que l'app est cassée. */}
              {!conf.peut && (
                <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
                  {conf.inscrits}/{conf.requis} joueurs — confirmer maintenant promettrait un
                  match qui n’aura pas lieu.
                </p>
              )}
              {conf.peut && !gagnant && (
                <p className="mt-2 text-center text-xs text-(--color-encre-faible)">
                  Personne n’a encore voté.
                </p>
              )}
            </>
          )}
        </Plaque>
      )}

      <Plaque className="p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Sur le terrain · {inscrits.length}
        </p>
        {/* AVEC LES VISAGES, et surtout avec les NOMS : cette liste rendait
            les identifiants bruts de Firestore. « u7 » ne dit à personne qui
            vient jouer. */}
        <ul className="flex flex-col gap-2">
          {inscrits.map((j) => (
            <li key={j} className="flex items-center gap-2.5 text-sm">
              <Avatar uid={j} pseudo={pseudos[j] ?? '?'} taille={26} />
              <span className={j === uid ? 'font-semibold' : ''}>
                {j === uid ? 'Toi' : (pseudos[j] ?? 'Joueur')}
              </span>
            </li>
          ))}
        </ul>

        {banc.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
              Sur le banc · {banc.length}
            </p>
            <ul className="flex flex-col gap-1.5">
              {banc.map((j, i) => (
                <li key={j} className="flex items-center gap-2 text-sm text-(--color-encre-sec)">
                  <span className="w-4 tabular-nums text-(--color-encre-faible)">{i + 1}</span>
                  {j === uid ? 'Toi' : j}
                </li>
              ))}
            </ul>
          </>
        )}
      </Plaque>

      {/* CONFIRMATION EN DEUX TEMPS. La suppression efface le match pour
          tous les inscrits, avec leurs votes, et ne se défait pas. Un seul
          appui, au pouce, sur un bouton rouge en bas de page — c'est trop peu
          pour un geste sans retour. */}
      {createur && (
        <div className="mt-4">
          {!confirme ? (
            <button
              type="button"
              disabled={occupe}
              onClick={() => setConfirme(true)}
              className="w-full rounded-(--radius-pill) border border-(--color-rouge)/40 py-3 text-sm font-medium text-(--color-rouge) disabled:opacity-50"
            >
              Supprimer le match
            </button>
          ) : (
            <div role="group" aria-label="Confirmer la suppression">
              <p className="mb-2 text-center text-sm text-(--color-encre-sec)">
                Le match sera supprimé pour tout le monde, avec les votes et les
                inscriptions. C’est définitif.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirme(false)}
                  className="flex-1 rounded-(--radius-pill) bg-black/30 py-3 text-sm font-medium"
                >
                  Garder
                </button>
                <button
                  type="button"
                  disabled={occupe}
                  onClick={actions.onSupprimer}
                  className="flex-1 rounded-(--radius-pill) bg-(--color-rouge-fond) py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PARTAGER ET Y ALLER, côte à côte comme dans la maquette. Partager
          est l'action qui remplit un match : c'est elle qui mérite la place,
          pas un menu à trois points. */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={actions.onPartager}
          className="flex flex-1 items-center justify-center gap-2 rounded-(--radius-pill) bg-white/10 py-3 text-sm font-medium"
        >
          <Icone nom="partage" taille={17} />
          Partager
        </button>
        {fiche && (
          <div className="flex-1">
            <YAller lieu={fiche} />
          </div>
        )}
      </div>

      {/* DÉTAILS — chaque ligne sort d'un champ réel.
          La maquette en liste quatre : terrain couvert, chasubles fournies,
          vestiaires/douches, parking gratuit. Un seul est dans les données.
          Les trois autres seraient inventés, et un joueur qui arrive sans
          chasuble parce que l'app en promettait, c'est la règle 1 du produit
          retournée contre lui. Le jour où on veut les annoncer, il faudra les
          relever lieu par lieu. */}
      <section className="mt-5">
        <h2 className="mb-2 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">
          Détails
        </h2>
        <Plaque className="divide-y divide-white/6 p-0">
          {details.map((d) => (
            <div key={d.texte} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/8 text-(--color-vert)">
                <Icone nom={d.icone} taille={16} />
              </span>
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-(--color-vert) underline underline-offset-2"
                >
                  {d.texte}
                </a>
              ) : (
                <span className="min-w-0 flex-1 text-sm text-(--color-encre-sec)">{d.texte}</span>
              )}
            </div>
          ))}
        </Plaque>
      </section>
      </div>
    </div>
  );
}
