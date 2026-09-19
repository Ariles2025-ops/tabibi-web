import { expect, test } from '@playwright/test';
import { URL_WEB } from '../../playwright.config';
import { FR } from '../../src/app/i18n/fr';
import { ouvrir, requetes, stub } from '../outils';

/**
 * Annuaire (page d'accueil) : recherche au chargement, criteres transmis a l'API et lien vers la fiche.
 * La premiere liste est rendue par le serveur et transmise au navigateur (cache de transfert) : les appels
 * observables sont ceux des recherches suivantes.
 */
const MEDECINS = [
  { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
  { id: 'm2', nomComplet: 'Dr Karim Meziane', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue', wilayaCode: '31', wilayaFr: 'Oran', ville: 'Oran' },
];

test.describe('Écran de l annuaire', () => {
  test('liste les praticiens des le chargement, avec un lien vers leur fiche', async ({ page }) => {
    await ouvrir(page, '/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['annuaire.titre']);
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
    await expect(page.getByText('Cardiologue · Oran (Oran)')).toBeVisible();
    await expect(page.locator('a[href="/medecins/m2"]')).toHaveCount(1);
  });

  test('relance la recherche avec les criteres saisis (specialite, wilaya, nom)', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/medecins?**', { corps: [MEDECINS[1]] });

    await ouvrir(page, '/');
    await page.locator('select[name="specialite"]').selectOption('cardiologue');
    await page.locator('input[name="wilaya"]').fill('31');
    await page.locator('input[name="q"]').fill('Meziane');
    await page.getByRole('button', { name: FR['annuaire.rechercher'] }).click();

    const recherche = await journal.attendre('/api/medecins');
    expect(recherche.parametres.get('specialite')).toBe('cardiologue');
    expect(recherche.parametres.get('wilaya')).toBe('31');
    expect(recherche.parametres.get('q')).toBe('Meziane');
    await expect(page.getByText('Dr Karim Meziane')).toBeVisible();
    await expect(page.getByText('Dr Amina Belkacem')).toHaveCount(0);
  });

  test('aucun resultat : « Aucun praticien trouve. » ; une erreur de l API laisse la page utilisable', async ({ page }) => {
    await stub(page, '**/api/medecins?**', { corps: [] });

    await ouvrir(page, '/');
    await page.locator('input[name="q"]').fill('Inconnu');
    await page.getByRole('button', { name: FR['annuaire.rechercher'] }).click();

    await expect(page.getByText(FR['annuaire.aucun'])).toBeVisible();

    await stub(page, '**/api/medecins?**', { statut: 500, corps: { erreur: 'Service indisponible.' } });
    await page.getByRole('button', { name: FR['annuaire.rechercher'] }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['annuaire.titre']);
    await expect(page).toHaveURL(`${URL_WEB}/`);
  });
});
