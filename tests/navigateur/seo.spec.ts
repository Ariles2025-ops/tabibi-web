import { expect, test } from '@playwright/test';
import { URL_WEB } from '../../playwright.config';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir } from '../outils';

/**
 * Titre (suffixe « | Tabibi »), description, lien canonique, directive robots et statut 404 poses par
 * `SeoService` a chaque page, sans duplication de balise d'une navigation a l'autre.
 */
test.describe('Titre, description, canonique et robots', () => {
  test('page publique : titre, description, canonique, aucune directive robots', async ({ page }) => {
    await ouvrir(page, '/');

    await expect(page).toHaveTitle(`${FR['seo.annuaire.titre']} | Tabibi`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', FR['seo.annuaire.description']);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${URL_WEB}/`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test('la page suivante remplace titre, description et canonique sans dupliquer les balises', async ({ page }) => {
    await ouvrir(page, '/');
    await page.getByRole('link', { name: 'Vérifier une ordonnance' }).click();

    await expect(page).toHaveTitle(`${FR['seo.verifier.titre']} | Tabibi`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', FR['seo.verifier.description']);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${URL_WEB}/verifier`);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test('page privee : noindex, nofollow, description par defaut et aucun canonique ; la page publique suivante retire la balise', async ({ page }) => {
    await connecter(page);
    await ouvrir(page, '/moi');

    await expect(page).toHaveTitle(`${FR['seo.monCompte']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', FR['seo.description.defaut']);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

    await page.getByRole('link', { name: 'Accueil' }).click();

    await expect(page).toHaveTitle(`${FR['seo.annuaire.titre']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${URL_WEB}/`);
  });

  test('page introuvable : titre, noindex et statut 404 du serveur de rendu', async ({ page }) => {
    const reponse = await ouvrir(page, '/adresse-qui-n-existe-pas');

    expect(reponse?.status()).toBe(404);
    await expect(page).toHaveTitle(`${FR['seo.pageIntrouvable']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('ressource introuvable : titre particulier et statut 404 (fiche d un praticien inconnu)', async ({ page }) => {
    const reponse = await ouvrir(page, '/medecins/inconnu-xyz');

    expect(reponse?.status()).toBe(404);
    await expect(page).toHaveTitle(`${FR['seo.fiche.introuvable']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('le titre suit la langue choisie (effet sur le signal de langue)', async ({ page }) => {
    await ouvrir(page, '/');
    await page.locator('.selecteur-langue button[lang="en"]').click();

    await expect(page).toHaveTitle(/\| Tabibi$/);
    await expect(page).not.toHaveTitle(`${FR['seo.annuaire.titre']} | Tabibi`);
  });
});
