import { expect, test } from '@playwright/test';
import { URL_WEB } from '../../playwright.config';
import { FR } from '../../src/app/i18n/fr';
import { connecter, ouvrir, requetes, stub } from '../outils';

/**
 * Messagerie (MessagerieService) : ouverture d'une conversation depuis la fiche du praticien, liste des
 * conversations, lecture et envoi d'un message, et erreurs { erreur } 400 et 403 de l'API.
 */
const PATIENT = '22222222-2222-2222-2222-222222222222';
const MEDECIN = '33333333-3333-3333-3333-333333333333';

const CONVERSATION = {
  id: 'c1',
  patientId: PATIENT,
  medecinId: MEDECIN,
  creeLe: '2026-09-18T10:00:00Z',
  dernierMessageLe: '2026-09-18T10:05:00Z',
  nonLus: 1,
};

const MESSAGE = {
  id: 'm1',
  conversationId: 'c1',
  auteurId: PATIENT,
  contenu: 'Bonjour docteur, dois-je poursuivre le traitement ?',
  envoyeLe: '2026-09-18T10:05:00Z',
  luLe: null,
};

test.describe('Appels API de la messagerie', () => {
  test('ouvre une conversation par POST /api/conversations avec { medecinId } depuis la fiche', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { statut: 201, corps: { ...CONVERSATION, medecinId: 'm1' } });
    await stub(page, '**/api/conversations/c1/messages', { corps: [] });

    await ouvrir(page, '/medecins/m1');
    await page.getByRole('button', { name: FR['fiche.ecrire'] }).click();

    const ouverture = await journal.attendre('/api/conversations', 'POST');
    expect(ouverture.chemin).toBe('/api/conversations');
    expect(ouverture.corps).toEqual({ medecinId: 'm1' });
    await expect(page).toHaveURL(`${URL_WEB}/messagerie/c1`);
  });

  test('403 a l ouverture : la fiche explique qu un rendez-vous commun est necessaire', async ({ page }) => {
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { statut: 403, corps: { erreur: 'Aucun rendez-vous commun.' } });

    await ouvrir(page, '/medecins/m1');
    await page.getByRole('button', { name: FR['fiche.ecrire'] }).click();

    await expect(page.getByText(FR['fiche.messagerieRendezVous'])).toBeVisible();
  });

  test('lit mes conversations sur GET /api/conversations', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });

    await ouvrir(page, '/messagerie');

    const appel = await journal.attendre('/api/conversations');
    expect(appel.methode).toBe('GET');
    expect(appel.chemin).toBe('/api/conversations');
    await expect(page.getByText('Dr Amina Belkacem')).toBeVisible();
  });

  test('lit les messages sur GET /api/conversations/{id}/messages et envoie par POST avec { contenu }', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', { corps: [MESSAGE] });

    await ouvrir(page, '/messagerie/c1');

    const lecture = await journal.attendre('/api/conversations/c1/messages');
    expect(lecture.chemin).toBe('/api/conversations/c1/messages');
    await expect(page.getByText(MESSAGE.contenu)).toBeVisible();

    await page.locator('textarea[name="contenu"]').fill('Merci docteur.');
    await page.getByRole('button', { name: FR['conversation.envoyer'], exact: true }).click();

    const envoi = await journal.attendre('/api/conversations/c1/messages', 'POST');
    expect(envoi.corps).toEqual({ contenu: 'Merci docteur.' });
  });

  test('400 a l envoi : le message { erreur } de l API est affiche', async ({ page }) => {
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', (requete) =>
      requete.method() === 'POST'
        ? { statut: 400, corps: { erreur: 'Le contenu du message est obligatoire.' } }
        : { corps: [MESSAGE] },
    );

    await ouvrir(page, '/messagerie/c1');
    await page.locator('textarea[name="contenu"]').fill('Merci docteur.');
    await page.getByRole('button', { name: FR['conversation.envoyer'], exact: true }).click();

    await expect(page.getByText('Le contenu du message est obligatoire.')).toBeVisible();
  });
});

test.describe('Écran de mes conversations', () => {
  const AUTRE = {
    ...CONVERSATION,
    id: 'c2',
    medecinId: '44444444-4444-4444-4444-444444444444',
    dernierMessageLe: '2026-09-10T10:00:00Z',
    nonLus: 0,
  };

  test('liste mes conversations, activite la plus recente d abord, avec le nom du medecin et les non lus', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [AUTRE, { ...CONVERSATION, nonLus: 2 }] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, `**/api/medecins/${AUTRE.medecinId}`, { corps: { id: AUTRE.medecinId, nomComplet: 'Dr Karim Haddad' } });

    await ouvrir(page, '/messagerie');

    const lignes = page.locator('main li');
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText('Dr Amina Belkacem');
    await expect(lignes.nth(0)).toContainText('18 septembre');
    await expect(lignes.nth(0)).toContainText('2 non lus');
    await expect(lignes.nth(0)).toHaveClass(/conversation-non-lue/);
    await expect(lignes.nth(0).locator('a')).toHaveAttribute('href', '/messagerie/c1');
    await expect(lignes.nth(1)).toContainText('Dr Karim Haddad');
    await expect(lignes.nth(1)).not.toContainText('non lus');
    expect(journal.filtrer('/api/medecins/').length).toBe(2);
  });

  test('cote medecin, l interlocuteur est « Patient » et un identifiant abrege', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: MEDECIN, roles: ['MEDECIN'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });

    await ouvrir(page, '/messagerie');

    await expect(page.getByText(FR['commun.patient'].replace('{id}', '22222222'))).toBeVisible();
    expect(journal.contient('/api/medecins/')).toBe(false);
  });

  test('aucune conversation : message et invitation a ecrire depuis la fiche', async ({ page }) => {
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [] });

    await ouvrir(page, '/messagerie');

    await expect(page.getByText(FR['messagerie.aucune'])).toBeVisible();
    await expect(page.getByText(FR['messagerie.ecrireDepuisFiche'])).toBeVisible();
    await expect(page.locator('main a[href="/"]')).toHaveCount(1);
  });

  test('403 : « Cette page est réservée aux patients et aux médecins. »', async ({ page }) => {
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/messagerie');

    await expect(page.getByText(FR['commun.reservePatientsMedecins'])).toBeVisible();
  });

  test('non connecte : redirection vers la connexion, sans lire les conversations', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/messagerie');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/conversations')).toBe(false);
  });
});

test.describe('Écran du fil d une conversation', () => {
  const DU_MEDECIN = {
    ...MESSAGE,
    id: 'm2',
    auteurId: MEDECIN,
    contenu: 'Oui, jusqu au prochain rendez-vous.',
    envoyeLe: '2026-09-18T10:10:00Z',
    luLe: null,
  };
  const DE_MOI_LU = { ...MESSAGE, luLe: '2026-09-18T10:08:00Z' };

  test('mes messages a droite, ceux du medecin a gauche, avec la mention « lu » et le compteur de caracteres', async ({ page }) => {
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', { corps: [DE_MOI_LU, DU_MEDECIN] });

    await ouvrir(page, '/messagerie/c1');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dr Amina Belkacem');
    const bulles = page.locator('main ol li');
    await expect(bulles).toHaveCount(2);
    await expect(bulles.nth(0)).toHaveClass(/message-moi/);
    await expect(bulles.nth(0)).toContainText(MESSAGE.contenu);
    await expect(bulles.nth(0)).toContainText('18 septembre');
    await expect(bulles.nth(0)).toContainText(FR['conversation.lu']);
    await expect(bulles.nth(1)).toHaveClass(/message-autre/);
    await expect(bulles.nth(1)).toContainText(DU_MEDECIN.contenu);
    await expect(page.getByText('0 / 2000')).toBeVisible();
    await expect(page.getByRole('button', { name: FR['conversation.envoyer'], exact: true })).toBeDisabled();
  });

  test('cote medecin, mes messages passent a droite et le patient est nomme par un identifiant abrege', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: MEDECIN, roles: ['MEDECIN'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, '**/api/conversations/c1/messages', { corps: [DE_MOI_LU, DU_MEDECIN] });

    await ouvrir(page, '/messagerie/c1');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['commun.patient'].replace('{id}', '22222222'));
    const bulles = page.locator('main ol li');
    await expect(bulles.nth(0)).toHaveClass(/message-autre/);
    await expect(bulles.nth(1)).toHaveClass(/message-moi/);
    expect(journal.contient('/api/medecins/')).toBe(false);
  });

  test('« Envoyer » s active a la saisie, envoie, recharge le fil et vide le champ', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', (requete) =>
      requete.method() === 'POST' ? { statut: 201, corps: DE_MOI_LU } : { corps: [DE_MOI_LU] },
    );

    await ouvrir(page, '/messagerie/c1');
    await journal.attendre('/api/conversations/c1/messages');

    const envoyer = page.getByRole('button', { name: FR['conversation.envoyer'], exact: true });
    await page.locator('textarea[name="contenu"]').fill('Merci docteur.');
    await expect(page.getByText('14 / 2000')).toBeVisible();
    await expect(envoyer).toBeEnabled();

    await envoyer.click();

    await journal.attendre('/api/conversations/c1/messages', 'POST');
    await expect(page.locator('textarea[name="contenu"]')).toHaveValue('');
    await expect(envoyer).toBeDisabled();
    await expect.poll(() => journal.filtrer('/api/conversations/c1/messages', 'GET').length).toBe(2);
  });

  test('un texte vide ou de plus de 2000 caracteres n est pas envoyable', async ({ page }) => {
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', { corps: [] });

    await ouvrir(page, '/messagerie/c1');

    const envoyer = page.getByRole('button', { name: FR['conversation.envoyer'], exact: true });
    await expect(envoyer).toBeDisabled();

    await page.locator('textarea[name="contenu"]').fill('a'.repeat(2001));
    await expect(page.getByText('2001 / 2000')).toBeVisible();
    await expect(envoyer).toBeDisabled();
    expect(journal.contient('/api/conversations/c1/messages', 'POST')).toBe(false);
  });

  test('relit le fil toutes les 30 secondes, et s arrete quand on quitte la page', async ({ page }) => {
    await page.clock.install();
    const journal = requetes(page);
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', { corps: [DE_MOI_LU] });

    await ouvrir(page, '/messagerie/c1');
    await expect.poll(() => journal.filtrer('/api/conversations/c1/messages', 'GET').length).toBe(1);

    await page.clock.fastForward('00:31');
    await expect.poll(() => journal.filtrer('/api/conversations/c1/messages', 'GET').length).toBe(2);

    // Retour a la liste : la relecture periodique s'arrete avec la page.
    await page.getByRole('link', { name: FR['conversation.retour'] }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(FR['messagerie.titre']);
    const apresSortie = journal.filtrer('/api/conversations/c1/messages', 'GET').length;
    await page.clock.fastForward('02:00');
    expect(journal.filtrer('/api/conversations/c1/messages', 'GET').length).toBe(apresSortie);
  });

  test('403 : « Cette conversation ne vous concerne pas. » et aucun champ de saisie', async ({ page }) => {
    await connecter(page, { sujet: PATIENT, roles: ['PATIENT'] });
    await stub(page, '**/api/conversations', { corps: [CONVERSATION] });
    await stub(page, `**/api/medecins/${MEDECIN}`, { corps: { id: MEDECIN, nomComplet: 'Dr Amina Belkacem' } });
    await stub(page, '**/api/conversations/c1/messages', { statut: 403, corps: { erreur: 'Acces refuse.' } });

    await ouvrir(page, '/messagerie/c1');

    await expect(page.getByText(FR['conversation.neVousConcerne'])).toBeVisible();
    await expect(page.locator('textarea[name="contenu"]')).toHaveCount(0);
  });

  test('non connecte : redirection vers la connexion, sans lire le fil', async ({ page }) => {
    const journal = requetes(page);

    await page.goto('/messagerie/c1');

    await page.waitForURL((url) => url.href.includes('/protocol/openid-connect/auth'));
    expect(journal.contient('/api/conversations/c1/messages')).toBe(false);
  });
});
