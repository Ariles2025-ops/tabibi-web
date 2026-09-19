import { expect, test } from '@playwright/test';
import { ISSUER_SIMULE } from '../playwright.config';
import { ouvrir } from './outils';

/**
 * Parcours public : recherche d'un praticien, ouverture de sa fiche (creneaux, synthese des avis), tentative de
 * reservation sans etre connecte (renvoi vers la page de connexion de l'issuer simule).
 */
test.describe('Recherche de praticiens', () => {
  test('affiche les praticiens au chargement et filtre par spécialité', async ({ page }) => {
    await ouvrir(page, '/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
    await expect(page.getByText('Dr Karim Meziane')).toBeVisible();

    await page.locator('select[name="specialite"]').selectOption('cardiologue');
    await page.getByRole('button', { name: 'Rechercher' }).click();

    await expect(page.getByText('Dr Karim Meziane')).toBeVisible();
    await expect(page.getByText('Dr Amina Belkacem')).toHaveCount(0);
    await expect(page.getByText('Cardiologue · Oran (Oran)')).toBeVisible();
  });

  test('recherche par nom : aucun résultat puis un résultat', async ({ page }) => {
    await ouvrir(page, '/');
    const nom = page.getByPlaceholder('Nom du medecin');

    await nom.fill('Inconnu');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByText('Aucun praticien trouve.')).toBeVisible();

    await nom.fill('belkacem');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
    await expect(page.getByText('Dr Karim Meziane')).toHaveCount(0);
  });

  test('mène à la fiche : créneaux disponibles et synthèse des avis', async ({ page }) => {
    await ouvrir(page, '/');
    await page.getByRole('link', { name: /Dr Amina Belkacem/ }).click();

    await expect(page).toHaveURL(/\/medecins\/m1$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dr Amina Belkacem');
    await expect(page.getByText('Généraliste · Alger (Alger)')).toBeVisible();
    await expect(page).toHaveTitle('Dr Amina Belkacem, Généraliste à Alger | Tabibi');

    // Deux creneaux disponibles sur trois (le troisieme est pris), un bouton « Réserver » chacun.
    await expect(page.getByRole('button', { name: 'Réserver' })).toHaveCount(2);
    await expect(page.getByText('(30 min)')).toBeVisible();
    await expect(page.getByText('(20 min)')).toBeVisible();

    // Synthese publique des avis : moyenne au format francais et derniers avis.
    await expect(page.getByRole('heading', { name: 'Avis des patients' })).toBeVisible();
    await expect(page.getByText('4,5 / 5 (2 avis)')).toBeVisible();
    await expect(page.getByText('Très bon accueil, explications claires.')).toBeVisible();

    // Liste d'attente proposee, messagerie disponible.
    await expect(page.getByRole('button', { name: "M'inscrire sur la liste d'attente" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Écrire au médecin' })).toBeVisible();
  });

  test('fiche sans avis : « Aucun avis pour le moment »', async ({ page }) => {
    await ouvrir(page, '/medecins/m2');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dr Karim Meziane');
    await expect(page.getByText('Aucun avis pour le moment')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réserver' })).toHaveCount(2);
  });

  test('réserver sans être connecté envoie vers la page de connexion (issuer simulé)', async ({ page }) => {
    await ouvrir(page, '/medecins/m1');
    await page.getByRole('button', { name: 'Réserver' }).first().click();

    await page.waitForURL((url) => url.href.startsWith(`${ISSUER_SIMULE}/protocol/openid-connect/auth`));
    const url = new URL(page.url());
    expect(url.searchParams.get('client_id')).toBe('tabibi-web');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:4300');
    // Le retour apres connexion vise la fiche (state OIDC).
    expect(decodeURIComponent(url.searchParams.get('state') ?? '')).toContain('/medecins/m1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connexion simulée');
  });
});
