#!/usr/bin/env node
// Controle des traductions : aucun libelle francais litteral ne doit rester dans un template de composant.
// Lancement : node outils/verifier-i18n.mjs (npm run verif:i18n). Sortie 1 si un texte est trouve.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;
const SOURCES = join(RACINE, 'src');

/** Fichiers exclus : les dictionnaires eux-memes (ce sont les libelles) et les tests. */
const EXCLUS = [/src\/app\/i18n\/(fr|ar|en)\.ts$/, /\.spec\.ts$/, /src\/test\.ts$/];

/** Caracteres qui trahissent un libelle francais laisse dans un template (lettres accentuees et ligatures). */
const ACCENTS = /[àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/;

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return chemin.endsWith('.ts') ? [chemin] : [];
  });
}

/**
 * Contenu du `template:` d'un composant, avec le numero de la premiere ligne. Les templates sont en ligne
 * (convention du projet) : `template: ` suivi d'un litteral entre accents graves.
 */
function template(source) {
  const debut = source.indexOf('template: `');
  if (debut === -1) return null;
  const ouvrant = source.indexOf('`', debut);
  const fermant = source.indexOf('`,', ouvrant + 1);
  if (fermant === -1) return null;
  return { texte: source.slice(ouvrant + 1, fermant), ligne: source.slice(0, ouvrant).split('\n').length };
}

/**
 * Lignes du template qui portent un caractere accentue hors interpolation `{{ ... }}` : le texte statique d'un
 * template doit passer par le pipe `t`. Ce qui est entre `{{ }}` est une expression (cle de traduction, donnee
 * de l'API), pas un libelle en dur.
 */
function suspectes(texteTemplate, premiereLigne) {
  return texteTemplate
    .split('\n')
    .map((ligne, i) => ({ numero: premiereLigne + i, texte: ligne.replace(/\{\{[^}]*\}\}/g, '') }))
    .filter((l) => ACCENTS.test(l.texte));
}

const trouvailles = [];
for (const chemin of fichiers(SOURCES)) {
  const relatif = relative(RACINE, chemin);
  if (EXCLUS.some((motif) => motif.test(relatif))) continue;
  const bloc = template(readFileSync(chemin, 'utf-8'));
  if (!bloc) continue;
  for (const ligne of suspectes(bloc.texte, bloc.ligne)) {
    trouvailles.push(`${relatif}:${ligne.numero} ${ligne.texte.trim()}`);
  }
}

if (trouvailles.length > 0) {
  console.error(`Libelles francais laisses dans des templates (${trouvailles.length}) :`);
  for (const t of trouvailles) console.error(`  ${t}`);
  console.error("Remplacez-les par une cle de traduction (pipe « t ») et ajoutez-la aux trois dictionnaires.");
  process.exit(1);
}

console.log('Traductions : aucun libelle francais litteral dans les templates.');
