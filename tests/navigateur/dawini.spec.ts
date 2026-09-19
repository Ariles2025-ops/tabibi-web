import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Dawini (DawiniService) : publication et cloture d'un besoin par le patient, lecture des reponses, et cote
 * pharmacie recherche des besoins ouverts d'une wilaya puis reponse. Les libelles et le format du prix sont
 * verifies dans `logique`.
 */
const BESOIN = {
  id: 'b1',
  patientId: 'p1',
  medicament: 'Amoxicilline 1 g',
  wilayaCode: '16',
  commune: 'Bab Ezzouar',
  precision: 'Boîte de 14 comprimés',
  statut: 'OUVERT',
  publieLe: '2026-09-18T10:00:00Z',
  clotureLe: null,
  nombreReponses: 0,
};

const REPONSE = {
  id: 'rp1',
  besoinId: 'b1',
  pharmacieId: 'ph1',
  nomPharmacie: 'Pharmacie El Amel',
  disponible: true,
  prixDa: 850,
  commentaire: 'Disponible jusqu à 19 h.',
  repondueLe: '2026-09-18T11:00:00Z',
};

test.describe('Appels API de Dawini', () => {
  test('publie un besoin par POST /api/dawini/besoins et relit GET /api/dawini/besoins/mes', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [] });
    await stub(page, '**/api/dawini/besoins', { statut: 201, corps: BESOIN });

    await ouvrir(page, '/dawini');

    const liste = await journal.attendre('/api/dawini/besoins/mes');
    expect(liste.chemin).toBe('/api/dawini/besoins/mes');

    await page.locator('input[name="medicament"]').fill('Amoxicilline 1 g');
    await page.locator('input[name="wilayaCode"]').fill('16');
    await page.locator('input[name="commune"]').fill('Bab Ezzouar');
    await page.locator('input[name="precision"]').fill('Boîte de 14 comprimés');
    await page.getByRole('button', { name: FR['dawini.publier'] }).click();

    const envoi = await journal.attendre('/api/dawini/besoins', 'POST');
    expect(envoi.chemin).toBe('/api/dawini/besoins');
    expect(envoi.corps).toEqual({
      medicament: 'Amoxicilline 1 g',
      wilayaCode: '16',
      commune: 'Bab Ezzouar',
      precision: 'Boîte de 14 comprimés',
    });
  });

  test('lit les reponses sur GET /api/dawini/besoins/{id}/reponses et cloture sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [BESOIN] });
    await stub(page, '**/api/dawini/besoins/b1/reponses', { corps: [REPONSE] });
    await stub(page, '**/api/dawini/besoins/b1/cloturer', { corps: { ...BESOIN, statut: 'CLOTURE', clotureLe: '2026-09-18T12:00:00Z' } });

    await ouvrir(page, '/dawini/b1');

    const reponses = await journal.attendre('/api/dawini/besoins/b1/reponses');
    expect(reponses.chemin).toBe('/api/dawini/besoins/b1/reponses');
    await expect(page.getByText('Pharmacie El Amel')).toBeVisible();
    await expect(page.getByText('850 DA')).toBeVisible();

    await page.getByRole('button', { name: FR['demande.cloturer'] }).click();

    const cloture = await journal.attendre('/api/dawini/besoins/b1/cloturer', 'POST');
    expect(cloture.corps).toBeNull();
    await expect(page.getByText(FR['demande.cloturee'])).toBeVisible();
  });

  test('pharmacie : GET /api/dawini/besoins?wilaya= puis POST de la reponse avec tous les champs', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PHARMACIE'] });
    await stub(page, '**/api/dawini/besoins?**', { corps: [{ ...BESOIN, patientId: null }] });
    await stub(page, '**/api/dawini/besoins/b1/reponses', { statut: 201, corps: REPONSE });

    await ouvrir(page, '/pharmacie');
    await page.locator('input[name="wilayaCode"]').fill('16');
    await page.getByRole('button', { name: FR['pharmacie.afficher'] }).click();

    const recherche = await journal.attendre(/\/api\/dawini\/besoins\?/);
    expect(recherche.parametres.get('wilaya')).toBe('16');
    await expect(page.getByText('Amoxicilline 1 g')).toBeVisible();

    // Les champs de la reponse portent un nom calcule (`[name]`), pose en propriete et non en attribut : les
    // reperer par leur libelle est aussi plus proche de ce que voit la pharmacienne.
    await page.getByLabel(FR['pharmacie.nom']).fill('Pharmacie El Amel');
    await page.getByLabel(FR['commun.oui'], { exact: true }).check();
    await page.getByLabel(FR['pharmacie.prix']).fill('850');
    await page.getByLabel(FR['pharmacie.commentaire']).fill('Disponible jusqu à 19 h.');
    await page.getByRole('button', { name: FR['pharmacie.repondre'] }).click();

    const envoi = await journal.attendre('/api/dawini/besoins/b1/reponses', 'POST');
    expect(envoi.corps).toEqual({
      nomPharmacie: 'Pharmacie El Amel',
      disponible: true,
      prixDa: 850,
      commentaire: 'Disponible jusqu à 19 h.',
    });
    await expect(page.getByText(FR['pharmacie.dejaRepondu'])).toBeVisible();
  });

  test('409 a la reponse : le message { erreur } de l API est affiche', async ({ page }) => {
    await connecter(page, { roles: ['PHARMACIE'] });
    await stub(page, '**/api/dawini/besoins?**', { corps: [{ ...BESOIN, patientId: null }] });
    await stub(page, '**/api/dawini/besoins/b1/reponses', {
      statut: 409,
      corps: { erreur: 'Cette pharmacie a deja repondu a ce besoin.' },
    });

    await ouvrir(page, '/pharmacie');
    await page.locator('input[name="wilayaCode"]').fill('16');
    await page.getByRole('button', { name: FR['pharmacie.afficher'] }).click();
    await expect(page.getByText('Amoxicilline 1 g')).toBeVisible();
    await page.getByLabel(FR['pharmacie.nom']).fill('Pharmacie El Amel');
    await page.getByLabel(FR['commun.oui'], { exact: true }).check();
    await page.getByRole('button', { name: FR['pharmacie.repondre'] }).click();

    await expect(page.getByText('Cette pharmacie a deja repondu a ce besoin.')).toBeVisible();
  });
});

test.describe('Écran de mes demandes', () => {
  const CLOTURE = {
    ...BESOIN,
    id: 'b2',
    medicament: 'Insuline',
    statut: 'CLOTURE',
    publieLe: '2026-09-10T10:00:00Z',
    clotureLe: '2026-09-12T10:00:00Z',
    nombreReponses: 1,
  };

  test('liste mes demandes, les plus recentes d abord, avec statut et nombre de reponses', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [CLOTURE, { ...BESOIN, nombreReponses: 3 }] });

    await ouvrir(page, '/dawini');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('Amoxicilline 1 g');
    await expect(lignes.nth(0)).toContainText('Ouverte');
    await expect(lignes.nth(0)).toContainText('Wilaya 16 · Bab Ezzouar');
    await expect(lignes.nth(0)).toContainText('3 réponses');
    await expect(lignes.nth(0).locator('a')).toHaveAttribute('href', '/dawini/b1');
    await expect(lignes.nth(1)).toContainText('Insuline');
    await expect(lignes.nth(1)).toContainText('Clôturée');
    await expect(lignes.nth(1)).toContainText('1 réponse');
  });

  test('refuse cote client une demande sans medicament ou sans wilaya', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [] });

    await ouvrir(page, '/dawini');
    await page.getByRole('button', { name: FR['dawini.publier'] }).click();

    await expect(page.getByText(FR['dawini.champsRequis'])).toBeVisible();
    expect(journal.contient(/\/api\/dawini\/besoins$/, 'POST')).toBe(false);
  });

  test('publication reussie : confirmation, formulaire vide et liste rechargee', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [] });
    await stub(page, '**/api/dawini/besoins', { statut: 201, corps: BESOIN });

    await ouvrir(page, '/dawini');
    await journal.attendre('/api/dawini/besoins/mes');
    await page.locator('input[name="medicament"]').fill(' Amoxicilline 1 g ');
    await page.locator('input[name="wilayaCode"]').fill(' 16 ');
    await page.locator('input[name="commune"]').fill('Bab Ezzouar');
    await page.getByRole('button', { name: FR['dawini.publier'] }).click();

    const envoi = await journal.attendre(/\/api\/dawini\/besoins$/, 'POST');
    // Champs nettoyes, facultatif vide omis.
    expect(envoi.corps).toEqual({ medicament: 'Amoxicilline 1 g', wilayaCode: '16', commune: 'Bab Ezzouar' });
    await expect(page.getByText(FR['dawini.publiee'])).toBeVisible();
    await expect(page.locator('input[name="medicament"]')).toHaveValue('');
    await expect.poll(() => journal.filtrer('/api/dawini/besoins/mes').length).toBe(2);
  });

  test('400 a la publication : le motif est affiche et la liste n est pas rechargee', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [] });
    await stub(page, '**/api/dawini/besoins', {
      statut: 400,
      corps: { erreur: 'Le code de wilaya ne peut pas depasser 4 caracteres.' },
    });

    await ouvrir(page, '/dawini');
    await journal.attendre('/api/dawini/besoins/mes');
    await page.locator('input[name="medicament"]').fill('Amoxicilline 1 g');
    await page.locator('input[name="wilayaCode"]').fill('16000');
    await page.getByRole('button', { name: FR['dawini.publier'] }).click();

    await expect(page.getByText('Le code de wilaya ne peut pas depasser 4 caracteres.')).toBeVisible();
    expect(journal.filtrer('/api/dawini/besoins/mes').length).toBe(1);
  });

  test('aucune demande : message dedie', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [] });

    await ouvrir(page, '/dawini');

    await expect(page.getByText(FR['dawini.aucune'])).toBeVisible();
  });

  test('non connecte : redirection vers la connexion, sans lire mes demandes', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/dawini');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/dawini/besoins/mes')).toBe(false);
  });
});

test.describe('Écran des reponses a une demande', () => {
  const INDISPONIBLE = {
    ...REPONSE,
    id: 'rp2',
    nomPharmacie: 'Pharmacie du Centre',
    disponible: false,
    prixDa: null,
    commentaire: null,
    repondueLe: '2026-09-17T11:00:00Z',
  };

  test('affiche la demande et ses reponses, les plus anciennes d abord', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [BESOIN] });
    await stub(page, '**/api/dawini/besoins/b1/reponses', { corps: [{ ...REPONSE, prixDa: 1250 }, INDISPONIBLE] });

    await ouvrir(page, '/dawini/b1');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Amoxicilline 1 g');
    await expect(page.getByText('Ouverte · Wilaya 16 · Bab Ezzouar')).toBeVisible();
    await expect(page.getByText('Boîte de 14 comprimés')).toBeVisible();
    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('Pharmacie du Centre');
    await expect(lignes.nth(0)).toContainText(FR['demande.indisponible']);
    await expect(lignes.nth(0)).not.toContainText('DA');
    await expect(lignes.nth(1)).toContainText('Pharmacie El Amel');
    await expect(lignes.nth(1)).toContainText(FR['demande.disponible']);
    await expect(lignes.nth(1)).toContainText('1 250 DA');
    await expect(lignes.nth(1)).toContainText('Disponible jusqu à 19 h.');
    await expect(page.getByRole('button', { name: FR['demande.cloturer'] })).toBeVisible();
  });

  test('une demande deja cloturee ne propose pas la cloture et signale l absence de reponse', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [{ ...BESOIN, statut: 'CLOTURE', clotureLe: '2026-09-19T10:00:00Z' }] });
    await stub(page, '**/api/dawini/besoins/b1/reponses', { corps: [] });

    await ouvrir(page, '/dawini/b1');

    await expect(page.getByRole('button', { name: FR['demande.cloturer'] })).toHaveCount(0);
    await expect(page.getByText(FR['demande.aucuneReponse'])).toBeVisible();
  });

  test('403 : « Cette demande ne vous appartient pas. »', async ({ page }) => {
    await connecter(page, { roles: ['PATIENT'] });
    await stub(page, '**/api/dawini/besoins/mes', { corps: [BESOIN] });
    await stub(page, '**/api/dawini/besoins/b1/reponses', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/dawini/b1');

    await expect(page.getByText(FR['demande.nAppartientPas'])).toBeVisible();
  });
});
