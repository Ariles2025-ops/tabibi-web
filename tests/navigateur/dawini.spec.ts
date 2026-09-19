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
