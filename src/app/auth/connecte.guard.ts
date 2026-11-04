import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Reserve une route aux personnes connectees, quel que soit leur role : non connecte → page de connexion
 * Keycloak (retour sur la page demandee). Sert a la candidature : on s'inscrit patient, le role MEDECIN
 * est donne quand l'administrateur valide.
 */
export const connecteGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);

  await auth.pret();
  if (!auth.estConnecte()) {
    auth.seConnecter(state.url);
    return false;
  }
  return true;
};
