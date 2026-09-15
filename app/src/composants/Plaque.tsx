import type { ElementType, ComponentPropsWithoutRef, ReactNode } from 'react';

type Variante = 'normale' | 'heros';

interface Props {
  variante?: Variante;
  /** Rend la plaque tactile : elle s'enfonce sous le doigt. */
  action?: boolean;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/** LA brique de l'interface. Tout ce qui flotte au-dessus de la photo du
 *  terrain est une plaque — carte de match, héros, état vide, panneau.
 *  Un seul composant, donc un seul endroit où la matière se décide. */
export function Plaque({
  variante = 'normale',
  action = false,
  as: Tag = 'div',
  className = '',
  children,
  ...reste
}: Props & Omit<ComponentPropsWithoutRef<'div'>, keyof Props>) {
  const classes = [
    'plaque',
    variante === 'heros' && 'plaque-heros',
    action && 'plaque-action',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...reste}>
      {children}
    </Tag>
  );
}
