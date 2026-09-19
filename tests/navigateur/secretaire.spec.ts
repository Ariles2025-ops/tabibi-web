import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { accepterConfirmations, connecter, ouvrir, requetes, stub } from '../outils';

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
