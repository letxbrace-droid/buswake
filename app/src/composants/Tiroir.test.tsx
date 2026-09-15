import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tiroir } from './Tiroir';

/** Un tiroir, c'est du comportement avant d'être une apparence. Ces trois
 *  règles s'oublient silencieusement et ne se voient sur aucune capture. */
function monter(onFermer = vi.fn()) {
  render(
    <Tiroir ouvert onFermer={onFermer} titre="Réglages">
      <button>Premier</button>
      <button>Dernier</button>
    </Tiroir>,
  );
  return onFermer;
}

describe('Tiroir', () => {
  it('se ferme avec Échap', () => {
    const onFermer = monter();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onFermer).toHaveBeenCalled();
  });

  it('empêche le fond de défiler derrière lui', () => {
    monter();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('rend le défilement au fond quand il se ferme', () => {
    const { unmount } = render(
      <Tiroir ouvert onFermer={() => {}} titre="Réglages">
        <button>Un</button>
      </Tiroir>,
    );
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('se déclare comme dialogue modal — sinon un lecteur d’écran continue de lire le fond', () => {
    monter();
    const d = screen.getByRole('dialog');
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(d).toHaveAttribute('aria-label', 'Réglages');
  });

  it('boucle le focus : depuis le dernier, Tab revient au premier', () => {
    monter();
    const cibles = screen.getAllByRole('button');
    const dernier = cibles[cibles.length - 1];
    dernier.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(cibles[0]);
  });

  it('boucle en arrière : depuis le premier, Maj+Tab va au dernier', () => {
    monter();
    const cibles = screen.getAllByRole('button');
    cibles[0].focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cibles[cibles.length - 1]);
  });

  it('ne rend rien quand il est fermé', () => {
    render(
      <Tiroir ouvert={false} onFermer={() => {}} titre="Réglages">
        <button>Invisible</button>
      </Tiroir>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
