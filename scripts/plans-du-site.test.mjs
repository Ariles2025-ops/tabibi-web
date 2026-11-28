import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Les pages fixes du plan du site arabe sont celles du plan français, préfixées par /ar.
const chemins = (f) => [...readFileSync(new URL(`../src/seo-static/${f}`, import.meta.url), 'utf8').matchAll(/<loc>https:\/\/ndawik\.com([^<]*)<\/loc>/g)].map((m) => m[1]);

test('chaque page du plan français a sa version dans le plan arabe', () => {
  const ar = new Set(chemins('sitemap-pages-ar.xml'));
  const manquantes = chemins('sitemap-pages.xml').map((c) => '/ar' + (c === '/' ? '' : c)).filter((c) => !ar.has(c));
  assert.deepEqual(manquantes, []);
});
