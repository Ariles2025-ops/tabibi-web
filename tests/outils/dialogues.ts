import { Page } from '@playwright/test';

/**
 * Plusieurs actions destructrices passent par `confirm()` (annulation d'un rendez-vous, retrait d'une
 * secretaire...). Playwright refuse les boites de dialogue par defaut, ce qui annulerait l'action : ces aides
 * choisissent explicitement la reponse, et notent les messages presentes.
 */

/** Accepte chaque `confirm()` / `alert()` et renvoie la liste des messages vus. */
export function accepterConfirmations(page: Page): string[] {
  const messages: string[] = [];
  page.on('dialog', async (dialogue) => {
    messages.push(dialogue.message());
    await dialogue.accept();
  });
  return messages;
}

/** Refuse chaque `confirm()` (le visiteur renonce) et renvoie la liste des messages vus. */
export function refuserConfirmations(page: Page): string[] {
  const messages: string[] = [];
  page.on('dialog', async (dialogue) => {
    messages.push(dialogue.message());
    await dialogue.dismiss();
  });
  return messages;
}
