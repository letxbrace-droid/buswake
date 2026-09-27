import { describe, it, expect } from 'vitest';
import { ATOUT_MAX, ATOUT_MIN, bornerAtout, differences, validerEdition, type Edition } from './editionProfil';

const base: Edition = {
  pseudo: 'Zizou',
  poste: 'milieu',
  atouts: { vitesse: 70, dribble: 70, frappe: 70, defense: 70, physique: 70 },
  codePostal: '91130',
};

describe('validerEdition', () => {
  it('accepte un profil correct', () => {
    expect(validerEdition(base, 'z@x.fr')).toBeNull();
  });

  it('refuse un pseudo vide ou fait d’espaces', () => {
    expect(validerEdition({ ...base, pseudo: '   ' }, null)?.champ).toBe('pseudo');
  });

  // Borne des règles Firestore : la dire ici évite un refus opaque.
  it('refuse un pseudo trop long', () => {
    expect(validerEdition({ ...base, pseudo: 'x'.repeat(25) }, null)?.champ).toBe('pseudo');
    expect(validerEdition({ ...base, pseudo: 'x'.repeat(24) }, null)).toBeNull();
  });

  // Les règles le refusent : un pseudo égal à l'e-mail l'afficherait dans
  // le classement de tout le monde.
  it('refuse un pseudo égal à l’e-mail, casse comprise', () => {
    expect(validerEdition({ ...base, pseudo: 'Z@X.fr' }, 'z@x.fr')?.message).toContain('public');
  });

  it('refuse un poste inconnu', () => {
    expect(validerEdition({ ...base, poste: 'libero' }, null)?.champ).toBe('poste');
  });

  it('accepte un code postal vide, refuse un code faux', () => {
    expect(validerEdition({ ...base, codePostal: '' }, null)).toBeNull();
    expect(validerEdition({ ...base, codePostal: '9113' }, null)?.champ).toBe('codePostal');
  });
});

describe('bornerAtout', () => {
  it('borne et arrondit', () => {
    expect(bornerAtout(120)).toBe(ATOUT_MAX);
    expect(bornerAtout(3)).toBe(ATOUT_MIN);
    expect(bornerAtout(71.6)).toBe(72);
    expect(bornerAtout(Number.NaN)).toBe(ATOUT_MIN);
  });
});

describe('differences', () => {
  // Le profil est écouté en temps réel : une écriture sans différence
  // relance quand même le rendu de tous les écrans qui le lisent.
  it('n’écrit rien quand rien n’a changé', () => {
    expect(differences(base, base)).toEqual({});
    expect(differences(base, { ...base, pseudo: ' Zizou ' })).toEqual({});
  });

  it('n’écrit que ce qui a changé, sous le nom du champ en base', () => {
    expect(differences(base, { ...base, poste: 'gardien' })).toEqual({ posteFavori: 'gardien' });
  });

  it('écrit les atouts bornés', () => {
    const d = differences(base, { ...base, atouts: { ...base.atouts, vitesse: 150 } });
    expect((d.atouts as Record<string, number>).vitesse).toBe(ATOUT_MAX);
  });

  // L'ancienne position ne correspond plus au nouveau code : on l'efface,
  // et le rattrapage la recalcule. Sans ça, le rayon resterait mesuré
  // depuis l'ancien domicile — exactement le défaut qu'on corrige.
  it('efface la position quand le code postal change', () => {
    expect(differences(base, { ...base, codePostal: '75017' })).toEqual({
      codePostal: '75017', domicileLat: null, domicileLon: null,
    });
  });

  it('garde la position quand le code postal ne change pas', () => {
    expect(differences(base, { ...base, codePostal: ' 91130 ' })).toEqual({});
  });
});
