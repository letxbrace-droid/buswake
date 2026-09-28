import { NavLink, useLocation } from 'react-router-dom';
import { Icone } from './Icone';
import { ONGLETS, ongletActif } from '../domaine/navigation';

/** LE DOCK. Détaché des bords et flottant au-dessus de la photo du terrain :
 *  la barre pleine largeur coupait chaque écran en deux, la photo s'arrêtait
 *  net sur un bandeau noir. Ici le terrain passe dessous, jusqu'au bord.
 *
 *  L'onglet actif se lit de TROIS façons — une pastille verte qui glisse
 *  jusqu'à lui, l'icône qui se remplit, le libellé qui passe au vert. Une
 *  seule de ces marques, en plein soleil, ne suffisait pas. */
export function Dock() {
  const { pathname } = useLocation();
  const actif = ongletActif(pathname);

  return (
    <nav aria-label="Navigation principale" className="dock">
      <div className="dock-corps verre">
        {/* Une seule pastille, déplacée — pas cinq qui s'allument et
            s'éteignent : le regard suit le mouvement jusqu'à la destination.
            Masquée hors des onglets (fiche d'un match, réglages…). */}
        <span
          aria-hidden
          className="dock-pastille"
          data-visible={actif >= 0}
          style={{ transform: `translateX(${Math.max(0, actif) * 100}%)` }}
        />
        {ONGLETS.map((o) => (
          <NavLink key={o.to} to={o.to} end={o.exact} className="dock-onglet">
            {({ isActive }) => (
              <>
                <Icone nom={o.nom} taille={22} pleine={isActive} />
                <span className="max-w-full truncate">{o.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
