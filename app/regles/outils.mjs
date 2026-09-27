// Banc commun aux tests de règles : un environnement par fichier, des
// documents posés en contournant les règles, et deux verbes — `passe` et
// `refuse` — pour que chaque test dise dans quel sens il éprouve la règle.
import { readFileSync } from 'node:fs';
import { setLogLevel } from 'firebase/firestore';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// Chaque refus attendu est journalisé par le SDK comme une erreur : du bruit
// qui noierait le seul refus INATTENDU.
setLogLevel('silent');

const REGLES = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

export async function environnement(projectId) {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  return initializeTestEnvironment({
    projectId,
    firestore: { rules: REGLES, host, port: Number(port) },
  });
}

/** Pose un document tel quel — le serveur (Admin SDK) écrit ainsi. */
export async function poser(env, chemin, donnees) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(chemin).set(donnees);
  });
}

export const passe = assertSucceeds;
export const refuse = assertFails;
