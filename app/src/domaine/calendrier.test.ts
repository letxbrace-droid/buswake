import { describe, it, expect } from 'vitest';
import {
  ajouterCreneau, composer, CRENEAUX_MAX, grilleDuMois, HORIZON_JOURS,
  libelleCreneau, libelleMois, moisPrecedent, moisSuivant, peutAvancer,
  peutReculer, retirerCreneau,
} from './calendrier';

// Un vendredi, pour que le décalage de semaine ne passe pas par hasard.
const MAINTENANT = new Date(2026, 8, 25, 18, 0); // 25 septembre 2026

describe('grilleDuMois', () => {
  const g = grilleDuMois(new Date(2026, 8, 1), MAINTENANT);

  // Une grille dont la hauteur change d'un mois à l'autre fait sauter tout
  // ce qui est en dessous quand on navigue.
  it('rend toujours six semaines de sept jours', () => {
    expect(g).toHaveLength(6);
    for (const s of g) expect(s).toHaveLength(7);
  });

  // `getDay()` rend 0 pour dimanche : le décalage est LA faute classique de
  // tout calendrier écrit à la main.
  it('commence la semaine un lundi', () => {
    for (const s of g) expect(s[0].date.getDay()).toBe(1);
    expect(g.at(-1)![6].date.getDay()).toBe(0);
  });

  it('couvre le mois en entier, sans trou ni saut', () => {
    const jours = g.flat().map((j) => j.date.getTime());
    for (let i = 1; i < jours.length; i++) {
      expect(jours[i] - jours[i - 1]).toBe(86400_000);
    }
    const duMois = g.flat().filter((j) => j.duMois);
    expect(duMois).toHaveLength(30); // septembre
    expect(duMois[0].date.getDate()).toBe(1);
    expect(duMois.at(-1)!.date.getDate()).toBe(30);
  });

  it('marque le débordement des mois voisins', () => {
    expect(g[0][0].duMois).toBe(false);
    expect(g.flat().some((j) => !j.duMois)).toBe(true);
  });

  // Un mois à 31 jours commençant un dimanche est le pire cas : il déborde
  // des deux côtés.
  it('tient un mois de 31 jours qui commence un dimanche', () => {
    const mars = grilleDuMois(new Date(2026, 2, 1), new Date(2026, 2, 1));
    expect(mars.flat().filter((j) => j.duMois)).toHaveLength(31);
    expect(mars[0][0].date.getDay()).toBe(1);
  });

  it('interdit le passé et signale aujourd’hui', () => {
    const hier = g.flat().find((j) => j.date.getDate() === 24 && j.duMois)!;
    const ajd = g.flat().find((j) => j.aujourdhui)!;
    expect(hier.choisissable).toBe(false);
    expect(ajd.date.getDate()).toBe(25);
    expect(ajd.choisissable).toBe(true);
  });

  // Au-delà de trois mois, un match à cinq ne se cale plus : il se souhaite.
  //
  // L'invariant est « aucun jour au-delà de l'horizon n'est choisissable » —
  // et non « le mois de l'horizon n'a aucun jour choisissable », qui était
  // ma première formulation et qui est fausse : ce mois-là contient encore
  // des jours DANS la fenêtre.
  it('s’arrête à l’horizon', () => {
    const limite = MAINTENANT.getTime() + HORIZON_JOURS * 86400_000;
    for (const mois of [8, 9, 10, 11]) {
      for (const j of grilleDuMois(new Date(2026, mois, 1), MAINTENANT).flat()) {
        if (j.date.getTime() > limite) {
          expect(j.choisissable, `${j.date.toDateString()} est au-delà de l'horizon`).toBe(false);
        }
      }
    }
    // Et l'horizon n'est pas si court qu'il rendrait la grille inutile.
    const dansUnMois = grilleDuMois(new Date(2026, 9, 1), MAINTENANT).flat();
    expect(dansUnMois.some((j) => j.duMois && j.choisissable)).toBe(true);
  });
});

describe('navigation', () => {
  it('avance et recule d’un mois', () => {
    expect(moisSuivant(new Date(2026, 11, 1)).getMonth()).toBe(0);
    expect(moisSuivant(new Date(2026, 11, 1)).getFullYear()).toBe(2027);
    expect(moisPrecedent(new Date(2026, 0, 1)).getMonth()).toBe(11);
  });

  // Reculer avant le mois courant n'a rien à proposer : tous les jours y
  // sont grisés, et c'est une impasse déguisée en bouton.
  it('ne recule pas avant le mois courant', () => {
    expect(peutReculer(new Date(2026, 8, 1), MAINTENANT)).toBe(false);
    expect(peutReculer(new Date(2026, 9, 1), MAINTENANT)).toBe(true);
  });

  it('n’avance pas au-delà de l’horizon', () => {
    expect(peutAvancer(new Date(2026, 8, 1), MAINTENANT)).toBe(true);
    expect(peutAvancer(new Date(2027, 5, 1), MAINTENANT)).toBe(false);
  });

  it('nomme le mois en français', () => {
    expect(libelleMois(new Date(2026, 8, 1))).toBe('septembre 2026');
  });
});

describe('composer', () => {
  it('assemble un jour et une heure', () => {
    const d = composer(new Date(2026, 8, 25), '19:30')!;
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
    expect(d.getDate()).toBe(25);
  });

  // Un champ vide donnait NaN, et NaN partait tel quel dans le créneau.
  it('refuse une heure illisible plutôt que de rendre NaN', () => {
    for (const mauvais of ['', '  ', 'midi', '25:00', '12:99', '1930']) {
      expect(composer(new Date(2026, 8, 25), mauvais)).toBeNull();
    }
  });
});

describe('ajouterCreneau', () => {
  const futur = new Date(2026, 8, 26, 19, 0);

  it('ajoute et garde la liste triée', () => {
    let c: Date[] = [];
    c = (ajouterCreneau(c, new Date(2026, 8, 28, 19, 0), MAINTENANT) as { creneaux: Date[] }).creneaux;
    c = (ajouterCreneau(c, futur, MAINTENANT) as { creneaux: Date[] }).creneaux;
    expect(c.map((d) => d.getDate())).toEqual([26, 28]);
  });

  it('refuse un créneau déjà passé', () => {
    const r = ajouterCreneau([], new Date(2026, 8, 25, 9, 0), MAINTENANT);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.probleme).toContain('passé');
  });

  // Deux fois le même créneau couperait le vote en deux.
  it('refuse un doublon', () => {
    const r = ajouterCreneau([futur], new Date(futur), MAINTENANT);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.probleme).toContain('déjà proposé');
  });

  // La borne vient des règles Firestore : la dire ici évite un refus opaque
  // après l'envoi.
  it('refuse au-delà de dix', () => {
    const dix = Array.from({ length: CRENEAUX_MAX }, (_, i) => new Date(2026, 9, i + 1, 19, 0));
    const r = ajouterCreneau(dix, new Date(2026, 10, 1, 19, 0), MAINTENANT);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.probleme).toContain('10 créneaux');
  });

  it('refuse une date absente', () => {
    expect(ajouterCreneau([], null, MAINTENANT).ok).toBe(false);
  });
});

describe('retirerCreneau', () => {
  it('retire par instant, pas par référence', () => {
    const a = new Date(2026, 8, 26, 19, 0);
    const b = new Date(2026, 8, 27, 19, 0);
    expect(retirerCreneau([a, b], new Date(a)).map((d) => d.getDate())).toEqual([27]);
  });
});

describe('libelleCreneau', () => {
  it('se lit sans réfléchir', () => {
    expect(libelleCreneau(new Date(2026, 8, 25, 19, 0))).toBe('vendredi 25 sept. · 19h');
    expect(libelleCreneau(new Date(2026, 8, 25, 20, 30))).toBe('vendredi 25 sept. · 20h30');
  });
});
