import { expect, test } from '@playwright/test';
import { AR } from '../../src/app/i18n/ar';
import { connecter, ouvrir, stub } from '../outils';

/**
 * i18n rendue par l'application reelle : pipes `t` (interpolation comprise) et `dateLocale` (locale de la langue
 * courante), bascule sans rechargement, sens d'ecriture. Les dictionnaires eux-memes sont verifies dans le
 * projet `logique`.
 */

const AVIS = [
  {
    id: 'a1',
    rendezVousId: 'r1',
    medecinId: 'm1',
    note: 4,
    commentaire: 'Très bon accueil.',
    statut: 'PUBLIE',
    deposeLe: '2026-09-18T14:30:00Z',
  },
];

test.describe('Traduction rendue', () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/avis/mes', { corps: AVIS });
    await stub(page, '**/api/medecins/m1', {
      corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
    });
  });

  test('traduit les libelles, interpole les parametres et formate la date selon la langue', async ({ page }) => {
    await ouvrir(page, '/mes-avis');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes avis');
    await expect(page.getByText('4 / 5')).toBeVisible();
    await expect(page.getByText('Publié')).toBeVisible();
    await expect(page.getByText('18 septembre 2026')).toBeVisible();

    await page.locator('.selecteur-langue button[lang="en"]').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My reviews');
    await expect(page.getByText('Published')).toBeVisible();
    await expect(page.getByText('18 September 2026')).toBeVisible();
    // Les donnees de l'API ne sont pas traduites.
    await expect(page.getByText('Très bon accueil.')).toBeVisible();

    await page.locator('.selecteur-langue button[lang="ar"]').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(AR['avis.mesAvis']);
    await expect(page.getByText(AR['statut.avis.PUBLIE'])).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // Locale ar-DZ : nom de mois en usage en Algerie, chiffres latins, et surement pas le libelle anglais.
    await expect(page.getByText('18 September 2026')).toHaveCount(0);
    await expect(page.locator('li').first()).toContainText('2026');
  });

  test('interpole un compteur dans la langue courante (duree des creneaux de la fiche)', async ({ page }) => {
    await ouvrir(page, '/medecins/m1');

    // « {n} min » : le parametre est interpole dans les trois langues.
    await expect(page.getByText('(30 min)').first()).toBeVisible();

    await page.locator('.selecteur-langue button[lang="ar"]').click();
    await expect(page.getByText(`(30 ${AR['commun.minutes'].replace('{n} ', '')})`).first()).toBeVisible();
  });
});

test.describe('Rendu en arabe (annuaire)', () => {
  test('libelles, placeholders et options passent en arabe, puis reviennent au francais', async ({ page }) => {
    await ouvrir(page, '/');

    await page.locator('.selecteur-langue button[lang="ar"]').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(AR['annuaire.titre']);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('البحث عن طبيب');
    await expect(page.locator('button[type="submit"]')).toHaveText('بحث');
    await expect(page.locator('input[name="q"]')).toHaveAttribute('placeholder', 'اسم الطبيب');
    await expect(page.locator('select[name="specialite"]')).toContainText('طبيب عام');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page).toHaveTitle(`${AR['seo.annuaire.titre']} | Tabibi`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', AR['seo.annuaire.description']);
    // Les donnees de l'API ne sont pas traduites.
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();

    await page.locator('.selecteur-langue button[lang="fr"]').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page).toHaveTitle('Trouver un médecin en Algérie | Tabibi');
  });
});
