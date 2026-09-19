import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Listes d'attente (ListeAttenteService) : inscription depuis la fiche du praticien, mes inscriptions et
 * retrait (204 sans corps), plus le 409 « deja inscrit ».
 */
const INSCRIPTION = { id: 'i1', patientId: 'p1', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' };

test.describe('Appels API des listes d attente', () => {
  test('inscrit par POST /api/medecins/{id}/liste-attente sans corps depuis la fiche', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/medecins/m1/liste-attente', { statut: 201, corps: INSCRIPTION });

    await ouvrir(page, '/medecins/m1');
    await page.getByRole('button', { name: FR['fiche.mInscrire'] }).click();

    const envoi = await journal.attendre('/api/medecins/m1/liste-attente', 'POST');
    expect(envoi.corps).toBeNull();
    await expect(page.getByText(FR['fiche.inscrit'])).toBeVisible();
  });

  test('409 a l inscription : le praticien vous savait deja inscrit', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/medecins/m1/liste-attente', {
      statut: 409,
      corps: { erreur: 'Ce patient est deja inscrit sur la liste d attente de ce medecin.' },
    });

    await ouvrir(page, '/medecins/m1');
    await page.getByRole('button', { name: FR['fiche.mInscrire'] }).click();

    await expect(page.getByText(FR['fiche.dejaInscrit'])).toBeVisible();
  });

  test('lit mes inscriptions sur GET /api/liste-attente/mes et retire sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/liste-attente/mes', { corps: [INSCRIPTION] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/liste-attente/i1/retirer', { statut: 204, corps: null });

    await ouvrir(page, '/liste-attente');

    const liste = await journal.attendre('/api/liste-attente/mes');
    expect(liste.chemin).toBe('/api/liste-attente/mes');
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();

    await page.getByRole('button', { name: FR['listeAttente.meRetirer'] }).click();

    const retrait = await journal.attendre('/api/liste-attente/i1/retirer', 'POST');
    expect(retrait.corps).toBeNull();
    await expect(page.getByText(FR['listeAttente.aucune'])).toBeVisible();
  });
});

test.describe('Écran de mes listes d attente', () => {
  const ANCIENNE = { id: 'i2', patientId: 'p1', medecinId: 'm2', inscritLe: '2026-09-10T10:00:00Z' };

  test('liste mes inscriptions, les plus anciennes d abord, avec le praticien et la date', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/liste-attente/mes', { corps: [INSCRIPTION, ANCIENNE] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/medecins/m2', { corps: { id: 'm2', nomComplet: 'Dr Karim Haddad' } });

    await ouvrir(page, '/liste-attente');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0).locator('a[href="/medecins/m2"]')).toHaveText('Dr Karim Haddad');
    await expect(lignes.nth(0)).toContainText('Inscrit le 10 septembre 2026');
    await expect(lignes.nth(1).locator('a[href="/medecins/m1"]')).toHaveText('Dr Amina Belkacem');
    await expect(lignes.nth(1).getByRole('button', { name: FR['listeAttente.meRetirer'] })).toBeVisible();
    expect(journal.filtrer(/\/api\/medecins\/m\d$/).length).toBe(2);
  });

  test('un retrait en echec garde la ligne et affiche le motif de l API', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/liste-attente/mes', { corps: [INSCRIPTION, ANCIENNE] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/medecins/m2', { corps: { id: 'm2', nomComplet: 'Dr Karim Haddad' } });
    await stub(page, '**/api/liste-attente/i2/retirer', {
      statut: 403,
      corps: { erreur: 'Cette inscription est a un autre patient.' },
    });

    await ouvrir(page, '/liste-attente');
    await page.locator('main li').nth(0).getByRole('button', { name: FR['listeAttente.meRetirer'] }).click();

    await expect(page.getByText('Cette inscription est a un autre patient.')).toBeVisible();
    await expect(page.locator('main li')).toHaveCount(2);
  });

  test('403 : « Cette page est réservée aux patients. » et aucune ligne', async ({ page }) => {
    await connecter(page, { roles: ['MEDECIN'] });
    await stub(page, '**/api/liste-attente/mes', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/liste-attente');

    await expect(page.getByText(FR['commun.reservePatients'])).toBeVisible();
    await expect(page.locator('main li')).toHaveCount(0);
  });

  test('non connecte : redirection vers la connexion, sans lire mes inscriptions', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/liste-attente');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/liste-attente/mes')).toBe(false);
  });
});
