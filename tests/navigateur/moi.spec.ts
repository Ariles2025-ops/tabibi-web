import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, stub } from '../outils';

/**
 * Mon compte : nom, roles et identifiant du compte (sujet du jeton Keycloak) avec copie dans le presse-papiers,
 * lien vers le profil et deconnexion.
 */
const SUJET = '55555555-5555-5555-5555-555555555555';

test.describe('Écran « Mon compte »', () => {
  test('affiche l identifiant du compte, le copie dans le presse-papiers et le confirme', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await connecter(page, { sujet: SUJET, nom: 'secretaire.demo', roles: ['SECRETAIRE'] });

    await ouvrir(page, '/moi');

    await expect(page.getByText('secretaire.demo')).toBeVisible();
    await expect(page.getByText(`${FR['moi.identifiant']} ${SUJET}`)).toBeVisible();
    await expect(page.locator('a[href="/moi/profil"]')).toHaveCount(1);

    await page.getByRole('button', { name: FR['moi.copier'] }).click();

    await expect(page.getByText(FR['moi.copie'])).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(SUJET);
  });

  test('explique comment faire si le presse-papiers est refuse', async ({ page }) => {
    await connecter(page, { sujet: SUJET, nom: 'secretaire.demo', roles: ['SECRETAIRE'] });
    // Presse-papiers indisponible (contexte non securise, permission refusee) : le repli doit s'afficher.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('NotAllowedError')) },
        configurable: true,
      });
    });

    await ouvrir(page, '/moi');
    await page.getByRole('button', { name: FR['moi.copier'] }).click();

    await expect(page.getByText(FR['moi.copieImpossible'])).toBeVisible();
    await expect(page.getByText(FR['moi.copie'])).toHaveCount(0);
  });

  test('non connecte : « Se connecter » et aucun identifiant', async ({ page }) => {
    await ouvrir(page, '/moi');

    await expect(page.getByRole('button', { name: FR['moi.seConnecter'] })).toBeVisible();
    await expect(page.getByText(FR['moi.identifiant'])).toHaveCount(0);
    await expect(page.getByRole('button', { name: FR['moi.copier'] })).toHaveCount(0);
  });
});
