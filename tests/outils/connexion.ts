import { Page } from '@playwright/test';
import { ouvrir } from './ouvrir';
import { stub } from './reseau';

/**
 * Connexion simulee, sans Keycloak reel. `AuthService.estConnecte()` se reduit a
 * `OAuthService.hasValidAccessToken()`, qui lit le stockage de session : un jeton quelconque et une date
 * d'expiration future suffisent a rendre l'application « connectee ». Le document de decouverte de l'issuer
 * simule est servi par l'API simulee, `loadDiscoveryDocumentAndTryLogin()` n'echoue donc pas, et
 * l'intercepteur pose `Authorization: Bearer jeton-de-test` sur les appels `/api/...`.
 *
 * Les roles ne viennent pas du jeton mais de `GET /api/moi` (RoleService) : cet appel est stubbe ici.
 */

/** Jeton d'acces factice pose dans le stockage de session (aucune signature n'est verifiee cote navigateur). */
export const JETON_DE_TEST = 'jeton-de-test';

export interface UtilisateurSimule {
  /** `sub` du jeton et champ `sujet` de /api/moi. */
  sujet?: string;
  nom?: string;
  /** Roles renvoyes par /api/moi (PATIENT, MEDECIN, ADMIN, PHARMACIE, SECRETAIRE). */
  roles?: string[];
}

/**
 * Rend la page « connectee » avant son chargement (le script d'initialisation s'execute avant l'application) et
 * fait repondre `GET /api/moi` avec les roles demandes. A appeler avant `ouvrir`.
 */
export async function connecter(page: Page, utilisateur: UtilisateurSimule = {}): Promise<void> {
  const sujet = utilisateur.sujet ?? 'u1';
  const nom = utilisateur.nom ?? 'Utilisateur Test';
  const roles = utilisateur.roles ?? ['PATIENT'];

  await page.addInitScript(
    ([sujet, jeton]) => {
      try {
        const heure = Date.now();
        sessionStorage.setItem('access_token', jeton);
        sessionStorage.setItem('access_token_stored_at', String(heure));
        // Expiration dans une heure : hasValidAccessToken() compare cette date a l'heure courante.
        sessionStorage.setItem('expires_at', String(heure + 3_600_000));
        sessionStorage.setItem('granted_scopes', '["openid","profile"]');
        sessionStorage.setItem('id_token_claims_obj', JSON.stringify({ sub: sujet }));
      } catch {
        // Stockage indisponible : le test echouera sur l'etat « non connecte », ce qui est le bon signal.
      }
    },
    [sujet, JETON_DE_TEST],
  );

  await stub(page, '**/api/moi', { corps: { sujet, nom, roles } });
}

/** Raccourci : connexion simulee puis ouverture de la page (hydratation attendue). */
export async function ouvrirConnecte(page: Page, url: string, utilisateur: UtilisateurSimule = {}) {
  await connecter(page, utilisateur);
  return ouvrir(page, url);
}
