import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Administration (AdminService) : candidatures filtrees par statut, validation, refus motive, statistiques du
 * tableau de bord et declenchement manuel des rappels. Les libelles de statut sont verifies dans `logique`.
 */
const EN_ATTENTE = {
  id: 'c1',
  medecinId: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
  statut: 'EN_ATTENTE',
  motifRefus: null as string | null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null as string | null,
};

test.describe('Appels API de l administration', () => {
  test('liste les candidatures sur GET /api/admin/candidatures?statut=, sans parametre pour « Toutes »', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });

    await ouvrir(page, '/admin/candidatures');

    const filtree = await journal.attendre(/\/api\/admin\/candidatures\?/);
    expect(filtree.parametres.get('statut')).toBe('EN_ATTENTE');
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();

    // Le journal est vide avant le changement de filtre : le prochain appel vu est bien celui de « Toutes ».
    journal.vider();
    await page.locator('select[name="statut"]').selectOption('');
    const toutes = await journal.attendre('/api/admin/candidatures');
    expect(toutes.url).not.toContain('statut=');
  });

  test('valide par POST /api/admin/candidatures/{id}/valider sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });
    await stub(page, '**/api/admin/candidatures/c1/valider', {
      corps: { ...EN_ATTENTE, statut: 'VALIDEE', traiteeLe: '2026-09-18T12:00:00Z' },
    });

    await ouvrir(page, '/admin/candidatures');
    await page.getByRole('button', { name: FR['candidatures.valider'] }).click();

    const validation = await journal.attendre('/api/admin/candidatures/c1/valider', 'POST');
    expect(validation.corps).toBeNull();
  });

  test('refuse par POST /api/admin/candidatures/{id}/refuser avec { motif }', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });
    await stub(page, '**/api/admin/candidatures/c1/refuser', {
      corps: { ...EN_ATTENTE, statut: 'REFUSEE', motifRefus: "Numéro d'ordre invalide", traiteeLe: '2026-09-18T12:00:00Z' },
    });

    await ouvrir(page, '/admin/candidatures');
    await page.getByPlaceholder(FR['candidatures.motifPlaceholder']).fill("Numéro d'ordre invalide");
    await page.getByRole('button', { name: FR['candidatures.refuser'] }).click();

    const refus = await journal.attendre('/api/admin/candidatures/c1/refuser', 'POST');
    expect(refus.corps).toEqual({ motif: "Numéro d'ordre invalide" });
  });

  test('409 a la validation : le message { erreur } de l API est affiche', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });
    await stub(page, '**/api/admin/candidatures/c1/valider', {
      statut: 409,
      corps: { erreur: 'Seule une candidature en attente peut etre validee.' },
    });

    await ouvrir(page, '/admin/candidatures');
    await page.getByRole('button', { name: FR['candidatures.valider'] }).click();

    await expect(page.getByText('Seule une candidature en attente peut etre validee.')).toBeVisible();
  });

  test('tableau de bord : GET /api/admin/statistiques puis POST /api/admin/rappels/executer sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/statistiques', { corps: { candidaturesEnAttente: 2, candidaturesValidees: 5, candidaturesRefusees: 1 } });
    await stub(page, '**/api/admin/rappels/executer', { corps: { nombre: 3 } });

    await ouvrir(page, '/admin');

    const statistiques = await journal.attendre('/api/admin/statistiques');
    expect(statistiques.chemin).toBe('/api/admin/statistiques');
    await expect(page.getByText('2', { exact: true })).toBeVisible();
    await expect(page.getByText('5', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: FR['admin.rappelsExecuter'] }).click();

    const rappels = await journal.attendre('/api/admin/rappels/executer', 'POST');
    expect(rappels.corps).toBeNull();
    await expect(page.getByText('3 rappels envoyés')).toBeVisible();
  });
});
