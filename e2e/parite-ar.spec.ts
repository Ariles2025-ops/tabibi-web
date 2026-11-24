import { test, expect } from '@playwright/test';

/** Routes arabes du parcours praticien / verification : 200, lang="ar", dir="rtl" (pas de 404 francais). */
for (const chemin of ['/ar/praticien', '/ar/verifier']) {
  test(`route ${chemin} : 200 avec lang="ar"`, async ({ page }) => {
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
}

test('parcours AR : /ar -> lien « هل أنت طبيب؟ » mene a /ar/praticien', async ({ page }) => {
  await page.goto('/ar');
  const liens = page.getByRole('link', { name: 'هل أنت طبيب؟' });
  await expect(liens.first()).toHaveAttribute('href', '/ar/praticien');
});
