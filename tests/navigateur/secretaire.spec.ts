import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { accepterConfirmations, connecter, ouvrir, refuserConfirmations, requetes, stub } from '../outils';

/**
 * Espace secretaire (SecretaireService) : cabinets rattaches, agenda d'un medecin, ouverture d'un creneau pour
 * lui, rendez-vous honores ou annules, et erreurs 403 (cabinet non rattache) et 409 (rendez-vous non confirme).
 */
const RATTACHEMENT = { id: 'ra1', medecinId: 'm1', secretaireId: 's1', creeLe: '2026-09-18T10:00:00Z' };

const CONFIRME = {
  id: 'r1',
  patientId: '22222222-2222-2222-2222-222222222222',
  medecinId: 'm1',
  debut: '2026-12-07T09:00:00Z',
  statut: 'CONFIRME',
  creneauId: 'c1',
};

/** Ouvre l'espace secretaire et choisit le cabinet du medecin m1. */
async function ouvrirCabinet(page: import('@playwright/test').Page) {
  await ouvrir(page, '/secretaire');
  await page.locator('select[name="medecinId"]').selectOption('m1');
}

test.describe('Appels API de l espace secretaire', () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
  });

  test('lit mes cabinets sur GET /api/secretaire/medecins et l agenda du medecin choisi', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME] });

    await ouvrirCabinet(page);

    const cabinets = await journal.attendre('/api/secretaire/medecins');
    expect(cabinets.chemin).toBe('/api/secretaire/medecins');
    const agenda = await journal.attendre('/api/secretaire/medecins/m1/rendezvous');
    expect(agenda.chemin).toBe('/api/secretaire/medecins/m1/rendezvous');
    await expect(page.getByText('22222222')).toBeVisible();
  });

  test('ouvre un creneau par POST /api/secretaire/medecins/{id}/creneaux avec { debut, dureeMinutes }', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [] });
    await stub(page, '**/api/secretaire/medecins/m1/creneaux', {
      statut: 201,
      corps: { id: 'c2', medecinId: 'm1', debut: '2026-12-08T09:00:00Z', dureeMinutes: 30, disponible: true },
    });

    await ouvrirCabinet(page);
    await page.getByLabel(FR['disponibilites.dateHeure']).fill('2026-12-08T09:00');
    await page.getByLabel(/Durée \(minutes/).fill('30');
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();

    const envoi = await journal.attendre('/api/secretaire/medecins/m1/creneaux', 'POST');
    const corps = envoi.corps as { debut: string; dureeMinutes: number };
    expect(corps.dureeMinutes).toBe(30);
    expect(corps.debut).toBe('2026-12-08T08:00:00.000Z');
  });

  test('honore et annule par POST /api/secretaire/rendezvous/{id}/... sans corps', async ({ page }) => {
    const journal = requetes(page);
    accepterConfirmations(page);
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/secretaire/rendezvous/r1/honorer', { corps: { ...CONFIRME, statut: 'HONORE' } });
    await stub(page, '**/api/secretaire/rendezvous/r1/annuler', { corps: { ...CONFIRME, statut: 'ANNULE' } });

    await ouvrirCabinet(page);

    await page.getByRole('button', { name: FR['agenda.marquerHonore'] }).click();
    const honorer = await journal.attendre('/api/secretaire/rendezvous/r1/honorer', 'POST');
    expect(honorer.corps).toBeNull();

    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();
    const annuler = await journal.attendre('/api/secretaire/rendezvous/r1/annuler', 'POST');
    expect(annuler.corps).toBeNull();
  });

  test('403 sur l agenda (cabinet non rattache) et 409 a la mise a jour : les motifs sont affiches', async ({ page }) => {
    accepterConfirmations(page);
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', {
      statut: 403,
      corps: { erreur: 'Cette secretaire n est pas rattachee a ce medecin.' },
    });

    await ouvrirCabinet(page);
    await expect(page.getByText(FR['espaceSecretaire.cabinetNonRattache'])).toBeVisible();

    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/secretaire/rendezvous/r1/honorer', {
      statut: 409,
      corps: { erreur: 'Seul un rendez-vous confirme peut etre honore.' },
    });
    await page.locator('select[name="medecinId"]').selectOption('');
    await page.locator('select[name="medecinId"]').selectOption('m1');
    await page.getByRole('button', { name: FR['agenda.marquerHonore'] }).click();

    await expect(page.getByText('Seul un rendez-vous confirme peut etre honore.')).toBeVisible();
  });
});

const HONORE = { ...CONFIRME, id: 'r2', debut: '2026-09-01T09:00:00Z', statut: 'HONORE' };
// Rattachement plus recent : les cabinets sont proposes du plus ancien rattachement au plus recent.
const AUTRE_CABINET = { id: 'ra2', medecinId: 'm2', secretaireId: 's1', creeLe: '2026-09-20T10:00:00Z' };

test.describe('Écran de l espace secretaire', () => {
  test('un seul cabinet : choisi d office, agenda affiche, actions sur les seuls CONFIRME', async ({ page }) => {
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME, HONORE] });

    await ouvrir(page, '/secretaire');

    await expect(page.locator('select[name="medecinId"]')).toHaveValue('m1');
    await expect(page.locator('select[name="medecinId"] option')).toHaveText([
      FR['espaceSecretaire.choisirMedecin'],
      'Dr Amina Belkacem',
    ]);
    const lignes = page.locator('main ul li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('Honoré');
    await expect(lignes.nth(0).getByRole('button')).toHaveCount(0);
    await expect(lignes.nth(1)).toContainText('Confirmé');
    await expect(lignes.nth(1)).toContainText('Patient 22222222');
    await expect(lignes.nth(1)).not.toContainText('22222222-2222');
    await expect(lignes.nth(1).getByRole('button', { name: FR['agenda.marquerHonore'] })).toHaveCount(1);
    await expect(lignes.nth(1).getByRole('button', { name: FR['commun.annuler'], exact: true })).toHaveCount(1);
  });

  test('plusieurs cabinets : rien n est charge avant le choix, puis l agenda du medecin choisi', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT, AUTRE_CABINET] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/medecins/m2', { corps: { id: 'm2', nomComplet: 'Dr Karim Haddad' } });
    await stub(page, '**/api/secretaire/medecins/m2/rendezvous', { corps: [CONFIRME, HONORE] });

    await ouvrir(page, '/secretaire');

    await expect(page.locator('select[name="medecinId"] option')).toHaveText([
      FR['espaceSecretaire.choisirMedecin'],
      'Dr Amina Belkacem',
      'Dr Karim Haddad',
    ]);
    expect(journal.contient('/rendezvous')).toBe(false);
    await expect(page.locator('main form')).toHaveCount(0);

    await page.locator('select[name="medecinId"]').selectOption('m2');

    const agenda = await journal.attendre('/api/secretaire/medecins/m2/rendezvous');
    expect(agenda.chemin).toBe('/api/secretaire/medecins/m2/rendezvous');
    await expect(page.locator('main form')).toHaveCount(1);
    await expect(page.locator('main ul li')).toHaveCount(2);
  });

  test('« Marquer honoré » : confirmation datee et agenda relu', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/secretaire/rendezvous/r1/honorer', { corps: { ...CONFIRME, statut: 'HONORE' } });

    await ouvrir(page, '/secretaire');
    await journal.attendre('/api/secretaire/medecins/m1/rendezvous');
    await page.getByRole('button', { name: FR['agenda.marquerHonore'] }).click();

    await expect(page.getByText(/marqué honoré/)).toBeVisible();
    await expect(page.getByText(/7 décembre/).first()).toBeVisible();
    await expect.poll(() => journal.filtrer('/api/secretaire/medecins/m1/rendezvous').length).toBe(2);
  });

  test('« Annuler » : sans confirmation rien ne part ; apres confirmation, le patient est prevenu', async ({ page }) => {
    const journal = requetes(page);
    const refus = refuserConfirmations(page);
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME] });

    await ouvrir(page, '/secretaire');
    await journal.attendre('/api/secretaire/medecins/m1/rendezvous');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    await expect.poll(() => refus.length).toBe(1);
    expect(journal.contient('/api/secretaire/rendezvous/r1/annuler', 'POST')).toBe(false);
  });

  test('annulation confirmee : message « le patient est prévenu » et agenda relu', async ({ page }) => {
    const journal = requetes(page);
    accepterConfirmations(page);
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/secretaire/rendezvous/r1/annuler', { corps: { ...CONFIRME, statut: 'ANNULE' } });

    await ouvrir(page, '/secretaire');
    await journal.attendre('/api/secretaire/medecins/m1/rendezvous');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    await expect(page.getByText(/annulé : le patient est prévenu/)).toBeVisible();
    await expect.poll(() => journal.filtrer('/api/secretaire/medecins/m1/rendezvous').length).toBe(2);
  });

  test('creneau ouvert : confirmation datee ; duree hors bornes : formulaire non soumis ; 400 : motif', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [] });
    await stub(page, '**/api/secretaire/medecins/m1/creneaux', {
      statut: 201,
      corps: { id: 'c2', medecinId: 'm1', debut: '2026-12-08T08:00:00Z', dureeMinutes: 20, disponible: true },
    });

    await ouvrir(page, '/secretaire');
    await page.getByLabel(FR['disponibilites.dateHeure']).fill('2026-12-08T09:00');
    await page.getByLabel(/Durée \(minutes/).fill('180');
    // Bornes du champ (5..120) : la soumission est bloquee avant tout appel.
    await expect(page.getByRole('button', { name: FR['disponibilites.ouvrir'] })).toBeDisabled();
    expect(journal.contient('/api/secretaire/medecins/m1/creneaux', 'POST')).toBe(false);

    await page.getByLabel(/Durée \(minutes/).fill('20');
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();
    await expect(page.getByText(/Créneau ouvert le/)).toBeVisible();
    await expect(page.getByText(/\(20 min\)/)).toBeVisible();

    await stub(page, '**/api/secretaire/medecins/m1/creneaux', {
      statut: 400,
      corps: { erreur: 'Le creneau doit commencer dans le futur.' },
    });
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();
    await expect(page.getByText('Le creneau doit commencer dans le futur.')).toBeVisible();
  });

  test('aucun rattachement : explication et aucun selecteur ; 403 sur les cabinets : reserve aux secretaires', async ({ page }) => {
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [] });

    await ouvrir(page, '/secretaire');
    await expect(page.getByText(FR['espaceSecretaire.aucunRattachement'])).toBeVisible();
    await expect(page.locator('select[name="medecinId"]')).toHaveCount(0);

    await stub(page, '**/api/secretaire/medecins', { statut: 403, corps: { erreur: 'Acces refuse.' } });
    await ouvrir(page, '/secretaire');
    await expect(page.getByText(FR['commun.reserveSecretaires'])).toBeVisible();
  });

  test('401 sur les cabinets : retour vers la page de connexion', async ({ page }) => {
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { statut: 401, corps: { erreur: 'Non authentifié' } });

    await page.goto('/secretaire');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
  });

  test('aucun rendez-vous dans l agenda : message dedie', async ({ page }) => {
    await connecter(page, { sujet: 's1', roles: ['SECRETAIRE'] });
    await stub(page, '**/api/secretaire/medecins', { corps: [RATTACHEMENT] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/secretaire/medecins/m1/rendezvous', { corps: [] });

    await ouvrir(page, '/secretaire');

    await expect(page.getByText(FR['espaceSecretaire.aucunRendezVous'])).toBeVisible();
  });
});
