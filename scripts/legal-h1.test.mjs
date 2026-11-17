// Chaque page legale (bilingue FR/AR) doit avoir exactement un <h1> (le titre francais).
// Lancer : npm run test:legal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const page of ['cgu', 'confidentialite', 'mentions-legales']) {
  test(`${page}.html : un seul h1`, () => {
    const html = readFileSync(new URL(`../src/legal/${page}.html`, import.meta.url), 'utf8');
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  });
}
