import { useState } from 'react';
import {
  grilleDuMois, JOURS_COURTS, libelleMois, moisPrecedent, moisSuivant,
  peutAvancer, peutReculer,
} from '../domaine/calendrier';

/** Une grille de mois. Toute la logique — décalage du lundi, débordement,
 *  horizon — vit dans `domaine/calendrier` : un calendrier se trompe sur les
 *  mois à 31 jours et les débuts de semaine, et aucune de ces erreurs ne se
 *  voit sur une capture d'écran. */
export function Calendrier({
  choisi, onChoisir, maintenant = new Date(),
}: {
  choisi: Date | null;
  onChoisir(d: Date): void;
  maintenant?: Date;
}) {
  const [mois, setMois] = useState(() => new Date(maintenant.getFullYear(), maintenant.getMonth(), 1));
  const semaines = grilleDuMois(mois, maintenant);
  const memeJour = (a: Date, b: Date | null) =>
    !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Fleche
          sens="précédent"
          actif={peutReculer(mois, maintenant)}
          onClick={() => setMois(moisPrecedent(mois))}
        />
        <span className="text-sm font-semibold first-letter:uppercase">{libelleMois(mois)}</span>
        <Fleche
          sens="suivant"
          actif={peutAvancer(mois, maintenant)}
          onClick={() => setMois(moisSuivant(mois))}
        />
      </div>

      <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={libelleMois(mois)}>
        {JOURS_COURTS.map((j, i) => (
          <span
            key={i}
            aria-hidden
            className="py-1 text-center text-[11px] font-semibold text-(--color-encre-faible)"
          >
            {j}
          </span>
        ))}

        {semaines.flat().map((j) => {
          const actif = memeJour(j.date, choisi);
          return (
            <button
              key={j.date.toISOString()}
              type="button"
              disabled={!j.choisissable || !j.duMois}
              onClick={() => onChoisir(j.date)}
              aria-pressed={actif}
              aria-hidden={!j.duMois}
              aria-label={
                j.duMois
                  ? j.date.toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })
                  : undefined
              }
              className={`grid aspect-square place-items-center rounded-(--radius-sm) text-sm transition-colors duration-(--duration-doigt) ${
                actif
                  ? 'bg-(--color-vert) font-bold text-(--color-fond)'
                  : j.aujourdhui
                    ? 'bg-white/10 font-semibold text-(--color-encre) ring-1 ring-(--color-vert)/50'
                    : 'text-(--color-encre) hover:bg-white/8'
              } disabled:pointer-events-none disabled:opacity-40`}
            >
              {/* LES JOURS DES MOIS VOISINS NE PORTENT PAS DE CHIFFRE.
                  Ils étaient grisés à 50 % : mesuré à 2,57 de contraste, sous
                  le seuil AA. Les éclaircir jusqu'au seuil les aurait rendus
                  semblables aux vrais jours, ce qui est pire — on ne sait plus
                  dans quel mois on est. La case reste là pour que la grille
                  ne soit pas trouée ; elle n'annonce simplement rien. */}
              {j.duMois ? j.date.getDate() : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Fleche({
  sens, actif, onClick,
}: {
  sens: 'précédent' | 'suivant';
  actif: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      disabled={!actif}
      onClick={onClick}
      aria-label={`Mois ${sens}`}
      className="grid size-8 place-items-center rounded-full bg-white/8 text-(--color-encre-sec) disabled:opacity-25"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={sens === 'précédent' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}
