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

const REFUSEE = {
  ...EN_ATTENTE,
  id: 'c2',
  nomComplet: 'Dr Karim Haddad',
  statut: 'REFUSEE',
  motifRefus: 'Numéro d’ordre introuvable.',
  traiteeLe: '2026-09-19T12:00:00Z',
};

test.describe('Écran des candidatures', () => {
  test('liste par defaut les candidatures en attente, « Valider » actif et « Refuser » inactif', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });

    await ouvrir(page, '/admin/candidatures');

    // Porte sur la carte de la candidature : les libelles du filtre contiennent les memes mots.
    const carte = page.locator('main li').first();
    await expect(carte).toContainText('Dr Amina Belkacem');
    await expect(carte).toContainText('En attente');
    await expect(carte).toContainText("Cardiologue · Alger (Alger) · N° d'ordre ORD-123 · 0550000000");
    await expect(carte).toContainText('18 septembre 2026');
    await expect(page.getByRole('button', { name: FR['candidatures.valider'] })).toBeEnabled();
    await expect(page.getByRole('button', { name: FR['candidatures.refuser'] })).toBeDisabled();
  });

  test('candidature refusee : motif affiche, date de traitement, aucun bouton', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [REFUSEE] });

    await ouvrir(page, '/admin/candidatures');
    await page.locator('select[name="statut"]').selectOption('REFUSEE');

    const carte = page.locator('main li').first();
    await expect(carte).toContainText('Dr Karim Haddad');
    await expect(carte).toContainText('Refusée');
    await expect(carte).toContainText(FR['candidatures.motifRefus'].replace('{motif}', 'Numéro d’ordre introuvable.'));
    await expect(carte).toContainText('traitée le');
    await expect(page.getByRole('button', { name: FR['candidatures.valider'] })).toHaveCount(0);
    await expect(page.getByRole('button', { name: FR['candidatures.refuser'] })).toHaveCount(0);
  });

  test('validation : confirmation nominative et liste rechargee', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });
    await stub(page, '**/api/admin/candidatures/c1/valider', { corps: { ...EN_ATTENTE, statut: 'VALIDEE' } });

    await ouvrir(page, '/admin/candidatures');
    await journal.attendre(/\/api\/admin\/candidatures\?/);
    await page.getByRole('button', { name: FR['candidatures.valider'] }).click();

    await expect(page.getByText(/Candidature de Dr Amina Belkacem validée/)).toBeVisible();
    await expect.poll(() => journal.filtrer(/\/api\/admin\/candidatures\?/).length).toBe(2);
  });

  test('refus : le bouton s active avec le motif, la confirmation est nominative et la liste rechargee', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });
    await stub(page, '**/api/admin/candidatures/c1/refuser', { corps: { ...REFUSEE, id: 'c1' } });

    await ouvrir(page, '/admin/candidatures');
    await journal.attendre(/\/api\/admin\/candidatures\?/);
    await page.getByPlaceholder(FR['candidatures.motifPlaceholder']).fill('Numéro d’ordre introuvable.');
    const refuser = page.getByRole('button', { name: FR['candidatures.refuser'] });
    await expect(refuser).toBeEnabled();
    await refuser.click();

    await expect(page.getByText(/Candidature de Dr Amina Belkacem refusée/)).toBeVisible();
    await expect.poll(() => journal.filtrer(/\/api\/admin\/candidatures\?/).length).toBe(2);
  });

  test('409 : motif de l API affiche et liste rechargee ; 400 : motif affiche sans rechargement', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [EN_ATTENTE] });
    await stub(page, '**/api/admin/candidatures/c1/valider', {
      statut: 409,
      corps: { erreur: 'Seule une candidature en attente peut etre validee.' },
    });
    await stub(page, '**/api/admin/candidatures/c1/refuser', {
      statut: 400,
      corps: { erreur: 'Le motif du refus est obligatoire.' },
    });

    await ouvrir(page, '/admin/candidatures');
    await journal.attendre(/\/api\/admin\/candidatures\?/);
    await page.getByRole('button', { name: FR['candidatures.valider'] }).click();
    await expect(page.getByText('Seule une candidature en attente peut etre validee.')).toBeVisible();
    await expect.poll(() => journal.filtrer(/\/api\/admin\/candidatures\?/).length).toBe(2);

    journal.vider();
    await page.getByPlaceholder(FR['candidatures.motifPlaceholder']).fill('Motif');
    await page.getByRole('button', { name: FR['candidatures.refuser'] }).click();
    await expect(page.getByText('Le motif du refus est obligatoire.')).toBeVisible();
    expect(journal.filtrer(/\/api\/admin\/candidatures\?/).length).toBe(0);
  });

  test('aucune candidature pour le filtre ; 403 : page reservee a l administrateur', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/candidatures**', { corps: [] });

    await ouvrir(page, '/admin/candidatures');
    await expect(page.getByText(FR['candidatures.aucune'])).toBeVisible();

    await stub(page, '**/api/admin/candidatures**', { statut: 403, corps: { erreur: 'Acces refuse.' } });
    await ouvrir(page, '/admin/candidatures');
    await expect(page.getByText(FR['commun.reserveAdmin'])).toBeVisible();
  });
});

test.describe('Écran de moderation des avis', () => {
  const SIGNALE = {
    id: 'a1',
    rendezVousId: 'r1',
    medecinId: 'm1',
    patientId: 'p1',
    note: 1,
    commentaire: 'Commentaire déplacé.',
    statut: 'SIGNALE',
    deposeLe: '2026-09-18T10:00:00Z',
  };

  test('liste par defaut les avis signales, avec « Masquer » et « Rétablir » et les references', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/avis**', { corps: [SIGNALE] });

    await ouvrir(page, '/admin/avis');

    const carte = page.locator('main li').first();
    await expect(carte).toContainText('1 / 5');
    await expect(carte).toContainText('Signalé');
    await expect(carte).toContainText('Commentaire déplacé.');
    await expect(carte).toContainText('18 septembre 2026');
    await expect(carte).toContainText('Médecin m1 · Patient p1 · Rendez-vous r1');
    await expect(page.getByRole('button', { name: FR['moderation.masquer'] })).toBeVisible();
    await expect(page.getByRole('button', { name: FR['moderation.retablir'] })).toBeVisible();
  });

  test('un avis masque ne propose que « Rétablir », un avis publie que « Masquer »', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/avis**', { corps: [{ ...SIGNALE, statut: 'MASQUE', commentaire: null }] });

    await ouvrir(page, '/admin/avis');
    await page.locator('select[name="statut"]').selectOption('MASQUE');

    await expect(page.getByText(FR['moderation.sansCommentaire'])).toBeVisible();
    await expect(page.getByRole('button', { name: FR['moderation.masquer'] })).toHaveCount(0);
    await expect(page.getByRole('button', { name: FR['moderation.retablir'] })).toHaveCount(1);

    await stub(page, '**/api/admin/avis**', { corps: [{ ...SIGNALE, statut: 'PUBLIE' }] });
    await page.locator('select[name="statut"]').selectOption('PUBLIE');

    await expect(page.getByRole('button', { name: FR['moderation.masquer'] })).toHaveCount(1);
    await expect(page.getByRole('button', { name: FR['moderation.retablir'] })).toHaveCount(0);
  });

  test('masquage et retablissement : confirmation et liste rechargee ; 409 : motif de l API', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/avis**', { corps: [SIGNALE] });
    await stub(page, '**/api/admin/avis/a1/masquer', { corps: { ...SIGNALE, statut: 'MASQUE' } });
    await stub(page, '**/api/admin/avis/a1/retablir', { corps: { ...SIGNALE, statut: 'PUBLIE' } });

    await ouvrir(page, '/admin/avis');
    await journal.attendre(/\/api\/admin\/avis\?/);
    await page.getByRole('button', { name: FR['moderation.masquer'] }).click();
    await expect(page.getByText(FR['moderation.masque'])).toBeVisible();
    await expect.poll(() => journal.filtrer(/\/api\/admin\/avis\?/).length).toBe(2);

    await page.getByRole('button', { name: FR['moderation.retablir'] }).click();
    await expect(page.getByText(FR['moderation.retabli'])).toBeVisible();

    await stub(page, '**/api/admin/avis/a1/masquer', { statut: 409, corps: { erreur: 'Cet avis est deja masque.' } });
    journal.vider();
    await page.getByRole('button', { name: FR['moderation.masquer'] }).click();
    await expect(page.getByText('Cet avis est deja masque.')).toBeVisible();
    await expect.poll(() => journal.filtrer(/\/api\/admin\/avis\?/).length).toBe(1);
  });

  test('aucun avis pour le filtre ; 403 : page reservee a l administrateur', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/avis**', { corps: [] });

    await ouvrir(page, '/admin/avis');
    await expect(page.getByText(FR['moderation.aucun'])).toBeVisible();

    await stub(page, '**/api/admin/avis**', { statut: 403, corps: { erreur: 'Acces refuse.' } });
    await ouvrir(page, '/admin/avis');
    await expect(page.getByText(FR['commun.reserveAdmin'])).toBeVisible();
  });
});

test.describe('Écran du tableau de bord', () => {
  test('trois tuiles chiffrees et lien vers les candidatures ; zero partout sans candidature', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/statistiques', { corps: { candidaturesEnAttente: 2, candidaturesValidees: 5, candidaturesRefusees: 1 } });

    await ouvrir(page, '/admin');

    const tuiles = page.locator('main ul li');
    await expect(tuiles).toHaveCount(3);
    await expect(tuiles.nth(0)).toContainText(FR['admin.candidaturesEnAttente']);
    await expect(tuiles.nth(0).locator('strong')).toHaveText('2');
    await expect(tuiles.nth(1)).toContainText(FR['admin.candidaturesValidees']);
    await expect(tuiles.nth(1).locator('strong')).toHaveText('5');
    await expect(tuiles.nth(2)).toContainText(FR['admin.candidaturesRefusees']);
    await expect(tuiles.nth(2).locator('strong')).toHaveText('1');
    await expect(page.locator('main a[href="/admin/candidatures"]')).toHaveCount(1);

    await stub(page, '**/api/admin/statistiques', { corps: { candidaturesEnAttente: 0, candidaturesValidees: 0, candidaturesRefusees: 0 } });
    await ouvrir(page, '/admin');
    await expect(page.locator('main ul li strong')).toHaveText(['0', '0', '0']);
  });

  test('rappels : le nombre envoye est accorde, et un echec n affecte pas les compteurs', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/statistiques', { corps: { candidaturesEnAttente: 2, candidaturesValidees: 5, candidaturesRefusees: 1 } });
    await stub(page, '**/api/admin/rappels/executer', { corps: { nombre: 3 } });

    await ouvrir(page, '/admin');
    await expect(page.getByText(FR['admin.rappelsTitre'])).toBeVisible();
    await page.getByRole('button', { name: FR['admin.rappelsExecuter'] }).click();
    await expect(page.getByText('3 rappels envoyés')).toBeVisible();

    await stub(page, '**/api/admin/rappels/executer', { corps: { nombre: 0 } });
    await page.getByRole('button', { name: FR['admin.rappelsExecuter'] }).click();
    await expect(page.getByText('0 rappel envoyé')).toBeVisible();
    await expect(page.getByText('3 rappels envoyés')).toHaveCount(0);

    await stub(page, '**/api/admin/rappels/executer', { statut: 500, corps: { erreur: 'Envoi impossible.' } });
    await page.getByRole('button', { name: FR['admin.rappelsExecuter'] }).click();
    await expect(page.getByText('Envoi impossible.')).toBeVisible();
    await expect(page.locator('main ul li')).toHaveCount(3);
    await expect(page.getByRole('button', { name: FR['admin.rappelsExecuter'] })).toBeEnabled();
  });

  test('403 : page reservee a l administrateur et aucune tuile ; 401 : retour a la connexion', async ({ page }) => {
    await connecter(page, { roles: ['ADMIN'] });
    await stub(page, '**/api/admin/statistiques', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/admin');
    await expect(page.getByText(FR['commun.reserveAdmin'])).toBeVisible();
    await expect(page.locator('main ul li')).toHaveCount(0);

    await stub(page, '**/api/admin/statistiques', { statut: 401, corps: { erreur: 'Non authentifié' } });
    await page.goto('/admin');
    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
  });
});
