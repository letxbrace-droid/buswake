import { useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { Blason } from '../composants/Blason';
import { COULEURS_EQUIPE, EMBLEMES, NIVEAUX, type Niveau } from '../domaine/equipe';
import {
  APPEL_MAX, CLUB_VIDE, NOM_CLUB_MAX, NOMS_EMBLEMES, problemeClub, type SaisieClub,
} from '../domaine/creationClub';

/** CRÉER UN CLUB — l'écran qui manquait.
 *
 *  Le blason se dessine EN DIRECT en haut : couleur et emblème se choisissent
 *  en voyant le résultat, pas sur des pastilles abstraites. */
export function CreerClub({
  occupe = false, bloque, onCreer, onVoirMonClub,
}: {
  occupe?: boolean;
  /** Déjà membre d'un club : on le dit, et on n'affiche pas le formulaire. */
  bloque: string | null;
  onCreer(s: SaisieClub): void;
  onVoirMonClub(): void;
}) {
  const [s, setS] = useState<SaisieClub>(CLUB_VIDE);
  const maj = <K extends keyof SaisieClub>(k: K, v: SaisieClub[K]) => setS((p) => ({ ...p, [k]: v }));
  const probleme = problemeClub(s);

  if (bloque) {
    return (
      <div className="terrain terrain-equipes h-full overflow-y-auto px-4 pt-6 pb-(--reserve-dock)">
        <h1 className="titre-ecran mb-4">Créer un club</h1>
        <Plaque className="p-6 text-center">
          <p className="text-sm text-(--color-encre-sec)">{bloque}</p>
          <p className="mt-1 text-xs text-(--color-encre-faible)">Un joueur appartient à un seul club à la fois.</p>
          <button type="button" onClick={onVoirMonClub} className="btn btn-vert mt-4 w-full">Voir mon club</button>
        </Plaque>
      </div>
    );
  }

  return (
    <div className="terrain terrain-equipes h-full overflow-y-auto px-4 pt-6 pb-(--reserve-dock)">
      <h1 className="titre-ecran mb-4">Créer un club</h1>

      {/* L'APERÇU, en direct. */}
      <Plaque variante="heros" className="mb-3 flex items-center gap-4 p-4">
        <Blason e={{ id: 'apercu', nom: s.nom || '?', couleur: s.couleur, embleme: s.embleme }} taille={64} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-[family-name:var(--font-titre)] text-2xl leading-tight tracking-wide uppercase">
            {s.nom.trim() || 'Ton club'}
          </p>
          <p className="mt-0.5 text-xs text-(--color-encre-sec)">1 membre · {NIVEAUX[s.niveau]}</p>
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <label className="block">
          <span className="mb-1 block text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">Nom</span>
          <input
            value={s.nom}
            maxLength={NOM_CLUB_MAX}
            onChange={(e) => maj('nom', e.target.value)}
            placeholder="Ex. Les Bleus du Dimanche"
            autoComplete="off"
            className="champ  px-3.5 py-3 text-base"
          />
        </label>
        <p className="mt-1 text-right text-[11px] text-(--color-encre-faible)">{s.nom.length}/{NOM_CLUB_MAX}</p>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">Couleur</p>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Couleur du club">
          {COULEURS_EQUIPE.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={s.couleur === c}
              aria-label={`Couleur ${c}`}
              onClick={() => maj('couleur', c)}
              className={`size-11 rounded-full transition-transform duration-(--duration-doigt) active:scale-90 ${
                s.couleur === c ? 'ring-2 ring-(--color-encre) ring-offset-2 ring-offset-(--color-carte)' : ''
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">Emblème</p>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Emblème du club">
          {NOMS_EMBLEMES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={s.embleme === n}
              aria-label={`Emblème ${n}`}
              onClick={() => maj('embleme', n)}
              className={`grid aspect-square min-h-11 place-items-center rounded-(--radius-sm) border transition-colors duration-(--duration-doigt) ${
                s.embleme === n ? 'border-(--color-vert) bg-(--color-vert)/15' : 'border-white/10 bg-black/25'
              }`}
              style={{ color: s.embleme === n ? s.couleur : undefined }}
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
                <path d={EMBLEMES[n]} />
              </svg>
            </button>
          ))}
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <p className="mb-3 text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">Niveau</p>
        <div className="flex gap-1.5">
          {(Object.keys(NIVEAUX) as Niveau[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => maj('niveau', n)}
              aria-pressed={s.niveau === n}
              className="puce min-w-0 flex-1 px-2 text-sm"
            >
              {NIVEAUX[n]}
            </button>
          ))}
        </div>
      </Plaque>

      <Plaque className="mb-3 p-4">
        <label className="block">
          <span className="mb-1 block text-xs tracking-[0.14em] text-(--color-encre-faible) uppercase">Ton appel</span>
          <span className="mb-2 block text-xs text-(--color-encre-sec)">Facultatif — affiché à ceux qui cherchent un club.</span>
          <textarea
            value={s.appel}
            maxLength={APPEL_MAX}
            onChange={(e) => maj('appel', e.target.value)}
            rows={2}
            placeholder="« On cherche un gardien pour le dimanche matin »"
            className="champ resize-none  px-3.5 py-3 text-base"
          />
        </label>
        <p className="mt-1 text-right text-[11px] text-(--color-encre-faible)">{s.appel.length}/{APPEL_MAX}</p>
      </Plaque>

      {probleme && s.nom.length > 0 && (
        <p className="mb-2 text-center text-sm text-(--color-feu)">{probleme}</p>
      )}
      <button
        type="button"
        disabled={occupe || !!probleme}
        onClick={() => onCreer(s)}
        className="btn btn-vert w-full"
      >
        {occupe ? 'Création…' : 'Créer mon club'}
      </button>
    </div>
  );
}
