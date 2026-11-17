// Contraste du menu (issue #105) : le lien actif ne doit pas éclaircir le fond vert (blanc dessus < 4,5:1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('lien actif du menu : fond assombri, pas éclairci', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const lignes = css.split('\n').filter((l) => /\.side__nav a\.actif \{[^}]*background/.test(l));
  assert.ok(lignes.length >= 3);
  for (const l of lignes) assert.match(l, /background:rgba\(0,0,0,/, l);
});
