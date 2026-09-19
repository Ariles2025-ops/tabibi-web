import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { accepterConfirmations, connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Mes rendez-vous : liste chronologique, annulation d'un rendez-vous confirme et proposition de deposer un avis
 * sur un rendez-vous honore qui n'en a pas encore.
 */
const CONFIRME = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };
const HONORE = { ...CONFIRME, id: 'r2', debut: '2026-09-01T09:00:00Z', statut: 'HONORE' };
const HONORE_NOTE = { ...CONFIRME, id: 'r3', debut: '2026-08-01T09:00:00Z', statut: 'HONORE' };

const AVIS = { id: 'a1', rendezVousId: 'r3', medecinId: 'm1', note: 5, commentaire: null, statut: 'PUBLIE', deposeLe: '2026-08-02T10:00:00Z' };

const MEDECIN = { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' };

test.describe('Écran de mes rendez-vous', () => {
  test('propose « Donner mon avis » sur les seuls rendez-vous honores sans avis, « Avis donné » sinon', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [CONFIRME, HONORE, HONORE_NOTE] });
    await stub(page, '**/api/avis/mes', { corps: [AVIS] });
    await stub(page, '**/api/medecins/m1', { corps: MEDECIN });

    await ouvrir(page, '/mes-rendez-vous');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(3);
    // Tri chronologique : r3 (aout, deja note), r2 (septembre, honore), r1 (decembre, confirme).
    await expect(lignes.nth(0)).toContainText(FR['rendezVous.avisDonne']);
    await expect(lignes.nth(0).locator('a[href="/avis/nouveau/r3"]')).toHaveCount(0);
    await expect(lignes.nth(1).locator('a[href="/avis/nouveau/r2"]')).toHaveText(FR['rendezVous.donnerAvis']);
    await expect(lignes.nth(2).getByRole('button', { name: FR['commun.annuler'], exact: true })).toBeVisible();
    await expect(lignes.nth(2)).toContainText('Dr Amina Belkacem');
  });

  test('ne lit pas mes avis quand aucun rendez-vous n est honore', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [CONFIRME] });
    await stub(page, '**/api/medecins/m1', { corps: MEDECIN });

    await ouvrir(page, '/mes-rendez-vous');
    await journal.attendre('/api/rendezvous/mes');
    await expect(page.locator('main li')).toHaveCount(1);

    expect(journal.contient('/api/avis/mes')).toBe(false);
    await expect(page.getByText(FR['rendezVous.donnerAvis'])).toHaveCount(0);
  });

  test('annule un rendez-vous confirme par POST /api/rendezvous/{id}/annuler, apres confirmation', async ({ page }) => {
    const journal = requetes(page);
    const confirmations = accepterConfirmations(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [CONFIRME] });
    await stub(page, '**/api/medecins/m1', { corps: MEDECIN });
    await stub(page, '**/api/rendezvous/r1/annuler', { statut: 204, corps: null });

    await ouvrir(page, '/mes-rendez-vous');
    await page.getByRole('button', { name: FR['commun.annuler'], exact: true }).click();

    const annulation = await journal.attendre('/api/rendezvous/r1/annuler', 'POST');
    expect(annulation.corps).toBeNull();
    expect(confirmations).toContain(FR['rendezVous.confirmerAnnulation']);
  });

  test('aucun rendez-vous : message et lien vers l annuaire', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [] });

    await ouvrir(page, '/mes-rendez-vous');

    await expect(page.getByText(FR['rendezVous.aucun'])).toBeVisible();
    await expect(page.locator('main a[href="/"]')).toHaveCount(1);
  });
});
