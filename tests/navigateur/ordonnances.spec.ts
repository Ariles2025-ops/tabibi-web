import { expect, test } from '@playwright/test';
import { CODE_ORDONNANCE_VALIDE } from '../api-simulee';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Ordonnances (OrdonnanceService) : liste du patient, detail, telechargement du PDF (reponse binaire),
 * verification publique d'un code (encode dans l'URL) et emission par le medecin.
 */
const ORDONNANCE = {
  id: 'o1',
  medecinId: 'm1',
  patientId: 'p1',
  rendezVousId: 'r1',
  lignes: [{ medicament: 'Amoxicilline 1 g', posologie: '1 comprimé matin et soir', duree: '7 jours' }],
  emiseLe: '2026-09-18T10:00:00Z',
  codeVerification: CODE_ORDONNANCE_VALIDE,
  statut: 'EMISE',
};

test.describe('Appels API des ordonnances', () => {
  test('lit mes ordonnances sur GET /api/ordonnances/mes', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/mes', { corps: [ORDONNANCE] });

    await ouvrir(page, '/mes-ordonnances');

    const appel = await journal.attendre('/api/ordonnances/mes');
    expect(appel.chemin).toBe('/api/ordonnances/mes');
    await expect(page.getByText(CODE_ORDONNANCE_VALIDE).first()).toBeVisible();
  });

  test('lit une ordonnance sur GET /api/ordonnances/{id} et affiche ses lignes', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });

    await ouvrir(page, '/ordonnances/o1');

    const appel = await journal.attendre('/api/ordonnances/o1');
    expect(appel.chemin).toBe('/api/ordonnances/o1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['ordonnance.titre']);
    await expect(page.getByText('Amoxicilline 1 g')).toBeVisible();
    await expect(page.getByText('1 comprimé matin et soir')).toBeVisible();
  });

  test('404 sur le detail : « Ordonnance introuvable. »', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o9', { statut: 404, corps: { erreur: 'Ordonnance introuvable.' } });

    await ouvrir(page, '/ordonnances/o9');

    await expect(page.getByText(FR['ordonnance.introuvable'])).toBeVisible();
  });

  test('telecharge le PDF sur GET /api/ordonnances/{id}/pdf et remet le fichier au navigateur', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await page.route('**/api/ordonnances/o1/pdf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { 'access-control-allow-origin': '*' },
        body: Buffer.from('%PDF-1.7\n'),
      }),
    );

    await ouvrir(page, '/ordonnances/o1');
    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] }).click();

    const appel = await journal.attendre('/api/ordonnances/o1/pdf');
    expect(appel.chemin).toBe('/api/ordonnances/o1/pdf');
    expect((await telechargement).suggestedFilename()).toBe(`ordonnance-${CODE_ORDONNANCE_VALIDE}.pdf`);
  });

  test('PDF en echec : le motif est affiche sans quitter la page', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/ordonnances/o1/pdf', { statut: 500, corps: { erreur: 'Génération du PDF impossible.' } });

    await ouvrir(page, '/ordonnances/o1');
    await page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] }).click();

    await expect(page.getByText(/PDF/).last()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['ordonnance.titre']);
  });

  test('verifie un code sur GET /api/ordonnances/verifier/{code}, code encode dans l URL', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/ordonnances/verifier/**', { corps: { valide: true, emiseLe: '2026-09-18T10:00:00Z', statut: 'EMISE' } });

    await ouvrir(page, '/verifier');
    await page.locator('input[name="code"]').fill('TBB 2026/0001');
    await page.getByRole('button', { name: FR['verifier.verifier'] }).click();

    const appel = await journal.attendre('/api/ordonnances/verifier');
    expect(appel.url).toContain('/api/ordonnances/verifier/TBB%202026%2F0001');
  });

  test('emet une ordonnance par POST /api/ordonnances avec { patientId, rendezVousId, lignes }', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['MEDECIN'] });
    await stub(page, '**/api/ordonnances', { statut: 201, corps: ORDONNANCE });

    await ouvrir(page, '/medecin/ordonnance/nouvelle');

    await page.getByLabel(FR['nouvelleOrdonnance.patientId']).fill('p1');
    await page.getByLabel(FR['nouvelleOrdonnance.rendezVousLie']).fill('r1');
    await page.getByLabel(FR['ordonnance.medicament']).fill('Amoxicilline 1 g');
    await page.getByLabel(FR['ordonnance.posologie']).fill('1 comprimé matin et soir');
    await page.getByLabel(FR['ordonnance.duree']).fill('7 jours');
    await page.getByRole('button', { name: FR['nouvelleOrdonnance.emettre'] }).click();

    const envoi = await journal.attendre('/api/ordonnances', 'POST');
    expect(envoi.corps).toEqual({
      patientId: 'p1',
      rendezVousId: 'r1',
      lignes: [{ medicament: 'Amoxicilline 1 g', posologie: '1 comprimé matin et soir', duree: '7 jours' }],
    });
  });

  test('lit les ordonnances redigees sur GET /api/medecin/ordonnances', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/ordonnances', { corps: [ORDONNANCE] });

    await ouvrir(page, '/medecin/ordonnances');

    const appel = await journal.attendre('/api/medecin/ordonnances');
    expect(appel.chemin).toBe('/api/medecin/ordonnances');
  });
});

test.describe('Écran du detail d une ordonnance', () => {
  test.beforeEach(async ({ page }) => {
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
  });

  test('affiche le praticien, le patient, les lignes, le code et les boutons Imprimer et PDF', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });

    await ouvrir(page, '/ordonnances/o1');

    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
    await expect(page.getByText(/Patient : p1/)).toBeVisible();
    await expect(page.getByText('Amoxicilline 1 g')).toBeVisible();
    await expect(page.getByText(CODE_ORDONNANCE_VALIDE).first()).toBeVisible();
    await expect(page.getByText(/18 septembre 2026/)).toBeVisible();
    await expect(page.getByRole('button', { name: FR['ordonnance.imprimer'] })).toBeVisible();
    await expect(page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] })).toBeEnabled();
    await expect(page.locator('main a[href="/mes-ordonnances"]')).toHaveCount(1);
  });

  test('un medecin revient vers ses ordonnances redigees', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });

    await ouvrir(page, '/ordonnances/o1');

    await expect(page.locator('main a[href="/medecin/ordonnances"]')).toHaveCount(1);
    await expect(page.locator('main a[href="/mes-ordonnances"]')).toHaveCount(0);
  });

  test('PDF en echec : le motif { erreur } du corps binaire est lu et affiche', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });
    await page.route('**/api/ordonnances/o1/pdf', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json; charset=utf-8',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ erreur: 'Ordonnance annulée : pas de PDF.' }),
      }),
    );

    await ouvrir(page, '/ordonnances/o1');
    await page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] }).click();

    await expect(page.getByText('Ordonnance annulée : pas de PDF.')).toBeVisible();
    await expect(page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] })).toBeEnabled();
  });

  test('PDF en echec sans motif lisible : message generique', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });
    await page.route('**/api/ordonnances/o1/pdf', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'text/plain; charset=utf-8',
        headers: { 'access-control-allow-origin': '*' },
        body: 'pas du json',
      }),
    );

    await ouvrir(page, '/ordonnances/o1');
    await page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] }).click();

    await expect(page.getByText(FR['ordonnance.pdfEchec'])).toBeVisible();
  });

  test('403 : « Vous n avez pas accès à cette ordonnance. » et aucun bouton PDF', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/ordonnances/o1');

    await expect(page.getByText(FR['ordonnance.acces'])).toBeVisible();
    await expect(page.getByRole('button', { name: FR['ordonnance.telechargerPdf'] })).toHaveCount(0);
  });

  test('page privee : titre « Ordonnance | Tabibi » et robots noindex', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/o1', { corps: ORDONNANCE });

    await ouvrir(page, '/ordonnances/o1');

    await expect(page).toHaveTitle(`${FR['ordonnance.titre']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('non connecte : redirection vers la connexion, sans lire l ordonnance', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/ordonnances/o1');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/ordonnances/o1')).toBe(false);
  });

  test('aucune ordonnance : message dedie sur « Mes ordonnances »', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/ordonnances/mes', { corps: [] });

    await ouvrir(page, '/mes-ordonnances');

    await expect(page.getByText(FR['ordonnances.aucune'])).toBeVisible();
  });
});
