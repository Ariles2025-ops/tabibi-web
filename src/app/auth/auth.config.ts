import { AuthConfig } from 'angular-oauth2-oidc';

/** Connexion au realm Keycloak « tabibi ». */
export const authConfig: AuthConfig = {
  issuer: 'http://localhost:8081/realms/tabibi',
  redirectUri: window.location.origin,
  clientId: 'tabibi-web',
  responseType: 'code',
  scope: 'openid profile',
  requireHttps: false, // dev uniquement
};
