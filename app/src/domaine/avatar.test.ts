import { describe, it, expect } from 'vitest';
import { couleurAvatar, initiales, rangerAvatars, TEINTES } from './avatar';

/** Luminance relative WCAG — la même formule que la sonde de contraste. */
function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
}
const contraste = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe('couleurAvatar', () => {
  // Une couleur tirée au sort ferait clignoter les visages de la liste à
  // chaque rendu. La même personne doit avoir la même pastille, toujours.
  it('rend toujours la même couleur pour le même joueur', () => {
    expect(couleurAvatar('u1')).toBe(couleurAvatar('u1'));
    expect(couleurAvatar('zizou')).toBe(couleurAvatar('zizou'));
  });

  it('répartit les joueurs sur la palette plutôt que de tout mettre au même endroit', () => {
    const vues = new Set(Array.from({ length: 40 }, (_, i) => couleurAvatar('u' + i)));
    expect(vues.size).toBeGreaterThan(4);
  });

  it('ne tombe pas sur une clé vide', () => {
    expect(TEINTES).toContain(couleurAvatar(''));
  });

  // Les initiales sont posées en BLANC : chaque teinte doit donc passer le
  // seuil WCAG AA sous du blanc, sinon un pseudo devient illisible sur
  // certaines pastilles seulement — le genre de défaut qu'on ne voit que
  // chez quelqu'un d'autre.
  it.each(TEINTES)('%s tient le contraste AA sous du blanc', (teinte) => {
    expect(contraste(luminance(teinte), 1)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('initiales', () => {
  it('prend les deux premières lettres d’un prénom seul', () => {
    // Une seule lettre confondrait Sam et Sasha dans la même liste.
    expect(initiales('Sam')).toBe('SA');
    expect(initiales('Sasha')).toBe('SA');
    expect(initiales('Zizou')).toBe('ZI');
  });

  it('prend une initiale par mot quand il y en a deux', () => {
    expect(initiales('Jean Dupont')).toBe('JD');
    expect(initiales('Marie-Claire Blanc')).toBe('MC');
  });

  it('ne rend jamais rien', () => {
    expect(initiales('')).toBe('?');
    expect(initiales('   ')).toBe('?');
    expect(initiales(undefined as unknown as string)).toBe('?');
  });
});

describe('rangerAvatars', () => {
  const j = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: 'u' + i, pseudo: 'J' + i }));

  it('montre les premiers et compte le reste', () => {
    const r = rangerAvatars(j(7), 10);
    expect(r.montres).toHaveLength(4);
    expect(r.reste).toBe(3);
  });

  it('ne compte pas de reste quand tout tient', () => {
    expect(rangerAvatars(j(3), 10).reste).toBe(0);
  });

  // Les places libres donnent envie d'être prises : c'est le ressort de
  // l'écran. Mais bornées, sinon un match à 40 rendrait une traînée.
  it('montre quelques places libres, sans traînée', () => {
    expect(rangerAvatars(j(7), 10).libres).toBe(3);
    expect(rangerAvatars(j(9), 10).libres).toBe(1);
    expect(rangerAvatars(j(10), 10).libres).toBe(0);
    expect(rangerAvatars(j(2), 40).libres).toBe(3);
  });

  it('encaisse un effectif incohérent sans rendre de négatif', () => {
    const r = rangerAvatars(j(12), 10);
    expect(r.libres).toBe(0);
    expect(r.reste).toBeGreaterThanOrEqual(0);
  });
});
