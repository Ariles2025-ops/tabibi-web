import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { accepterConfirmations, connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Espace medecin (MedecinService) : agenda, ouverture d'un creneau, candidature a l'annuaire et cabinet
 * (rattachement et retrait d'une secretaire). Les bornes de duree et `estUuid` sont verifies dans `logique`.
 */
const DEMANDE_CANDIDATURE = {
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
};

const CANDIDATURE = {
  id: 'c1',
  medecinId: 'm1',
  ...DEMANDE_CANDIDATURE,
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

const CONFIRME = {
  id: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  debut: '2026-12-07T09:00:00Z',
  statut: 'CONFIRME',
  creneauId: 'c1',
};

const SECRETAIRE_ID = '55555555-5555-5555-5555-555555555555';
const RATTACHEMENT = { id: 'ra1', medecinId: 'm1', secretaireId: SECRETAIRE_ID, creeLe: '2026-09-18T10:00:00Z' };

test.describe('Appels API de l espace medecin', () => {
  test('agenda : GET /api/medecin/rendezvous, puis honorer et annuler sans corps', async ({ page }) => {
    const journal = requetes(page);
    const confirmations = accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/rendezvous/r1/honorer', { statut: 204, corps: null });
    await stub(page, '**/api/medecin/rendezvous/r1/annuler', { corps: { ...CONFIRME, statut: 'ANNULE' } });

    await ouvrir(page, '/medecin/agenda');

    const agenda = await journal.attendre('/api/medecin/rendezvous');
    expect(agenda.chemin).toBe('/api/medecin/rendezvous');

    await page.getByRole('button', { name: FR['agenda.marquerHonore'] }).click();
    const honorer = await journal.attendre('/api/rendezvous/r1/honorer', 'POST');
    expect(honorer.corps).toBeNull();

    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();
    const annuler = await journal.attendre('/api/medecin/rendezvous/r1/annuler', 'POST');
    expect(annuler.corps).toBeNull();
    expect(confirmations).toContain(FR['agenda.confirmerAnnulation']);
  });

  test('409 a l annulation : le message { erreur } de l API est affiche', async ({ page }) => {
    accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/rendezvous', { corps: [CONFIRME] });
    await stub(page, '**/api/medecin/rendezvous/r1/annuler', {
      statut: 409,
      corps: { erreur: 'Seul un rendez-vous confirme peut etre annule.' },
    });

    await ouvrir(page, '/medecin/agenda');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    await expect(page.getByText('Seul un rendez-vous confirme peut etre annule.')).toBeVisible();
  });

  test('ouvre un creneau par POST /api/medecin/creneaux avec { debut, dureeMinutes }', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/creneaux', {
      statut: 201,
      corps: { id: 'c2', medecinId: 'm1', debut: '2026-12-08T09:00:00Z', dureeMinutes: 30, disponible: true },
    });

    await ouvrir(page, '/medecin/disponibilites');
    await page.getByLabel(FR['disponibilites.dateHeure']).fill('2026-12-08T09:00');
    await page.getByLabel(/Durée \(minutes/).fill('30');
    await page.getByRole('button', { name: FR['disponibilites.ouvrir'] }).click();

    const envoi = await journal.attendre('/api/medecin/creneaux', 'POST');
    const corps = envoi.corps as { debut: string; dureeMinutes: number };
    expect(corps.dureeMinutes).toBe(30);
    // La saisie est locale (Africa/Algiers, UTC+1) : l'API recoit une date ISO en UTC.
    expect(corps.debut).toBe('2026-12-08T08:00:00.000Z');
  });

  test('candidature : GET /api/medecin/candidature (404 sans depot) puis POST avec tous les champs', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/candidature', (requete) =>
      requete.method() === 'POST'
        ? { statut: 201, corps: CANDIDATURE }
        : { statut: 404, corps: { erreur: 'Aucune candidature deposee.' } },
    );

    await ouvrir(page, '/medecin/candidature');

    const lecture = await journal.attendre('/api/medecin/candidature');
    expect(lecture.chemin).toBe('/api/medecin/candidature');

    await page.getByLabel(FR['candidature.nomComplet']).fill(DEMANDE_CANDIDATURE.nomComplet);
    await page.getByLabel(FR['candidature.numeroOrdreLabel']).fill(DEMANDE_CANDIDATURE.numeroOrdre);
    await page.getByLabel(FR['candidature.specialiteCode']).fill(DEMANDE_CANDIDATURE.specialiteSlug);
    await page.getByLabel(FR['candidature.specialiteLibelle']).fill(DEMANDE_CANDIDATURE.specialiteFr);
    await page.getByLabel(FR['candidature.wilayaCode']).fill(DEMANDE_CANDIDATURE.wilayaCode);
    await page.getByLabel(FR['candidature.wilayaLibelle']).fill(DEMANDE_CANDIDATURE.wilayaFr);
    await page.getByLabel(FR['candidature.ville']).fill(DEMANDE_CANDIDATURE.ville);
    await page.getByLabel(FR['candidature.telephone']).fill(DEMANDE_CANDIDATURE.telephone);
    await page.getByRole('button', { name: FR['candidature.deposer'] }).click();

    const envoi = await journal.attendre('/api/medecin/candidature', 'POST');
    expect(envoi.corps).toEqual(DEMANDE_CANDIDATURE);
  });

  test('cabinet : GET /api/medecin/secretaires, rattachement avec { secretaireId } et retrait sans corps', async ({ page }) => {
    const journal = requetes(page);
    const confirmations = accepterConfirmations(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/secretaires', (requete) =>
      requete.method() === 'POST' ? { statut: 201, corps: RATTACHEMENT } : { corps: [RATTACHEMENT] },
    );
    await stub(page, '**/api/medecin/secretaires/ra1/retirer', { statut: 204, corps: null });

    await ouvrir(page, '/medecin/secretaires');

    const liste = await journal.attendre('/api/medecin/secretaires');
    expect(liste.chemin).toBe('/api/medecin/secretaires');

    await page.getByLabel(FR['secretaires.identifiant']).fill(SECRETAIRE_ID);
    await page.getByRole('button', { name: FR['secretaires.rattacher'] }).click();
    const rattachement = await journal.attendre('/api/medecin/secretaires', 'POST');
    expect(rattachement.corps).toEqual({ secretaireId: SECRETAIRE_ID });

    await page.getByRole('button', { name: FR['commun.retirer'], exact: true }).click();
    const retrait = await journal.attendre('/api/medecin/secretaires/ra1/retirer', 'POST');
    expect(retrait.corps).toBeNull();
    expect(confirmations).toContain(FR['secretaires.confirmerRetrait']);
  });

  test('liste d attente du medecin : GET /api/medecin/liste-attente', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecin/liste-attente', {
      corps: [{ id: 'i1', patientId: '22222222-2222-2222-2222-222222222222', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' }],
    });

    await ouvrir(page, '/medecin/liste-attente');

    const appel = await journal.attendre('/api/medecin/liste-attente');
    expect(appel.chemin).toBe('/api/medecin/liste-attente');
    await expect(page.getByText('22222222')).toBeVisible();
  });
});
