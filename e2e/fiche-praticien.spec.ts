import { test, expect, devices } from '@playwright/test';

/**
 * Parcours « ouvrir une fiche praticien » (incident du 21/11/2026) : depuis une liste de spécialité,
 * cliquer sur le premier praticien doit ouvrir sa fiche, en français et en arabe, sur ordinateur et
 * sur téléphone. Sans connexion : lancé après chaque mise en ligne contre le vrai site.
 *
 * La navigation est faite par Angular côté client : l'URL change après le chargement du morceau de
 * page. On attend donc l'URL de la fiche (waitForURL), jamais seulement « networkidle ».
 */
const LANGUES: [string, string][] = [['FR', ''], ['AR', '/ar']];
const APPAREILS = [
  { nom: 'ordinateur', options: {} },
  { nom: 'téléphone', options: { ...devices['Pixel 7'] } },
];

for (const appareil of APPAREILS) {
  for (const [langue, prefixe] of LANGUES) {
    test(`${appareil.nom} ${langue} : ouvrir une fiche praticien depuis une liste`, async ({ browser }) => {
      const ctx = await browser.newContext(appareil.options);
      const page = await ctx.newPage();
      const erreursJs: string[] = [];
      page.on('pageerror', (e) => erreursJs.push(e.message));

      const reponse = await page.goto(`${prefixe}/specialites/cardiologue/alger`, { waitUntil: 'networkidle' });
      expect(reponse?.status(), 'la liste répond').toBeLessThan(400);

      const liens = page.locator('a[href*="/praticiens/"]');
      await expect(liens.first(), 'au moins un praticien affiché').toBeVisible({ timeout: 20_000 });
      expect(await liens.count(), 'la liste n\'est pas vide').toBeGreaterThanOrEqual(5);

      await liens.first().click();
      await page.waitForURL(/\/praticiens\//, { timeout: 15_000 });
      await expect(page.locator('h1').first(), 'la fiche affiche un nom').toHaveText(/\S{3,}/, { timeout: 15_000 });

      expect(erreursJs, 'aucune erreur JavaScript').toEqual([]);
      await ctx.close();
    });
  }
}
