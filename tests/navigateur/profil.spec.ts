import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Mon profil (ProfilService) : lecture (404 tant qu'il n'est pas renseigne), enregistrement du formulaire
 * nettoye et message d'erreur du 400 renvoye par l'API. Le nettoyage et la validation eux-memes sont verifies
 * dans `logique`.
 */
const PROFIL = {
  utilisateurId: 'u1',
  nomComplet: 'Amina Belkacem',
  telephone: '0550123456',
  dateNaissance: '1990-05-12',
  wilayaCode: '16',
  langue: 'fr',
  misAJourLe: '2026-09-18T10:00:00Z',
};

test.describe('Appels API du profil', () => {
  test('lit mon profil sur GET /api/moi/profil et remplit le formulaire', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/moi/profil', { corps: PROFIL });

    await ouvrir(page, '/moi/profil');

    const appel = await journal.attendre('/api/moi/profil');
    expect(appel.chemin).toBe('/api/moi/profil');
    await expect(page.getByLabel(FR['profil.nomComplet'])).toHaveValue('Amina Belkacem');
    await expect(page.getByLabel(FR['profil.telephone'])).toHaveValue('0550123456');
    await expect(page.getByLabel(FR['profil.wilaya'])).toHaveValue('16');
  });

  test('404 : le formulaire reste vide et utilisable (profil jamais renseigne)', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/moi/profil', { statut: 404, corps: { erreur: 'Profil non renseigne.' } });

    await ouvrir(page, '/moi/profil');

    await expect(page.getByLabel(FR['profil.nomComplet'])).toHaveValue('');
    await expect(page.getByRole('button', { name: FR['profil.enregistrer'] })).toBeEnabled();
  });

  test('enregistre par PUT /api/moi/profil avec les champs nettoyes', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/moi/profil', (requete) =>
      requete.method() === 'PUT' ? { corps: PROFIL } : { statut: 404, corps: { erreur: 'Profil non renseigne.' } },
    );

    await ouvrir(page, '/moi/profil');
    await page.getByLabel(FR['profil.nomComplet']).fill('  Amina Belkacem ');
    await page.getByLabel(FR['profil.telephone']).fill('0550 12 34 56');
    await page.getByLabel(FR['profil.dateNaissance']).fill('1990-05-12');
    await page.getByLabel(FR['profil.wilaya']).fill('16');
    await page.locator('select[name="langue"]').selectOption('fr');
    await page.getByRole('button', { name: FR['profil.enregistrer'] }).click();

    const envoi = await journal.attendre('/api/moi/profil', 'PUT');
    expect(envoi.corps).toEqual({
      nomComplet: 'Amina Belkacem',
      telephone: '0550123456',
      dateNaissance: '1990-05-12',
      wilayaCode: '16',
      langue: 'fr',
    });
  });

  test('400 de l API : le motif renvoye est affiche', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/moi/profil', (requete) =>
      requete.method() === 'PUT'
        ? { statut: 400, corps: { erreur: 'Le telephone doit etre un numero algerien de 9 a 10 chiffres commencant par 0 (ex. 0550123456).' } }
        : { corps: PROFIL },
    );

    await ouvrir(page, '/moi/profil');
    await page.getByRole('button', { name: FR['profil.enregistrer'] }).click();

    await expect(page.getByText(/numero algerien/)).toBeVisible();
  });

  test('un profil invalide est refuse avant l appel (validation cote client)', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/moi/profil', { corps: PROFIL });

    await ouvrir(page, '/moi/profil');
    await page.getByLabel(FR['profil.telephone']).fill('12');
    await page.getByRole('button', { name: FR['profil.enregistrer'] }).click();

    await expect(page.getByText(/numéro algérien/)).toBeVisible();
    expect(journal.contient('/api/moi/profil', 'PUT')).toBe(false);
  });
});
