import { Page, expect, test } from '@playwright/test';
import { ISSUER_SIMULE, URL_WEB } from '../../playwright.config';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Fiche du praticien : creneaux, reservation, « Écrire au médecin », liste d'attente et synthese des avis.
 *
 * La fiche est atteinte depuis l'annuaire, par un clic sur le praticien : la navigation se fait alors cote
 * client, et tous les appels de la page partent du navigateur, ou `stub` peut y repondre. Une ouverture directe
 * de l'URL passerait par le rendu serveur, dont les reponses sont transmises au navigateur (cache de transfert)
 * et ne repasseraient pas par le reseau.
 */
const MEDECIN = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

const SYNTHESE = {
  moyenne: 4.5,
  nombre: 2,
  avis: [
    { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
    { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
  ],
};

const CRENEAU = { id: 'c1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', dureeMinutes: 30, disponible: true };

/** Ouvre l'annuaire puis la fiche de m1 par un clic (navigation cote client). */
async function ouvrirFiche(page: Page) {
  await ouvrir(page, '/');
  await page.getByRole('link', { name: MEDECIN.nomComplet }).click();
  await expect(page).toHaveURL(`${URL_WEB}/medecins/m1`);
}

test.describe('Écran de la fiche du praticien', () => {
  test.beforeEach(async ({ page }) => {
    await stub(page, '**/api/medecins/m1', { corps: MEDECIN });
    await stub(page, '**/api/medecins/m1/avis', { corps: SYNTHESE });
  });

  test('affiche le praticien, ses creneaux et la synthese publique de ses avis', async ({ page }) => {
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [CRENEAU] });

    await ouvrirFiche(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(MEDECIN.nomComplet);
    await expect(page.getByText('Généraliste · Alger (Alger)')).toBeVisible();
    await expect(page.getByText('(30 min)')).toBeVisible();
    await expect(page.getByText('4,5 / 5 (2 avis)')).toBeVisible();
    await expect(page.getByText('Très bon accueil.')).toBeVisible();
  });

  test('sans creneau : « Aucun créneau disponible pour le moment. » et proposition de liste d attente', async ({ page }) => {
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [] });

    await ouvrirFiche(page);

    await expect(page.getByText(FR['fiche.aucunCreneau'])).toBeVisible();
    await expect(page.getByText(FR['fiche.inscrivezVous'])).toBeVisible();
    await expect(page.getByRole('button', { name: FR['fiche.mInscrire'] })).toBeVisible();
  });

  test('sans avis : « Aucun avis pour le moment »', async ({ page }) => {
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [] });
    await stub(page, '**/api/medecins/m1/avis', { corps: { moyenne: null, nombre: 0, avis: [] } });

    await ouvrirFiche(page);

    await expect(page.getByText('Aucun avis pour le moment')).toBeVisible();
  });

  test('reserve un creneau par POST /api/creneaux/{id}/reserver et confirme', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [CRENEAU] });
    await stub(page, '**/api/creneaux/c1/reserver', {
      statut: 201,
      corps: { id: 'r1', medecinId: 'm1', debut: CRENEAU.debut, statut: 'CONFIRME' },
    });

    await ouvrirFiche(page);
    await page.getByRole('button', { name: FR['fiche.reserver'] }).click();

    const reservation = await journal.attendre('/api/creneaux/c1/reserver', 'POST');
    expect(reservation.corps).toBeNull();
    await expect(page.getByText(/Rendez-vous réservé le/)).toBeVisible();
    await expect(page.getByRole('link', { name: FR['fiche.voirMesRendezVous'] })).toBeVisible();
  });

  test('409 a la reservation : « Ce créneau vient d être pris. »', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [CRENEAU] });
    await stub(page, '**/api/creneaux/c1/reserver', { statut: 409, corps: { erreur: 'Creneau deja reserve.' } });

    await ouvrirFiche(page);
    await page.getByRole('button', { name: FR['fiche.reserver'] }).click();

    await expect(page.getByText(FR['fiche.creneauPris'])).toBeVisible();
  });

  test('inscription sur la liste d attente : confirmation, lien vers mes listes, bouton retire', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [] });
    await stub(page, '**/api/medecins/m1/liste-attente', {
      statut: 201,
      corps: { id: 'i1', patientId: 'p1', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' },
    });

    await ouvrirFiche(page);
    await page.getByRole('button', { name: FR['fiche.mInscrire'] }).click();

    await expect(page.getByText(FR['fiche.inscrit'])).toBeVisible();
    await expect(page.locator('main a[href="/liste-attente"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: FR['fiche.mInscrire'] })).toHaveCount(0);
  });

  test('403 a l inscription : « Seul un compte patient peut s inscrire… » et le bouton reste actif', async ({ page }) => {
    await connecter(page, { roles: ['MEDECIN'] });
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [] });
    await stub(page, '**/api/medecins/m1/liste-attente', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrirFiche(page);
    await page.getByRole('button', { name: FR['fiche.mInscrire'] }).click();

    await expect(page.getByText(FR['fiche.inscriptionPatient'])).toBeVisible();
    await expect(page.getByRole('button', { name: FR['fiche.mInscrire'] })).toBeEnabled();
  });

  test('non connecte : « Écrire au médecin » et l inscription envoient vers la connexion, sans appeler l API', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/medecins/m1/creneaux', { corps: [] });

    await ouvrirFiche(page);
    await page.getByRole('button', { name: FR['fiche.ecrire'] }).click();

    await page.waitForURL((url) => url.href.startsWith(`${ISSUER_SIMULE}/protocol/openid-connect/auth`));
    expect(journal.contient('/api/conversations', 'POST')).toBe(false);
    expect(journal.contient('/api/medecins/m1/liste-attente', 'POST')).toBe(false);
  });

  test('praticien inconnu : message, titre « Praticien introuvable » et noindex', async ({ page }) => {
    const reponse = await ouvrir(page, '/medecins/inconnu-xyz');

    expect(reponse?.status()).toBe(404);
    await expect(page.getByText(/Praticien introuvable/)).toBeVisible();
    await expect(page).toHaveTitle(`${FR['seo.fiche.introuvable']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('fiche indexable : titre, description et canonique construits avec les valeurs de l API', async ({ page }) => {
    await ouvrir(page, '/medecins/m1');

    await expect(page).toHaveTitle('Dr Amina Belkacem, Généraliste à Alger | Tabibi');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Prenez rendez-vous avec Dr Amina Belkacem, généraliste à Alger \(Alger\)/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${URL_WEB}/medecins/m1`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
});
