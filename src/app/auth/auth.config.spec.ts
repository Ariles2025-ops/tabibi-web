import { creerAuthConfig } from './auth.config';

describe('creerAuthConfig', () => {
  it('prend l issuer et le client dans la configuration, en HTTP local sans exiger HTTPS', () => {
    const config = creerAuthConfig({ keycloakIssuer: 'http://localhost:8081/realms/tabibi', keycloakClientId: 'tabibi-web' });

    expect(config.issuer).toBe('http://localhost:8081/realms/tabibi');
    expect(config.clientId).toBe('tabibi-web');
    expect(config.redirectUri).toBe(window.location.origin);
    expect(config.responseType).toBe('code');
    expect(config.scope).toBe('openid profile');
    expect(config.requireHttps).toBeFalse();
  });

  it('exige HTTPS des que l issuer est en HTTPS (deploiement)', () => {
    const config = creerAuthConfig({ keycloakIssuer: 'https://auth.tabibi.dz/realms/tabibi', keycloakClientId: 'tabibi-prod' });

    expect(config.issuer).toBe('https://auth.tabibi.dz/realms/tabibi');
    expect(config.clientId).toBe('tabibi-prod');
    expect(config.requireHttps).toBeTrue();
  });
});
