import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

/**
 * Reserve une route au role MEDECIN : non connecte → page de connexion Keycloak (retour sur la page
 * demandee) ; connecte sans le role → redirection vers l'accueil.
 */
export const medecinGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const roles = inject(RoleService);
  const router = inject(Router);

  await auth.pret();
  if (!auth.estConnecte()) {
    auth.seConnecter(state.url);
    return false;
  }
  await roles.charger();
  return roles.estMedecin() ? true : router.parseUrl('/');
};
