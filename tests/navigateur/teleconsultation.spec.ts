import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { accepterConfirmations, connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Teleconsultations (TeleconsultationService) : suivi et consentement du patient, planification depuis l'agenda
 * du medecin, puis demarrage, cloture et annulation. `salleAccessible` est verifie dans `logique`.
 */
const PLANIFIEE = {
  id: 't1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  statut: 'PLANIFIEE',
  consentementPatientLe: null as string | null,
  lienSalle: null as string | null,
  creeLe: '2026-09-18T10:00:00Z',
  demarreeLe: null,
  termineeLe: null,
};

const CONSENTIE = {
  ...PLANIFIEE,
  consentementPatientLe: '2026-09-18T10:05:00Z',
  lienSalle: 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef',
};

const RENDEZ_VOUS_CONFIRME = {
  id: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  debut: '2026-12-07T09:00:00Z',
  statut: 'CONFIRME',
  creneauId: 'c1',
};

test.describe('Appels API des teleconsultations', () => {
  test('patient : GET /api/teleconsultations/mes puis consentement sans corps, qui remet le lien de salle', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'p1', roles: ['PATIENT'] });
    await stub(page, '**/api/teleconsultations/mes', { corps: [PLANIFIEE] });
    await stub(page, '**/api/rendezvous/mes', { corps: [RENDEZ_VOUS_CONFIRME] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/teleconsultations/t1/consentir', { corps: CONSENTIE });

    await ouvrir(page, '/teleconsultations');

    const liste = await journal.attendre('/api/teleconsultations/mes');
    expect(liste.chemin).toBe('/api/teleconsultations/mes');

    await page.getByRole('button', { name: FR['teleconsultation.jeConsens'] }).click();

    const consentement = await journal.attendre('/api/teleconsultations/t1/consentir', 'POST');
    expect(consentement.corps).toBeNull();
    await expect(page.getByRole('link', { name: FR['teleconsultation.rejoindre'] })).toHaveAttribute('href', CONSENTIE.lienSalle);
  });

  test('medecin : planifie par POST /api/medecin/teleconsultations avec { rendezVousId } depuis l agenda', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [RENDEZ_VOUS_CONFIRME] });
    await stub(page, '**/api/medecin/teleconsultations', { statut: 201, corps: PLANIFIEE });

    await ouvrir(page, '/medecin/agenda');
    await page.getByRole('button', { name: FR['agenda.proposerTeleconsultation'] }).click();

    const envoi = await journal.attendre('/api/medecin/teleconsultations', 'POST');
    expect(envoi.corps).toEqual({ rendezVousId: 'r1' });
  });

  test('medecin : GET /api/medecin/teleconsultations, puis demarrer, terminer et annuler sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [RENDEZ_VOUS_CONFIRME] });
    await stub(page, '**/api/medecin/teleconsultations', { corps: [CONSENTIE] });
    await stub(page, '**/api/teleconsultations/t1/demarrer', { corps: { ...CONSENTIE, statut: 'EN_COURS' } });
    await stub(page, '**/api/teleconsultations/t1/terminer', { corps: { ...CONSENTIE, statut: 'TERMINEE' } });

    await ouvrir(page, '/medecin/teleconsultations');

    const liste = await journal.attendre('/api/medecin/teleconsultations');
    expect(liste.chemin).toBe('/api/medecin/teleconsultations');

    await page.getByRole('button', { name: FR['teleconsultationMedecin.demarrer'] }).click();
    const demarrage = await journal.attendre('/api/teleconsultations/t1/demarrer', 'POST');
    expect(demarrage.corps).toBeNull();

    await page.getByRole('button', { name: FR['teleconsultationMedecin.terminer'] }).click();
    const cloture = await journal.attendre('/api/teleconsultations/t1/terminer', 'POST');
    expect(cloture.corps).toBeNull();
  });

  test('medecin : annule une teleconsultation planifiee par POST /api/teleconsultations/{id}/annuler', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [RENDEZ_VOUS_CONFIRME] });
    await stub(page, '**/api/medecin/teleconsultations', { corps: [PLANIFIEE] });
    await stub(page, '**/api/teleconsultations/t1/annuler', { corps: { ...PLANIFIEE, statut: 'ANNULEE' } });

    const confirmations = accepterConfirmations(page);

    await ouvrir(page, '/medecin/teleconsultations');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    expect(confirmations).toContain(FR['teleconsultationMedecin.confirmerAnnulation']);

    const annulation = await journal.attendre('/api/teleconsultations/t1/annuler', 'POST');
    expect(annulation.corps).toBeNull();
  });

  test('409 au demarrage (patient sans consentement) : le motif de l API est affiche', async ({ page }) => {
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [RENDEZ_VOUS_CONFIRME] });
    await stub(page, '**/api/medecin/teleconsultations', { corps: [CONSENTIE] });
    await stub(page, '**/api/teleconsultations/t1/demarrer', { statut: 409, corps: { erreur: "Le patient n'a pas consenti." } });

    await ouvrir(page, '/medecin/teleconsultations');
    await page.getByRole('button', { name: FR['teleconsultationMedecin.demarrer'] }).click();

    await expect(page.getByText("Le patient n'a pas consenti.")).toBeVisible();
  });
});

test.describe('Écran de mes teleconsultations (patient)', () => {
  test.beforeEach(async ({ page }) => {
    await connecter(page, { sujet: 'p1', roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [RENDEZ_VOUS_CONFIRME] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });
  });

  test('encart de consentement, sans lien de salle, tant que le patient n a pas consenti', async ({ page }) => {
    await stub(page, '**/api/teleconsultations/mes', { corps: [PLANIFIEE] });

    await ouvrir(page, '/teleconsultations');

    await expect(page.getByText(FR['teleconsultation.consentementTexte'])).toBeVisible();
    await expect(page.getByRole('button', { name: FR['teleconsultation.jeConsens'] })).toBeVisible();
    await expect(page.getByRole('link', { name: FR['teleconsultation.rejoindre'] })).toHaveCount(0);
    await expect(page.getByText('Planifiée')).toBeVisible();
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
    await expect(page.getByText(/Rendez-vous du/)).toBeVisible();
    await expect(page.getByText(/7 décembre/)).toBeVisible();
  });

  test('apres le consentement : lien « Rejoindre » dans un nouvel onglet, avec noopener', async ({ page }) => {
    await stub(page, '**/api/teleconsultations/mes', { corps: [PLANIFIEE] });
    await stub(page, '**/api/teleconsultations/t1/consentir', { corps: CONSENTIE });

    await ouvrir(page, '/teleconsultations');
    await page.getByRole('button', { name: FR['teleconsultation.jeConsens'] }).click();

    const lien = page.getByRole('link', { name: FR['teleconsultation.rejoindre'] });
    await expect(lien).toHaveAttribute('href', CONSENTIE.lienSalle);
    await expect(lien).toHaveAttribute('target', '_blank');
    await expect(lien).toHaveAttribute('rel', 'noopener');
    await expect(page.getByText(FR['teleconsultation.consentementTexte'])).toHaveCount(0);
    await expect(page.getByText(/consentement donné le/)).toBeVisible();
  });

  test('consentement deja donne : lien direct ; teleconsultation terminee : aucun lien', async ({ page }) => {
    await stub(page, '**/api/teleconsultations/mes', { corps: [CONSENTIE] });

    await ouvrir(page, '/teleconsultations');
    await expect(page.getByRole('link', { name: FR['teleconsultation.rejoindre'] })).toHaveCount(1);
    await expect(page.getByText(FR['teleconsultation.consentementTexte'])).toHaveCount(0);

    await stub(page, '**/api/teleconsultations/mes', { corps: [{ ...CONSENTIE, statut: 'TERMINEE' }] });
    await ouvrir(page, '/teleconsultations');
    await expect(page.getByRole('link', { name: FR['teleconsultation.rejoindre'] })).toHaveCount(0);
  });

  test('409 au consentement : le motif de l API est affiche et la liste est relue', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/teleconsultations/mes', { corps: [PLANIFIEE] });
    await stub(page, '**/api/teleconsultations/t1/consentir', {
      statut: 409,
      corps: { erreur: 'Cette teleconsultation est annulee.' },
    });

    await ouvrir(page, '/teleconsultations');
    await journal.attendre('/api/teleconsultations/mes');
    await page.getByRole('button', { name: FR['teleconsultation.jeConsens'] }).click();

    await expect(page.getByText('Cette teleconsultation est annulee.')).toBeVisible();
    await expect.poll(() => journal.filtrer('/api/teleconsultations/mes').length).toBe(2);
  });

  test('aucune teleconsultation : message dedie et aucun rendez-vous relu', async ({ page }) => {
    const journal = requetes(page);
    await stub(page, '**/api/teleconsultations/mes', { corps: [] });

    await ouvrir(page, '/teleconsultations');
    await journal.attendre('/api/teleconsultations/mes');

    await expect(page.getByText(FR['teleconsultation.aucune'])).toBeVisible();
    expect(journal.contient('/api/rendezvous/mes')).toBe(false);
  });

  test('403 : « Cette page est réservée aux patients. »', async ({ page }) => {
    await stub(page, '**/api/teleconsultations/mes', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/teleconsultations');

    await expect(page.getByText(FR['commun.reservePatients'])).toBeVisible();
  });
});

test.describe('Écran des teleconsultations sans connexion', () => {
  test('non connecte : redirection vers la connexion, sans lire les teleconsultations', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/teleconsultations');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/teleconsultations/mes')).toBe(false);
  });
});
