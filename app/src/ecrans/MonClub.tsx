import { useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { Blason } from '../composants/Blason';
import { Avatar } from '../composants/Avatar';
import { Segment } from '../composants/Segment';
import { Icone } from '../composants/Icone';
import { useEntree } from '../services/useEntree';
import { NIVEAUX, type Equipe } from '../domaine/equipe';
import type { BilanClub, Membre } from '../domaine/club';

type Onglet = 'equipe' | 'stats' | 'classement';

export interface ActionsClub {
  onInviter(): void;
  onVoirEquipes(): void;
  onCreer(): void;
}

export function MonClub({
  club, membres, bilan, classement, monUid, actions,
}: {
  club: Equipe | null;
  membres: readonly Membre[];
  bilan: BilanClub | null;
  classement: readonly Equipe[];
  monUid: string | null;
  actions: ActionsClub;
}) {
  const [onglet, setOnglet] = useState<Onglet>('equipe');
  const entree = useEntree(onglet);

  if (!club || !bilan) {
    return (
      <div className="terrain terrain-equipes h-full overflow-y-auto px-4 pt-6 pb-28">
        <h1 className="mb-4 font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
          Mon club
        </h1>
        <Plaque className="p-8 text-center">
          <p className="font-[family-name:var(--font-titre)] text-xl">Tu n’as pas encore de club</p>
          <p className="mt-2 text-sm text-(--color-encre-sec)">
            Crée le tien, ou rejoins-en un : un nom, une couleur, un emblème.
          </p>
          <button
            type="button"
            onClick={actions.onCreer}
            className="mt-4 w-full rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond)"
          >
            Créer une équipe
          </button>
          <button
            type="button"
            onClick={actions.onVoirEquipes}
            className="mt-2 w-full rounded-(--radius-pill) bg-white/10 py-3 text-sm font-medium"
          >
            Voir les équipes
          </button>
        </Plaque>
      </div>
    );
  }

  return (
    <div className="terrain terrain-equipes h-full overflow-y-auto px-4 pt-6 pb-28">
      <Plaque className="mb-4 p-4">
        <div className="flex items-center gap-3.5">
          <Blason e={club} taille={54} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-[family-name:var(--font-titre)] text-2xl tracking-wide uppercase">
              {club.nom}
            </h1>
            <p className="mt-0.5 text-xs text-(--color-encre-sec)">
              {membres.length} membre{membres.length > 1 ? 's' : ''}
              {club.niveau ? ` · ${NIVEAUX[club.niveau]}` : ''}
            </p>
          </div>
          {/* La place n'apparaît QUE si le club a joué : « 3ᵉ » sur zéro
              match est un rang qui ne veut rien dire. */}
          {bilan.place != null && bilan.joues > 0 && (
            <span className="shrink-0 rounded-(--radius-pill) bg-(--color-vert)/15 px-2.5 py-1 text-xs font-bold text-(--color-vert)">
              {bilan.place}ᵉ
            </span>
          )}
        </div>

        {club.appel && (
          <p className="mt-3 rounded-(--radius-sm) bg-black/25 px-3 py-2 text-sm text-(--color-encre-sec)">
            « {club.appel} »
          </p>
        )}
      </Plaque>

      {/* TROIS ONGLETS, PAS QUATRE. La maquette en a un quatrième, « Matchs ».
          Aucun champ ne relie un match à une équipe : `matchs` porte des
          joueurs inscrits, pas d'identifiant d'équipe. Y afficher les matchs
          des coéquipiers serait une approximation présentée comme un fait —
          et le jour où deux membres jouent séparément, l'écran ment. */}
      <div className="mb-4">
        <Segment
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { cle: 'equipe', label: 'Équipe', compte: membres.length },
            { cle: 'stats', label: 'Stats' },
            { cle: 'classement', label: 'Classement' },
          ]}
        />
      </div>

      {onglet === 'equipe' && (
        <div className={`flex flex-col gap-2 ${entree}`}>
          {membres.map((m) => (
            <Plaque key={m.uid} className="mc flex items-center gap-3 p-3">
              <Avatar uid={m.uid} pseudo={m.pseudo} taille={38} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {m.uid === monUid ? 'Toi' : m.pseudo}
                  {m.capitaine && (
                    <span className="shrink-0 rounded-(--radius-pill) bg-(--color-or)/20 px-1.5 py-0.5 text-[10px] font-bold text-(--color-or)">
                      Capitaine
                    </span>
                  )}
                </p>
                {m.poste && (
                  <p className="truncate text-xs text-(--color-encre-sec) first-letter:uppercase">
                    {m.poste}
                  </p>
                )}
              </div>
              {/* Pas encore noté ≠ noté zéro. On le dit, on ne l'invente pas. */}
              {m.note != null ? (
                <span className="shrink-0 text-lg font-bold tabular-nums text-(--color-vert)">
                  {m.note.toFixed(1)}
                </span>
              ) : (
                <span className="shrink-0 text-[11px] text-(--color-encre-faible)">
                  pas encore noté
                </span>
              )}
            </Plaque>
          ))}

          {bilan.manque > 0 && (
            <p className="mt-1 text-center text-xs text-(--color-feu)">
              Il manque {bilan.manque} joueur{bilan.manque > 1 ? 's' : ''} pour être au complet
            </p>
          )}

          {/* Les règles n'autorisent qu'à s'ajouter SOI-MÊME à une équipe :
              on ne peut donc pas inscrire quelqu'un d'autre. On partage un
              lien, et la personne entre elle-même. */}
          <button
            type="button"
            onClick={actions.onInviter}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-(--radius-pill) bg-(--color-vert) py-3 font-semibold text-(--color-fond)"
          >
            <Icone nom="partage" taille={17} />
            Inviter un joueur
          </button>
        </div>
      )}

      {onglet === 'stats' && (
        <div className={`grid grid-cols-2 gap-2.5 ${entree}`}>
          {[
            { label: 'Matchs joués', valeur: String(bilan.joues) },
            {
              label: 'Victoires',
              valeur: bilan.pourcentVictoires != null ? `${bilan.v} · ${bilan.pourcentVictoires}%` : String(bilan.v),
            },
            { label: 'Nuls · Défaites', valeur: `${bilan.n} · ${bilan.d}` },
            { label: 'Points', valeur: String(bilan.points) },
            { label: 'Buts marqués', valeur: String(bilan.butsPour) },
            { label: 'Buts encaissés', valeur: String(bilan.butsContre) },
          ].map((s) => (
            <Plaque key={s.label} className="mc p-4">
              <p className="text-xs text-(--color-encre-faible) uppercase">{s.label}</p>
              <p className="mt-1 font-[family-name:var(--font-titre)] text-2xl">{s.valeur}</p>
            </Plaque>
          ))}

          {bilan.joues === 0 && (
            <p className="col-span-2 mt-1 text-center text-xs text-(--color-encre-faible)">
              Ces chiffres se remplissent dès le premier match terminé.
            </p>
          )}

          {bilan.serie > 0 && (
            <Plaque className="col-span-2 p-4">
              <p className="text-xs text-(--color-encre-faible) uppercase">Série en cours</p>
              <p className="mt-1 font-[family-name:var(--font-titre)] text-2xl text-(--color-vert)">
                {bilan.serie} victoire{bilan.serie > 1 ? 's' : ''} d’affilée
              </p>
            </Plaque>
          )}
        </div>
      )}

      {onglet === 'classement' && (
        <div className={`flex flex-col gap-2 ${entree}`}>
          {classement.map((e, i) => {
            const b = e.stats ?? {};
            const pts = (b.victoires ?? 0) * 3 + (b.nuls ?? 0);
            const moi = e.id === club.id;
            return (
              <Plaque
                key={e.id}
                className={`mc flex items-center gap-3 p-3 ${moi ? 'ring-1 ring-(--color-vert)/50' : ''}`}
              >
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-(--color-encre-faible)">
                  {i + 1}
                </span>
                <Blason e={e} taille={32} />
                <p className={`min-w-0 flex-1 truncate text-sm ${moi ? 'font-bold' : ''}`}>{e.nom}</p>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-(--color-encre-sec)">
                  {pts} pts
                </span>
              </Plaque>
            );
          })}
        </div>
      )}
    </div>
  );
}
