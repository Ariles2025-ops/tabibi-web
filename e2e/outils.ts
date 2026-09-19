import { Page, Response } from '@playwright/test';

/**
 * Ouvre une page et attend l'hydratation : le HTML rendu par le serveur est affiche avant que le JavaScript ne
 * s'execute, et un clic ou une saisie faits trop tot sont perdus (le formulaire de l'annuaire, par exemple, ferait
 * une soumission native et rechargerait la page). Angular retire l'attribut `ngh` de `<app-root>` une fois
 * l'application hydratee : c'est le signal attendu. Renvoie la reponse HTTP de la navigation (statut).
 */
export async function ouvrir(page: Page, url: string): Promise<Response | null> {
  const reponse = await page.goto(url);
  await page.locator('app-root:not([ngh])').waitFor();
  return reponse;
}
