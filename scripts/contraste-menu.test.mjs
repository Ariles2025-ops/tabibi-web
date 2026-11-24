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

// Contraste (issue #214) : badge « .ok » (texte vert sur fond menthe) >= 4,5:1.
test('badge .dwh-mock-resp .ok : contraste >= 4,5:1', () => {
  const css = readFileSync(new URL('../src/legacy-accueil.css', import.meta.url), 'utf8');
  const l = css.split('\n').find((x) => /^\.dwh-mock-resp \.ok\{/.test(x));
  assert.ok(l);
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const fg = l.match(/[;{ ]color:(#[0-9A-Fa-f]{6})/)[1];
  const [a, b] = [lum(fg), lum('#D5E7DF')].sort((x, y) => y - x);
  assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${fg}`);
});
