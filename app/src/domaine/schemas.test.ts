import { describe, it, expect } from 'vitest';
import { CreerMatchSchema, lireMatch, UtilisateurSchema } from './schemas';

describe('UtilisateurSchema', () => {
  // Un document écrit par une version plus ancienne de l'app peut manquer de
  // presque tout. Il doit se lire quand même : faire tomber l'écran Profil
  // d'un joueur inscrit il y a six mois serait pire que des valeurs par
  // défaut.
  it('lit un document minimal sans rien casser', () => {
    const r = UtilisateurSchema.safeParse({ uid: 'u1' });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.pseudo).toBe('Joueur');
    expect(r.data.xp).toBe(0);
    expect(r.data.posteFavori).toBe('milieu');
    expect(r.data.atouts).toEqual({});
    expect(r.data.stats).toEqual({});
  });

  it('accepte un codePostal null — c’est ce que l’inscription écrit quand il est vide', () => {
    const r = UtilisateurSchema.safeParse({ uid: 'u1', codePostal: null });
    expect(r.success && r.data.codePostal).toBe('');
  });

  it('ne se laisse pas empoisonner par un xp non numérique', () => {
    const r = UtilisateurSchema.safeParse({ uid: 'u1', xp: 'beaucoup' });
    expect(r.success && r.data.xp).toBe(0);
  });

  it('garde les valeurs réelles quand elles sont là', () => {
    const r = UtilisateurSchema.safeParse({
      uid: 'u1', pseudo: 'Sam', xp: 1240, posteFavori: 'attaquant',
      atouts: { vitesse: 80 }, stats: { matchsJoues: 12 },
    });
    expect(r.success && r.data.atouts.vitesse).toBe(80);
    expect(r.success && r.data.stats.matchsJoues).toBe(12);
  });
});

describe('lireMatch', () => {
  it('rend null sur un document inexploitable plutôt que de jeter', () => {
    expect(lireMatch('m1', null)).toBeNull();
    expect(lireMatch('m1', 'pas un objet')).toBeNull();
  });

  it('retombe sur sondage quand le statut est inconnu', () => {
    const m = lireMatch('m1', { statut: 'zarbi' });
    expect(m?.statut).toBe('sondage');
  });
});

describe('CreerMatchSchema', () => {
  const base = {
    sport: 'foot5',
    joueursMax: 10,
    creneauxProposes: [{ date: new Date(), lieu: 'Le Five' }],
  };

  it('accepte une création valide', () => {
    expect(CreerMatchSchema.safeParse(base).success).toBe(true);
  });

  // La borne reflète EXACTEMENT la règle Firestore
  // (creneauxProposes.size() <= 10). La refuser ici donne un message clair
  // au lieu d'un rejet serveur opaque.
  it('refuse plus de dix créneaux, comme la règle serveur', () => {
    const onze = Array.from({ length: 11 }, () => ({ date: new Date(), lieu: 'X' }));
    expect(CreerMatchSchema.safeParse({ ...base, creneauxProposes: onze }).success).toBe(false);
  });

  it('exige au moins un créneau et un lieu', () => {
    expect(CreerMatchSchema.safeParse({ ...base, creneauxProposes: [] }).success).toBe(false);
    expect(
      CreerMatchSchema.safeParse({ ...base, creneauxProposes: [{ date: new Date(), lieu: '' }] })
        .success,
    ).toBe(false);
  });
});
