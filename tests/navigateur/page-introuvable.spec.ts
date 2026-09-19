import { expect, test } from '@playwright/test';
import { URL_WEB } from '../../playwright.config';
import { FR } from '../../src/app/i18n/fr';
import { ouvrir } from '../outils';

/** Route `**` : message, liens de sortie, directive robots et statut 404 au rendu serveur. */
test.describe('Page introuvable', () => {
  test('affiche le message et les deux liens de sortie, avec le statut 404', async ({ page }) => {
    const reponse = await ouvrir(page, '/une-adresse-qui-n-existe-pas');

    expect(reponse?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['introuvable.titre']);
    await expect(page.getByText(FR['introuvable.texte'])).toBeVisible();
    await expect(page.locator('main a')).toHaveCount(2);
    await expect(page.locator('main a').nth(0)).toHaveAttribute('href', '/');
    await expect(page.locator('main a').nth(1)).toHaveAttribute('href', '/verifier');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('un lien mort atteint depuis une autre page affiche la meme page introuvable', async ({ page }) => {
    await ouvrir(page, '/');
    await page.evaluate(() => {
      const lien = document.createElement('a');
      lien.id = 'lien-mort';
      lien.textContent = 'lien mort';
      lien.href = '/lien-mort';
      document.querySelector('main')?.appendChild(lien);
    });

    await page.locator('#lien-mort').click();

    await expect(page).toHaveURL(`${URL_WEB}/lien-mort`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['introuvable.titre']);
    await expect(page).toHaveTitle(`${FR['seo.pageIntrouvable']} | Tabibi`);
  });
});
