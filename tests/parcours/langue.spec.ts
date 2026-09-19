import { expect, test } from '@playwright/test';
import { URL_WEB } from '../../playwright.config';
import { ouvrir } from '../outils';

/**
 * Langues de l'interface (francais, arabe, anglais) : bascule par le selecteur de la barre de navigation, sens
 * d'ecriture de droite a gauche en arabe, memorisation du choix et langue demandee au rendu cote serveur
 * (en-tete Accept-Language). Le navigateur des tests annonce fr-FR (playwright.config.ts) : la page part en francais.
 */
test.describe("Langues de l'interface", () => {
  test("bascule l'annuaire en arabe : titre arabe, dir rtl et titre de page traduit", async ({ page }) => {
    await ouvrir(page, '/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.locator('.selecteur-langue button[lang="ar"]').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('البحث عن طبيب');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page).toHaveTitle('البحث عن طبيب في الجزائر | Tabibi');
    // Les donnees de l'API ne sont pas traduites.
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
  });

  test('le choix de langue est memorise et suit la navigation', async ({ page }) => {
    await ouvrir(page, '/');
    await page.locator('.selecteur-langue button[lang="en"]').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find a practitioner');

    await page.getByRole('link', { name: 'Check a prescription' }).click();
    await expect(page).toHaveURL(`${URL_WEB}/verifier`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check a prescription');

    // Rechargement complet : le choix memorise (localStorage) s'applique avant tout.
    await ouvrir(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find a practitioner');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('le serveur rend la page dans la langue demandee (Accept-Language)', async ({ request }) => {
    const arabe = await request.get('/', { headers: { 'Accept-Language': 'ar-DZ,ar;q=0.9,fr;q=0.8' } });
    const htmlArabe = await arabe.text();
    expect(htmlArabe).toContain('<html lang="ar" dir="rtl">');
    expect(htmlArabe).toContain('البحث عن طبيب');
    expect(htmlArabe).toContain('<title>البحث عن طبيب في الجزائر | Tabibi</title>');
    expect(arabe.headers()['vary']).toContain('Accept-Language');

    const anglais = await request.get('/', { headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
    expect(await anglais.text()).toContain('<html lang="en" dir="ltr">');

    // Langue inconnue ou en-tete absent : francais.
    const kabyle = await request.get('/', { headers: { 'Accept-Language': 'kab' } });
    const htmlKabyle = await kabyle.text();
    expect(htmlKabyle).toContain('<html lang="fr" dir="ltr">');
    expect(htmlKabyle).toContain('Trouver un praticien');
  });
});
