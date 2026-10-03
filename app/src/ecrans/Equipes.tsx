import { useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { peutCreerUnClub, peutRejoindre } from '../domaine/creationClub';
import { Blason } from '../composants/Blason';
import { bilanEquipe, etatEquipe, NIVEAUX, type Equipe } from '../domaine/equipe';

export function Equipes({
  equipes, uid = null, occupe = false, onCreer = () => {}, onRejoindre = () => {},
}: {
  equipes: readonly Equipe[];
  uid?: string | null;
  occupe?: boolean;
  onCreer?(): void;
  onRejoindre?(id: string): void;
}) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const creation = peutCreerUnClub(equipes, uid);
  // Celles qui cherchent d'abord, et parmi elles CELLES QUI CHERCHENT LE
  // MOINS : il manque un joueur à une équipe, elle joue ce soir si quelqu'un
  // dit oui. Il en manque quatre, c'est un projet. Trier par état seul
  // laissait « 3 places » passer devant « 2 places », ce qui n'a aucun sens
  // pour qui cherche où s'insérer.
  const triees = [...equipes].sort((a, b) => {
    const ma = etatEquipe(a).manque;
    const mb = etatEquipe(b).manque;
    // Parenthèses explicites : `ma === 0 !== (mb === 0)` se lit comme une
    // comparaison à trois termes alors que c'en est un OU EXCLUSIF entre
    // deux booléens. Même résultat, mais l'intention se lisait mal.
    const complete = (n: number) => n === 0;
    if (complete(ma) !== complete(mb)) return complete(ma) ? 1 : -1; // les prêtes en bas
    return ma - mb;
  });

  return (
    <div className="terrain terrain-equipes h-full overflow-y-auto px-4 pt-6 pb-(--reserve-dock)">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="titre-ecran">
          Équipes
        </h1>
        <span className="text-xs text-(--color-encre-sec)">{equipes.length}</span>
      </header>

      {equipes.length === 0 ? (
        <Plaque className="p-8 text-center">
          <p className="font-[family-name:var(--font-titre)] text-xl">Aucune équipe</p>
          <p className="mt-2 text-sm text-(--color-encre-sec)">
            Crée la tienne : un nom, une couleur, un emblème.
          </p>
          <button type="button" onClick={onCreer} className="btn btn-vert mt-5 w-full">
            Créer mon club
          </button>
        </Plaque>
      ) : (
        <>
          {/* Créer reste à portée même quand la liste est pleine : avant, ce
              chemin n'existait que sur une liste vide. */}
          {creation.peut && (
            <button type="button" onClick={onCreer} className="btn btn-vert mb-4 w-full">
              Créer mon club
            </button>
          )}
          <div className="flex flex-col gap-3">
            {triees.map((e) => (
              <CarteEquipe
                key={e.id}
                e={e}
                ouverte={ouverte === e.id}
                onBasculer={() => setOuverte(ouverte === e.id ? null : e.id)}
                adhesion={peutRejoindre(e, equipes, uid)}
                occupe={occupe}
                onRejoindre={() => onRejoindre(e.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CarteEquipe({
  e, ouverte, onBasculer, adhesion, occupe, onRejoindre,
}: {
  e: Equipe;
  ouverte: boolean;
  onBasculer(): void;
  adhesion: ReturnType<typeof peutRejoindre>;
  occupe: boolean;
  onRejoindre(): void;
}) {
  const etat = etatEquipe(e);
  const b = bilanEquipe(e);

  return (
    <Plaque className="overflow-hidden">
    {/* La carte se touchait et ne faisait RIEN. Elle s'ouvre maintenant sur
        l'appel du club et le bouton pour le rejoindre. */}
    <button
      type="button"
      onClick={onBasculer}
      aria-expanded={ouverte}
      className="flex w-full items-center gap-3 p-4 text-left"
    >
      <Blason e={e} taille={46} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{e.nom}</p>
        <p className="truncate text-xs text-(--color-encre-sec)">
          {e.niveau ? NIVEAUX[e.niveau] : 'Tous niveaux'} · {b.v}V {b.n}N {b.d}D
          {b.serie >= 3 && <span className="text-(--color-feu)"> · {b.serie} d’affilée</span>}
        </p>
      </div>

      {/* Le manque est la seule information qui fasse agir : il porte la
          couleur, et c'est le seul endroit accentué de la carte. */}
      <span
        className={`shrink-0 rounded-(--radius-pill) px-2.5 py-1 text-xs font-medium ${
          etat.cle === 'prete'
            ? 'bg-white/8 text-(--color-encre-sec)'
            : etat.cle === 'incomplete'
              ? 'bg-[color-mix(in_srgb,var(--color-feu)_16%,var(--color-fond))] text-(--color-feu)'
              : 'bg-[color-mix(in_srgb,var(--color-vert)_16%,var(--color-fond))] text-(--color-vert)'
        }`}
      >
        {etat.cle === 'prete' ? 'Prête' : etat.manque === 1 ? '1 place' : `${etat.manque} places`}
      </span>
    </button>

    {ouverte && (
      <div className="border-t border-white/8 px-4 pt-3 pb-4">
        {e.appel && <p className="mb-2 text-sm text-(--color-encre)">« {e.appel} »</p>}
        <p className="mb-3 text-xs text-(--color-encre-sec)">
          {(e.membres ?? []).length} membre{(e.membres ?? []).length > 1 ? 's' : ''}
        </p>
        {adhesion.peut ? (
          <button type="button" disabled={occupe} onClick={onRejoindre} className="btn btn-vert w-full">
            Rejoindre {e.nom}
          </button>
        ) : (
          <p className="text-center text-xs text-(--color-encre-faible)">{adhesion.pourquoi}</p>
        )}
      </div>
    )}
    </Plaque>
  );
}
