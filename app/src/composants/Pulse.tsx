import { construirePulse } from '../domaine/pulse';

/**
 * Le groupe qui se constitue, joueur par joueur.
 *
 * Les points se posent de gauche à droite, au ressort, 38 ms d'écart — le
 * décalage est porté par `--i` dans le markup, ce qui fait UNE règle CSS au
 * lieu de quarante. Voir `styles/mouvement.css`.
 */
export function Pulse({
  pris, total, hauteur = 16,
}: {
  pris: number;
  total: number;
  hauteur?: number;
}) {
  const p = construirePulse(pris, total);
  return (
    <svg
      className="kpulse"
      viewBox={`0 0 ${p.largeur} 10`}
      height={hauteur}
      width={Math.round((p.largeur * hauteur) / 10)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${p.pris} joueurs sur ${p.total}`}
    >
      {p.segments.map((s) => (
        <line
          key={`s${s.i}`}
          x1={s.x1} y1={5} x2={s.x2} y2={5}
          className={`kp-seg${s.allume ? ' on' : ''}`}
          style={{ '--i': s.i } as React.CSSProperties}
        />
      ))}
      {p.points.map((c) => (
        <circle
          key={`p${c.i}`}
          cx={c.cx} cy={5} r={c.r}
          className={`kp-dot${c.pris ? ' on' : ''}`}
          style={{ '--i': c.i } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}
