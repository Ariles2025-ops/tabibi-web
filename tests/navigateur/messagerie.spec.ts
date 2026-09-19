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
