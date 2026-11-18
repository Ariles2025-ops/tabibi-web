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

// Contraste (issue #165) : « Créer un compte » (vert sur blanc) ne doit pas hériter de l'opacité .92 de « .side__nav a ».
test('bouton « Créer un compte » : opaque, texte vert sur fond blanc', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const l = css.split('\n').find((x) => /^\.side \.side__signup, \.side__account \.side__signup \{/.test(x));
  assert.ok(l);
  assert.match(l, /background:#fff/);
  assert.match(l, /color:var\(--vert\)/);
  assert.match(l, /opacity:1/);
});
