import { describe, it, expect } from 'vitest';
import { ConnexionSchema, InscriptionSchema, messageErreur, profilInitial } from './auth';

const bon = {
  pseudo: 'Sam', email: 'sam@exemple.fr', motDePasse: 'motdepasse', codePostal: '91300',
};

describe('InscriptionSchema', () => {
  it('accepte une inscription valide', () => {
    expect(InscriptionSchema.safeParse(bon).success).toBe(true);
  });

  it('accepte un code postal vide — il est facultatif', () => {
    expect(InscriptionSchema.safeParse({ ...bon, codePostal: '' }).success).toBe(true);
  });

  it('refuse un code postal qui n’est pas cinq chiffres', () => {
    expect(InscriptionSchema.safeParse({ ...bon, codePostal: '913' }).success).toBe(false);
  });

  // Le pseudo s'affiche sur chaque carte de match : s'il vaut le mot de
  // passe, le mot de passe est public.
  it('refuse un pseudo identique au mot de passe, casse ignorée', () => {
    const r = InscriptionSchema.safeParse({ ...bon, pseudo: 'Motdepasse', motDePasse: 'motdepasse' });
    expect(r.success).toBe(false);
  });

  it('accepte les accents et les apostrophes — les prénoms en ont', () => {
    expect(InscriptionSchema.safeParse({ ...bon, pseudo: 'Naïm O’Brien' }).success).toBe(true);
  });

  it('refuse ce qui ressemble à du code ou casse une mise en page', () => {
    for (const p of ['<script>', 'a{b}', 'x;y', '💣💣💣']) {
      expect(InscriptionSchema.safeParse({ ...bon, pseudo: p }).success, p).toBe(false);
    }
  });

  it('refuse un mot de passe trop court', () => {
    expect(InscriptionSchema.safeParse({ ...bon, motDePasse: '12345' }).success).toBe(false);
  });
});

describe('ConnexionSchema', () => {
  it('n’impose pas de longueur au mot de passe — un compte ancien peut en avoir un court', () => {
    expect(ConnexionSchema.safeParse({ email: 'a@b.fr', motDePasse: 'x' }).success).toBe(true);
  });
});

describe('messageErreur', () => {
  it('traduit les codes connus', () => {
    expect(messageErreur({ code: 'auth/invalid-credential' })).toMatch(/incorrect/);
    expect(messageErreur({ code: 'auth/email-already-in-use' })).toMatch(/connecte-toi/);
  });

  it('ne montre JAMAIS un code brut — il inquiète sans informer', () => {
    const m = messageErreur({ code: 'auth/quelque-chose-de-nouveau' });
    expect(m).not.toMatch(/auth\//);
    expect(m).toMatch(/Réessaie/);
  });

  it('tient sur n’importe quoi', () => {
    expect(messageErreur(null)).toBeTruthy();
    expect(messageErreur('erreur')).toBeTruthy();
  });
});

describe('profilInitial', () => {
  it('part à zéro XP et sans badge — le client n’en écrira plus jamais', () => {
    const p = profilInitial('a@b.fr', 'Sam');
    expect(p.xp).toBe(0);
    expect(p.badges).toEqual([]);
  });

  it('marque le profil comme incomplet : la carte se remplit après', () => {
    expect(profilInitial('a@b.fr', 'Sam').profilComplet).toBe(false);
  });

  it('met null et pas une chaîne vide quand il n’y a pas de code postal', () => {
    expect(profilInitial('a@b.fr', 'Sam').codePostal).toBeNull();
  });
});
