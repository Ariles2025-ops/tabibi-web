#!/usr/bin/env node
// Un seul outil de test dans le depot : Playwright. Ce controle echoue s'il reste une spec Karma sous src/
// ou une dependance karma / jasmine dans package.json.
// Lancement : node outils/verifier-tests.mjs (npm run verif:tests). Sortie 1 si quelque chose subsiste.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;
const SOURCES = join(RACINE, 'src');

/** Paquets interdits : tout ce qui commence par l'un de ces prefixes. */
const PREFIXES_INTERDITS = ['karma', 'jasmine', '@types/jasmine'];

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

const specs = fichiers(SOURCES)
  .filter((chemin) => chemin.endsWith('.spec.ts'))
  .map((chemin) => relative(RACINE, chemin));

const manifeste = JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf-8'));
const dependances = { ...manifeste.dependencies, ...manifeste.devDependencies };
const interdites = Object.keys(dependances).filter((nom) => PREFIXES_INTERDITS.some((prefixe) => nom.startsWith(prefixe)));

const problemes = [];
if (specs.length > 0) {
  problemes.push(`Specs restees sous src/ (${specs.length}) : ${specs.join(', ')}`);
  problemes.push('Les tests vivent dans tests/logique (node) et tests/navigateur, tests/parcours (Chromium).');
}
if (interdites.length > 0) {
  problemes.push(`Dependances de test interdites dans package.json : ${interdites.join(', ')}`);
  problemes.push('Playwright est le seul outil de test du depot.');
}

if (problemes.length > 0) {
  console.error('Outillage de test : un seul outil est attendu (Playwright).');
  for (const probleme of problemes) console.error(`  ${probleme}`);
  process.exit(1);
}

console.log('Outillage de test : Playwright seul, aucune spec Karma sous src/.');
