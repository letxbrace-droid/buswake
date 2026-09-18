import sombre from '../../../marque/kolektif-sombre.png';
import symbole from '../../../marque/kolektif-symbole.png';

/** LE LOGO KOLEKTIF.
 *
 *  Le symbole se lit deux fois : un joueur qui arme sa reprise, et un K.
 *  C'est cette double lecture qui le rend mémorable — mesuré au test du
 *  flou, où la silhouette tient encore à 3 px quand le mot, lui, disparaît.
 *
 *  D'où la règle d'emploi : LE MOT PORTE LA LECTURE, LE SYMBOLE PORTE LA
 *  MÉMOIRE. En dessous de 80 px de large, le mot devient illisible — on
 *  passe alors au symbole seul plutôt que de réduire l'ensemble.
 *
 *  Les fichiers vivent dans marque/ à la racine, partagés avec la v1.
 */
export function Logo({
  largeur = 180,
  className = '',
}: {
  /** Largeur en px. Sous 80, préférer <Symbole/>. */
  largeur?: number;
  className?: string;
}) {
  return (
    <img
      src={sombre}
      alt="KOLEKTIF"
      width={largeur}
      className={className}
      style={{ height: 'auto' }}
    />
  );
}

/** Le symbole seul — icône, avatar, filigrane, et partout où le mot ne
 *  tiendrait pas. */
export function Symbole({
  taille = 40,
  className = '',
  alt = '',
}: {
  taille?: number;
  className?: string;
  /** Vide par défaut : dans la plupart des cas le symbole accompagne un
   *  texte qui dit déjà la même chose, et le répéter alourdit la lecture
   *  d'un lecteur d'écran. */
  alt?: string;
}) {
  return (
    <img
      src={symbole}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={taille}
      className={className}
      style={{ height: 'auto' }}
    />
  );
}
