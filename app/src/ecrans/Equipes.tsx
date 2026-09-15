import { Plaque } from '../composants/Plaque';
import { Blason } from '../composants/Blason';
import { bilanEquipe, etatEquipe, NIVEAUX, type Equipe } from '../domaine/equipe';

export function Equipes({ equipes }: { equipes: readonly Equipe[] }) {
  // Celles qui cherchent d'abord, et parmi elles CELLES QUI CHERCHENT LE
  // MOINS : il manque un joueur à une équipe, elle joue ce soir si quelqu'un
  // dit oui. Il en manque quatre, c'est un projet. Trier par état seul
  // laissait « 3 places » passer devant « 2 places », ce qui n'a aucun sens
  // pour qui cherche où s'insérer.
  const triees = [...equipes].sort((a, b) => {
    const ma = etatEquipe(a).manque;
    const mb = etatEquipe(b).manque;
    if (ma === 0 !== (mb === 0)) return ma === 0 ? 1 : -1; // les prêtes en bas
    return ma - mb;
  });

  return (
    <div className="terrain terrain-equipes min-h-full overflow-y-auto px-4 pt-6 pb-28">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
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
          <button className="mt-5 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond)">
            Créer une équipe
          </button>
        </Plaque>
      ) : (
        <div className="flex flex-col gap-3">
          {triees.map((e) => (
            <CarteEquipe key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function CarteEquipe({ e }: { e: Equipe }) {
  const etat = etatEquipe(e);
  const b = bilanEquipe(e);

  return (
    <Plaque action as="button" className="flex w-full items-center gap-3 p-4 text-left">
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
              ? 'bg-(--color-feu)/18 text-(--color-feu)'
              : 'bg-(--color-vert)/15 text-(--color-vert)'
        }`}
      >
        {etat.cle === 'prete' ? 'Prête' : etat.manque === 1 ? '1 place' : `${etat.manque} places`}
      </span>
    </Plaque>
  );
}
