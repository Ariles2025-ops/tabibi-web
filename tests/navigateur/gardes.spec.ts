import { expect, test } from '@playwright/test';
import { ISSUER_SIMULE, URL_WEB } from '../../playwright.config';
import { connecter, ouvrir, stub } from '../outils';

/**
 * Gardes de route (adminGuard, secretaireGuard, pharmacieGuard, medecinGuard) : meme modele pour toutes.
 * Non connecte → page de connexion Keycloak avec retour sur la page demandee (`state`) ; connecte sans le role
 * → retour a l'accueil ; connecte avec le role → la page s'affiche. L'autorisation reelle reste cote API.
 */
const ESPACES = [
  { nom: 'administration', chemin: '/admin', role: 'ADMIN', titre: 'Administration' },
  { nom: 'espace secretaire', chemin: '/secretaire', role: 'SECRETAIRE', titre: 'Espace secrétaire' },
  { nom: 'espace pharmacie', chemin: '/pharmacie', role: 'PHARMACIE', titre: 'Espace pharmacie' },
  { nom: 'espace medecin', chemin: '/medecin/agenda', role: 'MEDECIN', titre: 'Agenda' },
];

for (const espace of ESPACES) {
  test.describe(`Garde de l ${espace.nom}`, () => {
    test.beforeEach(async ({ page }) => {
      // Les ecrans derriere la garde appellent leurs propres routes : une reponse vide suffit ici.
      await stub(page, '**/api/admin/**', { corps: [] });
      await stub(page, '**/api/secretaire/**', { corps: [] });
      await stub(page, '**/api/pharmacie/**', { corps: [] });
      await stub(page, '**/api/medecin/**', { corps: [] });
    });

    test(`laisse passer un utilisateur portant le role ${espace.role}`, async ({ page }) => {
      await connecter(page, { roles: [espace.role] });

      await ouvrir(page, espace.chemin);

      await expect(page).toHaveURL(`${URL_WEB}${espace.chemin}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(espace.titre);
    });

    test(`renvoie a l accueil un utilisateur connecte sans le role ${espace.role}`, async ({ page }) => {
      await connecter(page, { roles: ['PATIENT'] });

      await ouvrir(page, espace.chemin);

      await expect(page).toHaveURL(`${URL_WEB}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trouver un praticien');
    });

    test('envoie un utilisateur non connecte vers la connexion, avec retour sur la page demandee', async ({ page }) => {
      await page.goto(espace.chemin);

      await page.waitForURL((url) => url.href.startsWith(`${ISSUER_SIMULE}/protocol/openid-connect/auth`));
      const url = new URL(page.url());
      expect(url.searchParams.get('client_id')).toBe('tabibi-web');
      expect(decodeURIComponent(url.searchParams.get('state') ?? '')).toContain(espace.chemin);
    });
  });
}
