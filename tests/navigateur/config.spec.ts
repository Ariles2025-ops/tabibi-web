import { expect, test } from '@playwright/test';
import { CHEMIN_CONFIGURATION, CONFIGURATION_PAR_DEFAUT } from '../../src/app/config/config.formats';
import { URL_API } from '../../playwright.config';
import { ouvrir, requetes, stub } from '../outils';

/**
 * Configuration lue a l'execution : le meme build vise l'API designee par `assets/config.json`. Le fichier sert
 * ici l'API simulee (reecrit par global-setup) ; s'il manque, les valeurs localhost s'appliquent avec un
 * avertissement. La normalisation des valeurs est verifiee dans le projet `logique`.
 *
 * L'observable est une recherche lancee depuis le navigateur : le premier appel de la page est fait par le
 * serveur de rendu et transmis au navigateur (cache de transfert), il ne repasse donc pas par le reseau.
 */
test.describe('Configuration a l execution', () => {
  test('le navigateur lit assets/config.json une seule fois et appelle l API qu il designe', async ({ page }) => {
    const fichier: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes(CHEMIN_CONFIGURATION)) fichier.push(r.url());
    });
    const journal = requetes(page);

    await ouvrir(page, '/');
    await page.locator('input[name="q"]').fill('Amina');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    const appel = await journal.attendre('/api/medecins');

    expect(appel.url.startsWith(URL_API)).toBe(true);
    expect(appel.parametres.get('q')).toBe('Amina');
    expect(fichier.length).toBe(1);

    // Navigation cote client : la configuration n'est pas relue (une seule promesse partagee).
    await page.getByRole('link', { name: 'Vérifier une ordonnance' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vérifier une ordonnance');
    expect(fichier.length).toBe(1);
  });

  test('fichier absent (404) : valeurs localhost par defaut et avertissement dans la console', async ({ page }) => {
    const console_: string[] = [];
    page.on('console', (message) => console_.push(`${message.type()}: ${message.text()}`));
    await stub(page, `**/${CHEMIN_CONFIGURATION}`, { statut: 404, corps: { erreur: 'absent' } });

    await ouvrir(page, '/');
    await page.locator('input[name="q"]').fill('Amina');
    await page.getByRole('button', { name: 'Rechercher' }).click();

    // L'avertissement annonce le repli, et l'appel part bien vers l'API par defaut : la politique de securite du
    // contenu du serveur (connect-src) ne l'autorise pas, et le refus nomme l'URL visee.
    await expect
      .poll(() => console_.join('\n'))
      .toContain(`${CONFIGURATION_PAR_DEFAUT.apiUrl}/api/medecins`);
    expect(console_.join('\n')).toContain(CHEMIN_CONFIGURATION);
    // L'application reste utilisable : la page est rendue malgre l'API injoignable.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
  });
});
