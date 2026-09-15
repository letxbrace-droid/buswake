import { describe, it, expect } from 'vitest';
import { etatEquipe, type Equipe } from '../domaine/equipe';

/** L'ordre d'affichage EST une règle métier : il décide de ce qu'un joueur
 *  voit en premier quand il cherche où s'insérer. */
function ordre(equipes: Equipe[]): string[] {
  return [...equipes]
    .sort((a, b) => {
      const ma = etatEquipe(a).manque;
      const mb = etatEquipe(b).manque;
      if ((ma === 0) !== (mb === 0)) return ma === 0 ? 1 : -1;
      return ma - mb;
    })
    .map((e) => e.nom);
}

const eq = (nom: string, membres: number): Equipe => ({
  id: nom, nom, sport: 'foot5', membres: Array(membres).fill('x'),
});

describe('ordre des équipes', () => {
  it('celle à qui il manque le moins passe devant — elle joue ce soir', () => {
    expect(ordre([eq('trois', 2), eq('une', 4), eq('deux', 3)])).toEqual(['une', 'deux', 'trois']);
  });

  it('les équipes prêtes passent en dernier, elles ne cherchent personne', () => {
    expect(ordre([eq('prete', 5), eq('quatre', 1)])).toEqual(['quatre', 'prete']);
  });

  it('une équipe qui déborde compte comme prête', () => {
    expect(ordre([eq('deborde', 8), eq('une', 4)])).toEqual(['une', 'deborde']);
  });
});
