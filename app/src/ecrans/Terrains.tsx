import { useMemo } from 'react';
import { Plaque } from '../composants/Plaque';
import { YAller } from '../composants/YAller';
import { TERRAINS_VERIFIES, type TerrainVerifie } from '../domaine/terrains';
import { haversine, libelleDistance, type Position } from '../domaine/rayon';
import { libelleAdresse } from '../domaine/itineraire';

const TYPES: Record<TerrainVerifie['t'], string> = {
  indoor: 'Indoor',
  urbain: 'Urbain',
  'plein-air': 'Plein air',
};

export function Terrains({ domicile }: { domicile: Position | null }) {
  const listes = useMemo(() => {
    const avecDistance = TERRAINS_VERIFIES.map((t) => ({
      t,
      km: domicile ? haversine(domicile, { lat: t.lat, lon: t.lon }) : null,
    }));
    // Le plus proche d'abord. Sans domicile, on garde l'ordre de la source
    // plutôt que d'inventer un classement.
    return domicile
      ? [...avecDistance].sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
      : avecDistance;
  }, [domicile]);

  return (
    <div className="terrain terrain-matchs h-full overflow-y-auto px-4 pt-6 pb-28">
      <header className="mb-1">
        <h1 className="font-[family-name:var(--font-titre)] text-3xl tracking-wide uppercase">
          Terrains
        </h1>
      </header>
      <p className="mb-4 text-xs text-(--color-encre-faible)">
        {TERRAINS_VERIFIES.length} lieux vérifiés
        {!domicile && ' · renseigne ton code postal pour les classer par distance'}
      </p>

      <div className="flex flex-col gap-3">
        {listes.map(({ t, km }) => (
          <CarteTerrain key={t.n} t={t} km={km} />
        ))}
      </div>
    </div>
  );
}

function CarteTerrain({ t, km }: { t: TerrainVerifie; km: number | null }) {
  const adresse = libelleAdresse(t);

  return (
    <Plaque className="flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        {/* Le nom PASSE À LA LIGNE, il ne se tronque pas : « UrbanSoccer
            Paris Porte d… » ne dit pas lequel c'est, et il y en a plusieurs.
            Gagner une ligne ici coûte un trajet au joueur. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold">{t.n}</p>
          <span className="shrink-0 rounded-(--radius-pill) bg-black/35 px-2 py-0.5 text-[10px] tracking-wide text-(--color-encre-sec) uppercase">
            {TYPES[t.t]}
          </span>
        </div>

        {/* L'adresse COMPLÈTE, et pas tronquée : c'est elle que le joueur
            recopie, lit au téléphone, ou compare à ce qu'il voit dans la rue.
            La masquer pour gagner une ligne lui coûte le trajet. */}
        <p className="mt-1 text-sm text-(--color-encre-sec)">{adresse.texte}</p>

        <p className="mt-1.5 flex items-center gap-2 text-xs text-(--color-encre-faible)">
          {km != null && <span className="text-(--color-encre-sec)">{libelleDistance(km)}</span>}
          <a
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            source
          </a>
        </p>
      </div>

      <YAller lieu={t} compact />
    </Plaque>
  );
}
