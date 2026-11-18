import { Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

/**
 * Logique commune des gardes d'espace professionnel (medecin, admin, pharmacie, secretaire).
 * - non connecte → page de connexion Keycloak (retour sur la page demandee) ;
 * - /api/moi injoignable (reseau, 5xx) → une nouvelle tentative, puis page « compte indisponible »
 *   (jamais l'accueil : l'utilisateur n'est pas « sans le role ») ;
 * - /api/moi a repondu sans le role → accueil.
 */
export async function verifierRole(
  auth: AuthService,
  roles: RoleService,
  router: Router,
  url: string,
  aLeRole: () => boolean,
): Promise<boolean | UrlTree> {
  await auth.pret();
  if (!auth.estConnecte()) {
    auth.seConnecter(url);
    return false;
  }
  let moi = await roles.charger();
  if (moi === null) moi = await roles.recharger();
  if (moi === null) return router.createUrlTree(['/compte-indisponible'], { queryParams: { retour: url } });
  return aLeRole() ? true : router.parseUrl('/');
}
