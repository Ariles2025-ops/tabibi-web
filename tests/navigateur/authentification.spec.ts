import { expect, test } from '@playwright/test';
import { ISSUER_SIMULE } from '../../playwright.config';
import { CHEMIN_CONFIGURATION } from '../../src/app/config/config.formats';
import { JETON_DE_TEST, connecter, ouvrir, requetes } from '../outils';

/**
 * Etat de connexion (AuthService) et jeton pose par l'intercepteur. La connexion est simulee par le stockage de
 * session (voir tests/outils/connexion.ts) : `hasValidAccessToken()` suffit a rendre l'application connectee.
 */
test.describe('Connexion', () => {
  test('connecte : « Mon compte » affiche le nom, les roles et l identifiant, et les appels API portent le jeton', async ({ page }) => {
    const journal = requetes(page);
    const entetesFichier: Record<string, string>[] = [];
    page.on('request', (r) => {
      if (r.url().includes(CHEMIN_CONFIGURATION)) entetesFichier.push(r.headers());
    });
    await connecter(page, { sujet: 'p1', nom: 'Patient Test', roles: ['PATIENT', 'MEDECIN'] });

    await ouvrir(page, '/moi');

    await expect(page.getByText('Connecté en tant que')).toBeVisible();
    await expect(page.getByText('Patient Test')).toBeVisible();
    await expect(page.getByText('Rôles : PATIENT, MEDECIN')).toBeVisible();
    await expect(page.locator('code')).toHaveText('p1');

    const appel = await journal.attendre('/api/moi');
    expect(appel.entetes['authorization']).toBe(`Bearer ${JETON_DE_TEST}`);
    // Hors API, l'intercepteur ne pose rien : assets/config.json part sans jeton.
    expect(entetesFichier.length).toBeGreaterThan(0);
    expect(entetesFichier[0]['authorization']).toBeUndefined();
  });

  test('non connecte : le serveur rend l etat « non connecte » et rien n est demande a l API', async ({ page, request }) => {
    const html = await (await request.get('/moi')).text();
    expect(html).toContain('Se connecter');
    expect(html).not.toContain('Connecté en tant que');

    const journal = requetes(page);
    await ouvrir(page, '/moi');

    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    expect(journal.contient('/api/moi')).toBe(false);
  });

  test('deconnexion : le navigateur part vers la fin de session de Keycloak', async ({ page }) => {
    await connecter(page);
    await ouvrir(page, '/moi');

    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await page.waitForURL((url) => url.href.startsWith(`${ISSUER_SIMULE}/protocol/openid-connect/logout`));
  });
});
