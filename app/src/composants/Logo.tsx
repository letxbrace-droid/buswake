/** LE LOGO KOLEKTIF.
 *
 *  Trois décisions, et chacune a été prise contre une version plus tape-à-l'œil :
 *
 *  1. LES LETTRES SONT SOUDÉES. Un interlettrage négatif jusqu'à ce que les
 *     fûts se touchent : le mot cesse d'être huit lettres alignées pour
 *     devenir un bloc qu'on lit d'un coup. C'est ce qui le rend urbain — une
 *     enseigne, une banderole, un tag — plutôt qu'un simple mot en gras.
 *
 *  2. L'ACCENT PASSE PAR LA COULEUR, PAS PAR UN AJOUT. La première version
 *     logeait un ballon rond dans le creux du O. Mesuré à l'œil : le mot
 *     lisait « KØLEKTIF » — le point traversait la lettre et la changeait en
 *     Ø. Un O vert dit la même chose (le ballon, l'accent, le point de mire)
 *     sans abîmer la lettre, et survit à 16 px.
 *
 *  3. PAS DE TRAIT, PAS DE COUPE, PAS DE BARRE. Les versions barrées
 *     lisaient « mot rayé », donc « annulé ». Une marque ne peut pas se
 *     permettre cette lecture-là.
 */
export function Logo({
  taille = 24, accent = true, className = '',
}: {
  /** Hauteur de corps en px. */
  taille?: number;
  /** Le O en vert. Le désactiver donne la version monochrome, pour les
   *  fonds colorés où le vert ne contrasterait plus. */
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-block font-[family-name:var(--font-titre)] ${className}`}
      style={{ fontSize: taille, letterSpacing: '-0.075em', lineHeight: 0.85 }}
      aria-label="KOLEKTIF"
      role="img"
    >
      <span aria-hidden>
        K<span style={accent ? { color: 'var(--color-vert)' } : undefined}>O</span>LEKTIF
      </span>
    </span>
  );
}
