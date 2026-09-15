import {
  ATOUTS_LABELS, initiales, noteGlobale, posteDe, tierDe, type Atouts,
} from '../domaine/joueur';

export interface Joueur {
  readonly pseudo: string;
  readonly poste?: string;
  readonly atouts?: Partial<Atouts>;
  readonly club?: string;
}

/** La carte joueur — plein cadre, mate, façon poster.
 *
 *  Le tier ne change QUE le chiffre et le liseré : la carte reste la même
 *  carte. Trois habillages différents donneraient trois produits, pas trois
 *  niveaux d'un même produit. */
export function CarteFut({ j, largeur = 300 }: { j: Joueur; largeur?: number }) {
  const note = noteGlobale(j.atouts);
  const tier = tierDe(note);
  const poste = posteDe(j.poste);
  const atouts = Object.keys(ATOUTS_LABELS) as (keyof Atouts)[];

  return (
    <article
      className="relative mx-auto overflow-hidden"
      style={{
        width: largeur,
        aspectRatio: '0.71',
        background: tier.fond,
        borderRadius: 'var(--radius-xl)',
        // Le liseré du bas porte la couleur du tier : c'est le seul endroit
        // où le niveau se voit sans lire le chiffre.
        boxShadow: `inset 0 -3px 0 ${tier.couleur}, inset 0 0 0 1px rgb(255 255 255 / .09), 0 24px 48px -20px rgb(0 0 0 / .8)`,
      }}
    >
      {/* Barre haute : la note à gauche, l'identité à droite. */}
      <div className="flex items-start justify-between p-4">
        <div>
          <p
            className="font-[family-name:var(--font-titre)] leading-none"
            style={{ color: tier.couleur, fontSize: largeur * 0.17 }}
          >
            {note}
          </p>
          <p
            className="mt-0.5 text-xs font-semibold tracking-[0.12em]"
            style={{ color: tier.couleur }}
          >
            {poste.abbr}
          </p>
        </div>
        <span
          className="rounded-(--radius-pill) px-2 py-1 text-[10px] font-bold tracking-[0.16em]"
          // Fond noir et non une teinte de la couleur sur elle-même : le
          // bronze sur du bronze à 13 % tombait à 4.46:1, juste sous le seuil.
          style={{ background: 'rgb(0 0 0 / .42)', color: tier.couleur }}
        >
          {tier.label}
        </span>
      </div>

      {/* Le joueur, en initiales : aucune photo n'est demandée à l'inscription
          et un avatar vide vaut mieux qu'un avatar générique. */}
      <div className="grid place-items-center" style={{ height: largeur * 0.52 }}>
        <span
          className="grid place-items-center rounded-full font-[family-name:var(--font-titre)]"
          style={{
            width: largeur * 0.4,
            height: largeur * 0.4,
            fontSize: largeur * 0.15,
            background: 'rgb(255 255 255 / .07)',
            color: tier.couleur,
            boxShadow: `inset 0 0 0 2px ${tier.couleur}55`,
          }}
        >
          {initiales(j.pseudo)}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <p
          className="truncate text-center font-[family-name:var(--font-titre)] uppercase"
          style={{ fontSize: largeur * 0.105 }}
        >
          {j.pseudo}
        </p>

        <div className="mt-2.5 grid grid-cols-5 gap-1">
          {atouts.map((cle) => (
            <div key={cle} className="text-center">
              <p className="text-xs font-semibold tabular-nums">{j.atouts?.[cle] ?? 70}</p>
              <p className="text-[9px] tracking-wide text-white/55 uppercase">
                {ATOUTS_LABELS[cle].slice(0, 3)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
