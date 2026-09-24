import { couleurAvatar, initiales, rangerAvatars, type Place } from '../domaine/avatar';

/** Une pastille d'initiales. La maquette montre des photos ; il n'existe ni
 *  champ ni stockage pour ça, et en inventer serait pire que de s'en passer. */
export function Avatar({
  uid, pseudo, taille = 32, className = '',
}: {
  uid: string;
  pseudo: string;
  taille?: number;
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: taille,
        height: taille,
        background: couleurAvatar(uid),
        fontSize: Math.round(taille * 0.38),
      }}
      title={pseudo}
    >
      {initiales(pseudo)}
    </span>
  );
}

/**
 * La rangée de joueurs d'un match, avec les places encore libres.
 *
 * Les pastilles se chevauchent : c'est ce qui les lit comme un groupe et non
 * comme une liste. Les places libres sont des cercles pointillés — elles
 * donnent envie d'être prises, et c'est le ressort de l'écran.
 */
export function RangeeJoueurs({
  joueurs, total, taille = 30, maxVisibles = 4,
}: {
  joueurs: readonly Place[];
  total: number;
  taille?: number;
  maxVisibles?: number;
}) {
  const r = rangerAvatars(joueurs, total, maxVisibles);
  return (
    <div
      className="flex items-center [&>*:not(:first-child)]:ml-[-0.28em]"
      style={{ fontSize: taille }}
      aria-label={`${joueurs.length} joueurs sur ${total}`}
    >
      {r.montres.map((j) => (
        <Avatar
          key={j.uid}
          uid={j.uid}
          pseudo={j.pseudo}
          taille={taille}
          className="ring-2 ring-(--color-fond)"
        />
      ))}
      {r.reste > 0 && (
        <span
          className="grid shrink-0 place-items-center rounded-full bg-white/15 font-semibold text-(--color-encre) ring-2 ring-(--color-fond)"
          style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.34) }}
        >
          +{r.reste}
        </span>
      )}
      {Array.from({ length: r.libres }, (_, i) => (
        <span
          key={`libre${i}`}
          aria-hidden
          className="grid shrink-0 place-items-center rounded-full border border-dashed border-white/25 text-(--color-encre-faible)"
          style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.4) }}
        >
          +
        </span>
      ))}
    </div>
  );
}
