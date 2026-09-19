import { expect, test } from '@playwright/test';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Barre de navigation (AppComponent) et roles de l'utilisateur (RoleService, GET /api/moi) : liens publics,
 * liens et cloche reserves aux connectes, sections medecin, secretaire, pharmacie et administration, langue
 * initialisee depuis le profil.
 */
function nav(page: import('@playwright/test').Page) {
  return page.locator('nav').first();
}

test.describe('Barre de navigation', () => {
  test('non connecte : liens publics seuls, aucune cloche, aucune section de role, /api/moi n est pas appele', async ({ page }) => {
    const journal = requetes(page);

    await ouvrir(page, '/');

    await expect(nav(page)).toContainText('Accueil');
    await expect(nav(page)).toContainText('Mes rendez-vous');
    await expect(nav(page)).toContainText('Vérifier une ordonnance');
    await expect(nav(page)).toContainText('Mon compte');
    await expect(nav(page)).not.toContainText('Mes téléconsultations');
    await expect(nav(page)).not.toContainText('Messagerie');
    await expect(nav(page)).not.toContainText('Dawini');
    await expect(nav(page)).not.toContainText("Mes listes d'attente");
    await expect(page.locator('app-cloche-notifications')).toHaveCount(0);
    await expect(nav(page)).not.toContainText('Espace médecin');
    await expect(nav(page)).not.toContainText('Espace pharmacie');
    await expect(nav(page)).not.toContainText('Espace secrétaire');
    await expect(nav(page)).not.toContainText('Administration');
    expect(journal.contient('/api/moi')).toBe(false);
    expect(journal.contient('/api/moi/profil')).toBe(false);
  });

  test('connecte (PATIENT) : cloche et liens prives, aucune section de role', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });

    await ouvrir(page, '/');

    await expect(page.locator('app-cloche-notifications')).toHaveCount(1);
    await expect(nav(page)).toContainText('Mes ordonnances');
    await expect(nav(page)).toContainText('Mes téléconsultations');
    for (const href of ['/messagerie', '/mes-avis', '/dawini', '/liste-attente']) {
      await expect(nav(page).locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(nav(page)).not.toContainText('Espace médecin');
    await expect(nav(page)).not.toContainText('Administration');
  });

  test('role MEDECIN : section « Espace médecin » et ses liens', async ({ page }) => {
    await connecter(page, { roles: ['MEDECIN'] });

    await ouvrir(page, '/');

    await expect(nav(page)).toContainText('Espace médecin');
    await expect(nav(page)).toContainText('Agenda');
    await expect(nav(page)).toContainText('Disponibilités');
    for (const href of ['/medecin/teleconsultations', '/medecin/candidature', '/medecin/avis', '/medecin/liste-attente', '/medecin/secretaires']) {
      await expect(nav(page).locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(nav(page)).not.toContainText('Administration');
    await expect(nav(page)).not.toContainText('Espace secrétaire');
  });

  test('role ADMIN : section « Administration » seule', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });

    await ouvrir(page, '/');

    await expect(nav(page)).toContainText('Administration');
    for (const href of ['/admin', '/admin/candidatures', '/admin/avis']) {
      await expect(nav(page).locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(nav(page)).not.toContainText('Espace médecin');
  });

  test('role PHARMACIE : section « Espace pharmacie » seule', async ({ page }) => {
    await connecter(page, { roles: ['PHARMACIE'] });

    await ouvrir(page, '/');

    await expect(nav(page)).toContainText('Espace pharmacie');
    await expect(nav(page).locator('a[href="/pharmacie"]')).toHaveCount(1);
    await expect(nav(page)).not.toContainText('Espace médecin');
    await expect(nav(page)).not.toContainText('Administration');
  });

  test('role SECRETAIRE : section « Espace secrétaire » seule', async ({ page }) => {
    await connecter(page, { roles: ['SECRETAIRE'] });

    await ouvrir(page, '/');

    await expect(nav(page)).toContainText('Espace secrétaire');
    await expect(nav(page).locator('a[href="/secretaire"]')).toHaveCount(1);
    await expect(nav(page)).not.toContainText('Espace médecin');
    await expect(nav(page)).not.toContainText('Administration');
  });

  test('le profil /api/moi n est lu qu une seule fois pour toute la page', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });

    await ouvrir(page, '/');
    await expect(nav(page)).toContainText('Administration');

    await page.getByRole('link', { name: 'Vérifier une ordonnance' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vérifier une ordonnance');
    await nav(page).getByRole('link', { name: 'Mon compte' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mon compte');

    expect(journal.filtrer(/\/api\/moi$/).length).toBe(1);
  });

  test('/api/moi en erreur : aucune section de role, l application reste utilisable', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/moi', { statut: 500, corps: { erreur: 'API indisponible' } });

    await ouvrir(page, '/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
    await expect(nav(page)).not.toContainText('Administration');
  });

  test('la langue du profil initialise l interface apres connexion, sans etre memorisee', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/moi/profil', { corps: { langue: 'en' } });

    await ouvrir(page, '/');

    await expect(nav(page)).toContainText('Home');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    expect(await page.evaluate(() => localStorage.getItem('tabibi.langue'))).toBeNull();
  });

  test('un choix manuel de langue l emporte sur le profil', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/moi/profil', { corps: { langue: 'en' } });

    await ouvrir(page, '/');
    await page.locator('.selecteur-langue button[lang="ar"]').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    expect(await page.evaluate(() => localStorage.getItem('tabibi.langue'))).toBe('ar');

    // Rechargement : le choix memorise s'applique, le profil ne le remplace pas.
    await ouvrir(page, '/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });
});
