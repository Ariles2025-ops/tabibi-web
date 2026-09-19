import { defineConfig, devices } from '@playwright/test';
import { PORT_API_SIMULEE } from './tests/api-simulee';

/**
 * Playwright est le seul outil de test du depot. Deux projets :
 *
 * - `logique` (tests/logique) : aucun navigateur. Playwright transpile le TypeScript et l'execute dans node ;
 *   seuls les modules sans import Angular (paquets ESM, non chargeables tels quels) y sont importes directement
 *   — dictionnaires i18n, fonctions pures de formatage et de validation (`*.formats.ts`).
 * - `navigateur` (tests/navigateur et tests/parcours) : le build de production servi par server.ts (rendu cote
 *   serveur, port 4300) face a l'API simulee de tests/api-simulee.ts (port 4301, demarree par
 *   tests/global-setup.ts, qui ecrit aussi assets/config.json du build pour que le navigateur vise la meme API).
 *   Tout ce qui depend d'Angular y est verifie a l'ecran ou sur la requete envoyee : composants, services HTTP,
 *   gardes de role, SEO, i18n rendu, parcours de bout en bout.
 *
 * Navigateur : Chromium de Playwright (`npx playwright install chromium`, CI), ou le Chrome designe par
 * CHROME_BIN (poste ou conteneur ou il est deja la).
 */

/** Port du serveur SSR pendant les tests (distinct de 4000 / 4200 pour ne pas gener un serveur en marche). */
export const PORT_WEB = 4300;
export const URL_WEB = `http://localhost:${PORT_WEB}`;
export const URL_API = `http://localhost:${PORT_API_SIMULEE}`;
/** Issuer OIDC simule par l'API simulee (connexion simulee : page « Connexion simulée », aucun jeton delivre). */
export const ISSUER_SIMULE = `${URL_API}/realms/tabibi`;

const chromeBin = process.env['CHROME_BIN'];

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: URL_WEB,
    locale: 'fr-FR',
    timezoneId: 'Africa/Algiers',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // Modules TypeScript purs executes dans node : rapide, aucun navigateur n'est lance.
      name: 'logique',
      testDir: 'tests/logique',
    },
    {
      // Tout le reste : l'application reelle dans Chromium, API simulee et appels stubbes par page.route.
      name: 'navigateur',
      testDir: 'tests',
      testIgnore: ['logique/**'],
      use: {
        ...devices['Desktop Chrome'],
        // Sans bac a sable : necessaire en conteneur (execution en root) ; sans effet ailleurs.
        launchOptions: { executablePath: chromeBin || undefined, chromiumSandbox: false },
      },
    },
  ],
  webServer: {
    command: 'node dist/tabibi-web/server/server.mjs',
    // Fichier statique : le serveur est pret sans rendu ni appel a l'API (demarree ensuite par globalSetup).
    url: `${URL_WEB}/assets/config.json`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(PORT_WEB),
      TABIBI_API_URL: URL_API,
      TABIBI_KEYCLOAK_ISSUER: ISSUER_SIMULE,
      TABIBI_KEYCLOAK_CLIENT_ID: 'tabibi-web',
    },
  },
});
