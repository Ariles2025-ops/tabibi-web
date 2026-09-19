import { expect, test } from '@playwright/test';
import { CODE_ORDONNANCE_VALIDE } from './api-simulee';
import { ouvrir } from './outils';

/** Parcours public : verification d'une ordonnance par son code (page /verifier), code valide puis code inconnu. */
test.describe("Vérification d'une ordonnance", () => {
  test('un code valide affiche « Ordonnance authentique » avec la date et le statut', async ({ page }) => {
    await ouvrir(page, '/verifier');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vérifier une ordonnance');
    await expect(page).toHaveTitle('Vérifier une ordonnance | Tabibi');
    const bouton = page.getByRole('button', { name: 'Vérifier' });
    await expect(bouton).toBeDisabled();

    await page.getByPlaceholder('Code de vérification').fill(CODE_ORDONNANCE_VALIDE);
    await expect(bouton).toBeEnabled();
    await bouton.click();

    // Emise le 15 septembre 2026 a 09:30 UTC : 10:30 a Alger (fuseau du navigateur de test) une fois la page
    // hydratee, 09:30 dans le HTML rendu par le serveur (UTC) ; l'heure n'est donc pas figee dans l'attente.
    await expect(page.getByText(/Ordonnance authentique, émise le mardi 15 septembre 2026 à \d\d:30 \(Émise\)\./)).toBeVisible();
  });

  test('un code inconnu affiche « Code inconnu. »', async ({ page }) => {
    await ouvrir(page, '/verifier');

    await page.getByPlaceholder('Code de vérification').fill('INCONNU-0000');
    await page.getByRole('button', { name: 'Vérifier' }).click();

    await expect(page.getByText('Code inconnu.')).toBeVisible();
    await expect(page.getByText('Ordonnance authentique')).toHaveCount(0);
  });

  test('un lien /verifier?code=… lance la vérification, déjà rendue par le serveur', async ({ page, request }) => {
    // Sans JavaScript : le HTML renvoye par le serveur contient deja le resultat (cache de transfert ensuite).
    const reponse = await request.get(`/verifier?code=${encodeURIComponent(CODE_ORDONNANCE_VALIDE)}`);
    expect(reponse.status()).toBe(200);
    expect(await reponse.text()).toContain('Ordonnance authentique, émise le');

    await ouvrir(page, `/verifier?code=${encodeURIComponent(CODE_ORDONNANCE_VALIDE)}`);
    await expect(page.getByPlaceholder('Code de vérification')).toHaveValue(CODE_ORDONNANCE_VALIDE);
    await expect(page.getByText(/Ordonnance authentique, émise le/)).toBeVisible();
  });
});
