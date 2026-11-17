// Aucune couleur hors charte en dur dans src/ (issue #104) : utiliser les variables --tbi-* / --vert.
// Lancer : npm run test:legal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const INTERDITES = /#(10241f|f4eee2|556070|e7f1ec|0b5c4b|4f635e)\b/i;

function fichiers(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fichiers(p) : /\.(css|ts|html)$/.test(n) ? [p] : [];
  });
}

test('pas de couleur hors charte en dur (hors définition des tokens)', () => {
  const fautes = [];
  for (const f of fichiers(new URL('../src', import.meta.url).pathname)) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (/^\s*(\/\*|--tbi-)/.test(l)) return;
      if (INTERDITES.test(l)) fautes.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(fautes, []);
});
