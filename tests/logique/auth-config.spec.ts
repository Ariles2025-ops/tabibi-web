import { expect, test } from '@playwright/test';
import { creerAuthConfig } from '../../src/app/auth/auth.config';

/** Parametres OIDC transmis a angular-oauth2-oidc, derives de la configuration chargee a l'execution. */
test.describe('creerAuthConfig', () => {
  test('prend l issuer et le client dans la configuration, en HTTP local sans exiger HTTPS', () => {
    const config = creerAuthConfig(
      { keycloakIssuer: 'http://localhost:8081/realms/tabibi', keycloakClientId: 'tabibi-web' },
      'http://localhost:4200',
    );

    expect(config.issuer).toBe('http://localhost:8081/realms/tabibi');
    expect(config.clientId).toBe('tabibi-web');
    expect(config.redirectUri).toBe('http://localhost:4200');
    expect(config.responseType).toBe('code');
    expect(config.scope).toBe('openid profile');
    expect(config.requireHttps).toBe(false);
  });

  test('exige HTTPS des que l issuer est en HTTPS (deploiement)', () => {
    const config = creerAuthConfig(
      { keycloakIssuer: 'https://auth.tabibi.dz/realms/tabibi', keycloakClientId: 'tabibi-prod' },
      'https://tabibi.dz',
    );

    expect(config.issuer).toBe('https://auth.tabibi.dz/realms/tabibi');
    expect(config.clientId).toBe('tabibi-prod');
    expect(config.redirectUri).toBe('https://tabibi.dz');
    expect(config.requireHttps).toBe(true);
  });
});
