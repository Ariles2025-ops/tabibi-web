import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';
import { verifierRole } from './verifier-role';

/**
 * Reserve une route au role MEDECIN : non connecte → page de connexion Keycloak (retour sur la page
 * demandee) ; connecte sans le role → redirection vers l'accueil ;
 * profil (/api/moi) illisible → page « compte indisponible » (voir verifierRole).
 */
export const medecinGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const roles = inject(RoleService);
  const router = inject(Router);

  return verifierRole(auth, roles, router, state.url, roles.estMedecin);
};
