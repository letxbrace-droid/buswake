import { Plaque } from '../composants/Plaque';
import { Icone } from '../composants/Icone';
import { progressionDe } from '../domaine/xp';
import { libelleRayon } from '../domaine/rayon';
import type { Vedette } from '../domaine/accueil';

export interface ActionsAccueil {
  onProfil(): void;
  onJoueurs(): void;
  onOuvrirMatch(id: string): void;
  onRejoindre(id: string): void;
  onProposer(): void;
  onMatchs(): void;
  onRang(): void;
  onTerrains(): void;
}

/** Écran d'accueil — un seul focus, une seule action.
 *
 *  TOUT CE QUI EST AFFICHÉ ICI EST CALCULÉ. L'écran portait auparavant
 *  « Jeudi 18h30 · Le Five Massy · 8 inscrits sur 10 » et « 3 terrains à
 *  moins de 10 km » écrits en dur, et deux cartes d'apparence cliquable qui
 *  ne faisaient rien. Sur un vrai compte, le match était ailleurs, à une
 *  autre heure, avec un autre nombre d'inscrits. */
export function Accueil({
  pseudo, xp, vedette, terrains, km, actions,
}: {
  pseudo: string;
  xp: number;
  vedette: Vedette | null;
  terrains: number;
  km: number;
  actions: ActionsAccueil;
}) {
  const p = progressionDe(xp);
  const quand = vedette?.quand
    ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
        .format(vedette.quand)
        .replace(':', 'h')
    : null;

  return (
    <div className="terrain terrain-accueil h-full overflow-y-auto px-4 pt-6 pb-28">
      {/* L'EN-TÊTE MÈNE AU PROFIL. La route `/profil` — et donc la carte
          joueur — n'était liée depuis NULLE PART : ni la barre du bas, ni un
          écran. Elle existait, elle rendait, et personne ne pouvait
          l'atteindre.

          `pr-12` : le bouton des réglages est posé en absolu dans ce coin.
          Sans la réserve, un total d'XP à quatre chiffres passait dessous. */}
      <button
        type="button"
        onClick={actions.onProfil}
        aria-label="Voir ma carte joueur"
        className="mb-5 flex w-full items-baseline justify-between gap-3 pr-12 text-left"
      >
        <span className="min-w-0 truncate font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
          Salut {pseudo}
        </span>
        <span className="shrink-0 text-sm text-(--color-encre-sec)">{xp} XP</span>
      </button>

      {vedette ? (
        <Plaque variante="heros" className="mb-4 p-5">
          <p className="text-xs tracking-[0.18em] text-(--color-encre-faible) uppercase">
            {vedette.dedans ? 'Le prochain' : 'À caler près de toi'}
          </p>
          <p className="mt-2 font-[family-name:var(--font-titre)] text-4xl first-letter:uppercase">
            {quand ?? 'Créneau à trancher'}
          </p>
          <p className="mt-1 text-(--color-encre-sec)">
            {[vedette.lieu, `${vedette.inscrits} inscrits sur ${vedette.inscrits + vedette.places}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <button
            type="button"
            onClick={() =>
              vedette.dedans
                ? actions.onOuvrirMatch(vedette.match.id)
                : actions.onRejoindre(vedette.match.id)
            }
            className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond) transition-transform duration-(--duration-doigt) active:scale-[0.98]"
          >
            {vedette.dedans ? 'Voir le match' : 'Je viens'}
          </button>
        </Plaque>
      ) : (
        // « Rien » se dit. Un héros vide vaut mieux qu'un héros inventé.
        <Plaque variante="heros" className="mb-4 p-5">
          <p className="text-xs tracking-[0.18em] text-(--color-encre-faible) uppercase">
            Le prochain
          </p>
          <p className="mt-2 font-[family-name:var(--font-titre)] text-3xl">Aucun match en vue</p>
          <p className="mt-1 text-(--color-encre-sec)">
            Personne n’a encore proposé de créneau dans ton rayon.
          </p>
          <button
            type="button"
            onClick={actions.onProposer}
            className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond) transition-transform duration-(--duration-doigt) active:scale-[0.98]"
          >
            Proposer un match
          </button>
        </Plaque>
      )}

      {/* LES TROIS ACTIONS, comme dans la maquette. Elles remplacent le « + »
          flottant de la barre : lues en toutes lettres, elles se comprennent
          sans apprendre, et « Trouver des joueurs » n'avait aucune porte
          d'entrée depuis que la barre est passée à cinq onglets. */}
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {[
          { nom: 'plus' as const, label: 'Créer\nun match', faire: actions.onProposer },
          { nom: 'calendrier' as const, label: 'Rejoindre\nun match', faire: actions.onMatchs },
          { nom: 'recherche' as const, label: 'Trouver\ndes joueurs', faire: actions.onJoueurs },
        ].map((t) => (
          <Plaque key={t.label} action className="p-0">
            <button
              type="button"
              onClick={t.faire}
              className="flex w-full flex-col items-center gap-2 px-2 py-3.5"
            >
              <span className="grid size-9 place-items-center rounded-full bg-(--color-vert)/15 text-(--color-vert)">
                <Icone nom={t.nom} taille={19} />
              </span>
              <span className="text-center text-[11px] leading-tight whitespace-pre-line text-(--color-encre-sec)">
                {t.label}
              </span>
            </button>
          </Plaque>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Plaque action className="p-0">
          <button type="button" onClick={actions.onRang} className="w-full p-4 text-left">
            <p className="text-xs text-(--color-encre-faible) uppercase">Ton rang</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: p.rang.couleur }}>
              {p.rang.label}
            </p>
            {p.suivant && (
              <p className="mt-1 text-xs text-(--color-encre-sec)">
                {p.restant} XP avant {p.suivant.label}
              </p>
            )}
          </button>
        </Plaque>

        <Plaque action className="p-0">
          <button type="button" onClick={actions.onTerrains} className="w-full p-4 text-left">
            <p className="text-xs text-(--color-encre-faible) uppercase">Autour de toi</p>
            <p className="mt-1 text-xl font-semibold">
              {terrains} terrain{terrains > 1 ? 's' : ''}
            </p>
            <p className="mt-1 text-xs text-(--color-encre-sec)">
              {km ? `à moins de ${libelleRayon(km)}` : 'tous les terrains connus'}
            </p>
          </button>
        </Plaque>
      </div>
    </div>
  );
}
