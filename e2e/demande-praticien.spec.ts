import { test, expect, type Page } from '@playwright/test';

async function remplir(page: Page) {
  await page.fill('input[name="nom"]', 'Dr Amina Belkacem');
  await page.fill('input[name="spec"]', 'Cardiologue');
  await page.fill('input[name="wil"]', 'Alger');
  await page.fill('input[name="ord"]', '12345');
  await page.fill('input[name="tel"]', '0550123456');
  await page.fill('input[name="email"]', 'amina@exemple.dz');
}

for (const [chemin, bouton, succes] of [
  ['/praticien', 'Envoyer ma demande', /sous 48 h/],
  ['/ar/praticien', 'إرسال طلبي', /48 ساعة/],
] as const) {
  test(`demande praticien ${chemin} : envoi réussi`, async ({ page }) => {
    let corps: Record<string, unknown> | undefined;
    await page.route('**/api/public/demandes-praticien', (r) => {
      corps = r.request().postDataJSON();
      return r.fulfill({ status: 201, json: { message: 'Demande reçue.' } });
    });
    await page.goto(chemin);
    await remplir(page);
    await page.getByRole('button', { name: bouton }).click();
    await expect(page.locator('.prat-ok')).toContainText(succes);
    expect(corps?.['email']).toBe('amina@exemple.dz');
    expect(corps?.['siteWeb']).toBe('');
  });

  test(`demande praticien ${chemin} : échec, mailto proposé`, async ({ page }) => {
    await page.route('**/api/public/demandes-praticien', (r) => r.fulfill({ status: 500, json: {} }));
    await page.goto(chemin);
    await remplir(page);
    await page.getByRole('button', { name: bouton }).click();
    await expect(page.locator('.prat-erreur')).toBeVisible();
    await expect(page.locator('.prat-mailto')).toBeVisible();
  });
}
