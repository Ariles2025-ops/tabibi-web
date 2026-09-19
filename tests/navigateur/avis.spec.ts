import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Avis (AvisService) : ce que l'application envoie reellement a l'API depuis les ecrans qui l'utilisent
 * (depot par le patient, mes avis, synthese et signalement cote medecin, moderation cote administrateur) et ce
 * qu'elle affiche des erreurs { erreur } renvoyees. Les libelles et formats sont verifies dans `logique`.
 */

const AVIS = {
  id: 'a1',
  rendezVousId: 'r1',
  medecinId: 'm1',
  note: 5,
  commentaire: 'Très bon accueil.',
  statut: 'PUBLIE',
  deposeLe: '2026-09-18T10:00:00Z',
};

const SYNTHESE = {
  moyenne: 4.5,
  nombre: 2,
  avis: [
    { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
    { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
  ],
};

const AVIS_ADMIN = { ...AVIS, patientId: 'p1', statut: 'SIGNALE' };

test.describe('Appels API des avis', () => {
  test('depose un avis par POST /api/avis avec { rendezVousId, note, commentaire }', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [] });
    await stub(page, '**/api/avis', { statut: 201, corps: AVIS });

    await ouvrir(page, '/avis/nouveau/r1');

    await page.getByLabel(FR['avis.noteAria'].replace('{n}', '5')).click();
    await page.locator('textarea[name="commentaire"]').fill('Très bon accueil.');
    await page.getByRole('button', { name: FR['avis.envoyer'] }).click();

    const envoi = await journal.attendre('/api/avis', 'POST');
    expect(envoi.chemin).toBe('/api/avis');
    expect(envoi.corps).toEqual({ rendezVousId: 'r1', note: 5, commentaire: 'Très bon accueil.' });
    await expect(page.getByText(FR['avis.merci'])).toBeVisible();
  });

  test('envoie un commentaire null quand il n est pas renseigne', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [] });
    await stub(page, '**/api/avis', { statut: 201, corps: { ...AVIS, note: 4, commentaire: null } });

    await ouvrir(page, '/avis/nouveau/r1');
    await page.getByLabel(FR['avis.noteAria'].replace('{n}', '4')).click();
    await page.getByRole('button', { name: FR['avis.envoyer'] }).click();

    const envoi = await journal.attendre('/api/avis', 'POST');
    expect(envoi.corps).toEqual({ rendezVousId: 'r1', note: 4, commentaire: null });
  });

  test('409 au depot : « Vous avez déjà donné votre avis pour ce rendez-vous. »', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/rendezvous/mes', { corps: [] });
    await stub(page, '**/api/avis', { statut: 409, corps: { erreur: 'Un avis a deja ete depose pour ce rendez-vous.' } });

    await ouvrir(page, '/avis/nouveau/r1');
    await page.getByLabel(FR['avis.noteAria'].replace('{n}', '5')).click();
    await page.getByRole('button', { name: FR['avis.envoyer'] }).click();

    await expect(page.getByText(FR['avis.dejaDonne'])).toBeVisible();
  });

  test('lit mes avis sur GET /api/avis/mes', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/avis/mes', { corps: [AVIS] });
    await stub(page, '**/api/medecins/m1', { corps: { id: 'm1', nomComplet: 'Dr Amina Belkacem' } });

    await ouvrir(page, '/mes-avis');

    const appel = await journal.attendre('/api/avis/mes');
    expect(appel.chemin).toBe('/api/avis/mes');
    await expect(page.getByText('5 / 5')).toBeVisible();
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
  });

  test('lit la synthese publique sur GET /api/medecins/{id}/avis et signale par POST /api/avis/{id}/signaler', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: 'm1', roles: ['MEDECIN'] });
    await stub(page, '**/api/medecins/m1/avis', { corps: SYNTHESE });
    await stub(page, '**/api/avis/a1/signaler', { corps: { ...AVIS, statut: 'SIGNALE' } });

    await ouvrir(page, '/medecin/avis');

    const synthese = await journal.attendre('/api/medecins/m1/avis');
    expect(synthese.chemin).toBe('/api/medecins/m1/avis');
    await expect(page.getByText('4,5 / 5 (2 avis)')).toBeVisible();

    await page.getByRole('button', { name: FR['avis.signaler'] }).first().click();

    const signalement = await journal.attendre('/api/avis/a1/signaler', 'POST');
    expect(signalement.corps).toBeNull();
    await expect(page.getByText(FR['avis.signale'])).toBeVisible();
  });

  test('moderation : GET /api/admin/avis?statut=, sans parametre pour « Tous », puis masquer et retablir', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/avis**', { corps: [AVIS_ADMIN] });
    await stub(page, '**/api/admin/avis/a1/masquer', { corps: { ...AVIS_ADMIN, statut: 'MASQUE' } });
    await stub(page, '**/api/admin/avis/a1/retablir', { corps: { ...AVIS_ADMIN, statut: 'PUBLIE' } });

    await ouvrir(page, '/admin/avis');

    const filtree = await journal.attendre(/\/api\/admin\/avis\?/);
    expect(filtree.parametres.get('statut')).toBe('SIGNALE');

    // Le journal est vide avant le changement de filtre : le prochain appel vu est bien celui de « Tous ».
    journal.vider();
    await page.locator('select[name="statut"]').selectOption('');
    const toutes = await journal.attendre('/api/admin/avis');
    expect(toutes.url).not.toContain('statut=');

    await page.getByRole('button', { name: FR['moderation.masquer'] }).first().click();
    const masquer = await journal.attendre('/api/admin/avis/a1/masquer', 'POST');
    expect(masquer.corps).toBeNull();

    await page.getByRole('button', { name: FR['moderation.retablir'] }).first().click();
    const retablir = await journal.attendre('/api/admin/avis/a1/retablir', 'POST');
    expect(retablir.corps).toBeNull();
  });
});
