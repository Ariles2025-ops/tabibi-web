import { expect, test } from '@playwright/test';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Notifications (NotificationService) : compteur de la cloche, liste, marquage lu d'une notification ou de
 * toutes, et rafraichissement du compteur de la barre de navigation apres chaque marquage reussi.
 */
const NOTIFICATION = {
  id: 'n1',
  destinataireId: 'u1',
  canal: 'INTERNE',
  sujet: 'Rendez-vous confirmé',
  message: 'Votre rendez-vous du 07/12/2026 à 10:00 est confirmé.',
  lue: false,
  creeLe: '2026-09-18T10:00:00Z',
};

test.describe('Appels API des notifications', () => {
  test('la cloche lit GET /api/notifications/non-lues/nombre et affiche le compteur', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 3 } });

    await ouvrir(page, '/');

    const appel = await journal.attendre('/api/notifications/non-lues/nombre');
    expect(appel.chemin).toBe('/api/notifications/non-lues/nombre');
    await expect(page.locator('app-cloche-notifications')).toContainText('(3)');
  });

  test('lit mes notifications sur GET /api/notifications/mes et marque une notification lue sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 1 } });
    await stub(page, '**/api/notifications/mes', { corps: [NOTIFICATION] });
    await stub(page, '**/api/notifications/n1/lue', { corps: { ...NOTIFICATION, lue: true } });

    await ouvrir(page, '/notifications');

    const liste = await journal.attendre('/api/notifications/mes');
    expect(liste.chemin).toBe('/api/notifications/mes');
    await expect(page.getByText(NOTIFICATION.sujet)).toBeVisible();

    await page.getByRole('button', { name: FR['notifications.marquerLue'] }).click();

    const marquage = await journal.attendre('/api/notifications/n1/lue', 'POST');
    expect(marquage.corps).toBeNull();
    // Un marquage reussi signale un changement : la cloche relit son compteur.
    await expect.poll(() => journal.filtrer('/api/notifications/non-lues/nombre').length).toBeGreaterThan(1);
  });

  test('marque tout lu par POST /api/notifications/toutes-lues sans corps', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 2 } });
    await stub(page, '**/api/notifications/mes', { corps: [NOTIFICATION] });
    await stub(page, '**/api/notifications/toutes-lues', { corps: { nombre: 2 } });

    await ouvrir(page, '/notifications');
    await page.getByRole('button', { name: FR['notifications.toutMarquerLu'] }).click();

    const marquage = await journal.attendre('/api/notifications/toutes-lues', 'POST');
    expect(marquage.corps).toBeNull();
  });

  test('un marquage en echec (404) ne signale aucun changement : le compteur n est pas relu', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 1 } });
    await stub(page, '**/api/notifications/mes', { corps: [NOTIFICATION] });
    await stub(page, '**/api/notifications/n1/lue', { statut: 404, corps: { erreur: 'Notification introuvable.' } });

    await ouvrir(page, '/notifications');
    await journal.attendre('/api/notifications/non-lues/nombre');
    const avant = journal.filtrer('/api/notifications/non-lues/nombre').length;

    await page.getByRole('button', { name: FR['notifications.marquerLue'] }).click();
    await journal.attendre('/api/notifications/n1/lue', 'POST');
    await expect(page.getByText('Notification introuvable.')).toBeVisible();

    expect(journal.filtrer('/api/notifications/non-lues/nombre').length).toBe(avant);
  });
});
