// Aucune couleur hors charte en dur dans src/ (issue #104) : utiliser les variables --tbi-* / --vert.
// Lancer : npm run test:legal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const INTERDITES = /#(10241f|f4eee2|556070|e7f1ec|0b5c4b|4f635e|5c6b63)\b/i;

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

// Issue #213 : les couleurs de la charte (sable, ardoise, menthe) passent par leurs variables, jamais en dur
// (seuls les fichiers de définition des tokens et les pages légales autonomes en gardent la valeur).
test('sable / ardoise / menthe via variables --tbi-* (hors définition des tokens)', () => {
  const EN_DUR = /#(efe7d6|43584f|d5e7df)\b/i;
  const fautes = [];
  for (const f of fichiers(new URL('../src', import.meta.url).pathname)) {
    if (f.includes('/legal/')) continue;
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (/^\s*(\/\*|--tbi-)/.test(l)) return;
      if (EN_DUR.test(l)) fautes.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(fautes, []);
});
