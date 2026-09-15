import { EMBLEMES, couleurEquipe, encreBlason, initialesEquipe, type Equipe } from '../domaine/equipe';

/** Le blason d'une équipe : un aplat à sa couleur, et dessus soit un tracé
 *  recoloré, soit ses initiales. L'encre est CALCULÉE (celle des deux qui
 *  contraste le plus), jamais choisie à l'œil — c'est ce qui garantit que les
 *  quatre-vingt-dix combinaisons restent lisibles. */
export function Blason({ e, taille = 46 }: { e: Equipe; taille?: number }) {
  const fond = couleurEquipe(e);
  const encre = encreBlason(fond);
  const trace = e.embleme ? EMBLEMES[e.embleme] : undefined;

  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-(--radius-md)"
      style={{
        width: taille,
        height: taille,
        background: fond,
        // Un blason très clair (un jaune) se perd sur le noir : on lui donne
        // un liseré pour le détacher du fond sans toucher à sa couleur.
        boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .18), 0 0 0 1px rgb(255 255 255 / .10)',
      }}
      aria-hidden
    >
      {trace ? (
        <svg width={taille * 0.58} height={taille * 0.58} viewBox="0 0 24 24" fill={encre}>
          <path d={trace} />
        </svg>
      ) : (
        <b style={{ color: encre, fontSize: taille * 0.34, letterSpacing: '-0.02em' }}>
          {initialesEquipe(e.nom)}
        </b>
      )}
    </span>
  );
}
