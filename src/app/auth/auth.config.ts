import type { AuthConfig } from 'angular-oauth2-oidc';

/**
 * Connexion au realm Keycloak. Module pur (import de type seulement, et l'origine du site est passee en
 * parametre plutot que lue sur `window`) : il est importe tel quel par les tests du projet `logique`.
 */

/** Ce que la connexion Keycloak attend de la configuration chargee a l'execution (ConfigService). */
export interface ParametresKeycloak {
  keycloakIssuer: string;
  keycloakClientId: string;
}

/**
 * Connexion au realm Keycloak : issuer et client lus dans `assets/config.json` (« tabibi », « tabibi-web » en dev),
 * `origine` etant celle du site (`window.location.origin`), ou Keycloak renvoie le visiteur apres connexion.
 * HTTPS n'est exige que si l'issuer est lui-meme en HTTPS (deploiement) ; en dev, Keycloak tourne en HTTP local.
 */
export function creerAuthConfig(parametres: ParametresKeycloak, origine: string): AuthConfig {
  return {
    issuer: parametres.keycloakIssuer,
    redirectUri: origine,
    clientId: parametres.keycloakClientId,
    responseType: 'code',
    scope: 'openid profile',
    requireHttps: parametres.keycloakIssuer.startsWith('https://'),
  };
}
