import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

/**
 * Reserve une route au role ADMIN (meme modele que medecinGuard) : non connecte → page de connexion
 * Keycloak (retour sur la page demandee) ; connecte sans le role → redirection vers l'accueil.
 * L'autorisation reelle reste cote API (/api/admin/** verrouille au role ADMIN).
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const roles = inject(RoleService);
  const router = inject(Router);

  await auth.pret();
  if (!auth.estConnecte()) {
    auth.seConnecter(state.url);
    return false;
  }
  await roles.charger();
  return roles.estAdmin() ? true : router.parseUrl('/');
};
