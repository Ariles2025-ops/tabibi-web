import { AuthConfig } from 'angular-oauth2-oidc';

/** Ce que la connexion Keycloak attend de la configuration chargee a l'execution (ConfigService). */
export interface ParametresKeycloak {
  keycloakIssuer: string;
  keycloakClientId: string;
}

/**
 * Connexion au realm Keycloak : issuer et client lus dans `assets/config.json` (« tabibi », « tabibi-web » en dev).
 * HTTPS n'est exige que si l'issuer est lui-meme en HTTPS (deploiement) ; en dev, Keycloak tourne en HTTP local.
 */
export function creerAuthConfig(parametres: ParametresKeycloak): AuthConfig {
  return {
    issuer: parametres.keycloakIssuer,
    redirectUri: window.location.origin,
    clientId: parametres.keycloakClientId,
    responseType: 'code',
    scope: 'openid profile',
    requireHttps: parametres.keycloakIssuer.startsWith('https://'),
  };
}
