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

test.describe('Cloche de la barre de navigation', () => {
  test('affiche « Notifications » avec le nombre de non lues et une etiquette accessible', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 3 } });

    await ouvrir(page, '/');

    const lien = page.locator('app-cloche-notifications a');
    await expect(lien).toHaveText('Notifications (3)');
    await expect(lien).toHaveAttribute('href', '/notifications');
    await expect(lien).toHaveAttribute('aria-label', FR['nav.notificationsNonLues'].replace('{n}', '3'));
  });

  test('aucun compteur quand tout est lu', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 0 } });

    await ouvrir(page, '/');

    const lien = page.locator('app-cloche-notifications a');
    await expect(lien).toHaveText(FR['nav.notifications']);
    await expect(lien).toHaveAttribute('aria-label', FR['nav.notifications']);
  });

  test('relit le compteur toutes les 60 secondes et au clic sur la cloche', async ({ page }) => {
    await page.clock.install();
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 3 } });
    await stub(page, '**/api/notifications/mes', { corps: [] });

    await ouvrir(page, '/');
    await expect.poll(() => journal.filtrer('/api/notifications/non-lues/nombre').length).toBe(1);

    await page.clock.fastForward('01:01');
    await expect.poll(() => journal.filtrer('/api/notifications/non-lues/nombre').length).toBe(2);

    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 5 } });
    await page.locator('app-cloche-notifications a').click();

    await expect.poll(() => journal.filtrer('/api/notifications/non-lues/nombre').length).toBeGreaterThan(2);
    await expect(page.locator('app-cloche-notifications a')).toHaveText('Notifications (5)');
  });

  test('garde le dernier compteur connu si l API echoue', async ({ page }) => {
    await page.clock.install();
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 3 } });

    await ouvrir(page, '/');
    await expect(page.locator('app-cloche-notifications a')).toHaveText('Notifications (3)');

    await stub(page, '**/api/notifications/non-lues/nombre', { statut: 500, corps: { erreur: 'API indisponible.' } });
    await page.clock.fastForward('01:01');
    await expect.poll(() => journal.filtrer('/api/notifications/non-lues/nombre').length).toBe(2);

    await expect(page.locator('app-cloche-notifications a')).toHaveText('Notifications (3)');
  });

  test('au rendu serveur, aucune cloche et aucune lecture : le rendu se termine', async ({ request }) => {
    const html = await (await request.get('/')).text();

    expect(html).not.toContain('<app-cloche-notifications');
    // La page est bien rendue par le serveur malgre l'absence de minuterie cote serveur.
    expect(html).toContain('Trouver un praticien');
  });
});

test.describe('Écran de mes notifications', () => {
  const LUE = {
    ...NOTIFICATION,
    id: 'n2',
    sujet: 'Nouveau rendez-vous',
    message: 'Un patient a réservé un créneau.',
    lue: true,
    creeLe: '2026-09-10T10:00:00Z',
  };

  test('liste les notifications, les plus recentes d abord, avec leur etat lue ou non lue', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 1 } });
    await stub(page, '**/api/notifications/mes', { corps: [LUE, NOTIFICATION] });

    await ouvrir(page, '/notifications');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText(NOTIFICATION.sujet);
    await expect(lignes.nth(0)).toContainText(NOTIFICATION.message);
    await expect(lignes.nth(0)).toContainText('18 septembre 2026');
    await expect(lignes.nth(0)).toHaveClass(/notification-non-lue/);
    await expect(lignes.nth(1)).toContainText('Nouveau rendez-vous');
    await expect(lignes.nth(1)).toHaveClass(/notification-lue/);
    await expect(page.getByText(FR['notifications.aucune'])).toHaveCount(0);
  });

  test('« Marquer comme lue » n est propose que sur les non lues et fait basculer la ligne', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 1 } });
    await stub(page, '**/api/notifications/mes', { corps: [LUE, NOTIFICATION] });
    await stub(page, '**/api/notifications/n1/lue', { corps: { ...NOTIFICATION, lue: true } });

    await ouvrir(page, '/notifications');

    const lignes = page.locator('main li');
    await expect(lignes.nth(0).getByRole('button', { name: FR['notifications.marquerLue'] })).toBeVisible();
    await expect(lignes.nth(1).getByRole('button')).toHaveCount(0);

    await lignes.nth(0).getByRole('button', { name: FR['notifications.marquerLue'] }).click();

    await expect(lignes.nth(0)).toHaveClass(/notification-lue/);
    await expect(page.getByRole('button', { name: FR['notifications.marquerLue'] })).toHaveCount(0);
  });

  test('« Tout marquer comme lu » recharge la liste et est desactive quand il n y a rien', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 1 } });
    await stub(page, '**/api/notifications/mes', { corps: [NOTIFICATION] });
    await stub(page, '**/api/notifications/toutes-lues', { corps: { nombre: 1 } });

    await ouvrir(page, '/notifications');
    await page.getByRole('button', { name: FR['notifications.toutMarquerLu'] }).click();

    await journal.attendre('/api/notifications/toutes-lues', 'POST');
    await expect.poll(() => journal.filtrer('/api/notifications/mes').length).toBe(2);
  });

  test('aucune notification : message dedie et bouton « Tout marquer comme lu » desactive', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 0 } });
    await stub(page, '**/api/notifications/mes', { corps: [] });

    await ouvrir(page, '/notifications');

    await expect(page.locator('main li')).toHaveCount(0);
    await expect(page.getByText(FR['notifications.aucune'])).toBeVisible();
    await expect(page.getByRole('button', { name: FR['notifications.toutMarquerLu'] })).toBeDisabled();
  });

  test('page privee : titre « Mes notifications | Tabibi » et robots noindex', async ({ page }) => {
    await connecter(page);
    await stub(page, '**/api/notifications/non-lues/nombre', { corps: { nombre: 0 } });
    await stub(page, '**/api/notifications/mes', { corps: [] });

    await ouvrir(page, '/notifications');

    await expect(page).toHaveTitle(`${FR['notifications.titre']} | Tabibi`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('non connecte : redirection vers la connexion, sans lire les notifications', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/notifications');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/notifications/mes')).toBe(false);
  });
});
