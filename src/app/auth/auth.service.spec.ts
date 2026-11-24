import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { ConfigService } from '../config/config.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  // Pre-lancement : les tests de connexion s'executent avec l'acces equipe.
  beforeEach(() => localStorage.setItem('tabibi.equipe', '1'));
  afterEach(() => localStorage.removeItem('tabibi.equipe'));

  it('phase de test : sans acces equipe, la connexion est ouverte mais pas l\'inscription', async () => {
    localStorage.removeItem('tabibi.equipe');
    const { connexionFermee, inscriptionFermee } = await import('../lancement');
    expect(connexionFermee()).toBeFalse();
    expect(inscriptionFermee()).toBeTrue();
  });

  it('phase de test sans acces equipe : « Créer un compte » mene a /bientot, sans passer par Keycloak', async () => {
    localStorage.removeItem('tabibi.equipe');
    const auth = configurer('browser');
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    expect(auth.inscriptionOuverte()).toBeFalse();
    await auth.sInscrireParEmail('/');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bientot');
    expect(oauth.initCodeFlow).not.toHaveBeenCalled();
  });

  let oauth: jasmine.SpyObj<OAuthService>;
  let config: { charger: jasmine.Spy; keycloakIssuer: string; keycloakClientId: string };

  function configurer(plateforme: 'browser' | 'server') {
    oauth = jasmine.createSpyObj<OAuthService>('OAuthService', [
      'configure', 'loadDiscoveryDocumentAndTryLogin', 'hasValidAccessToken', 'initCodeFlow', 'logOut',
      'getRefreshToken', 'refreshToken', 'setupAutomaticSilentRefresh',
    ], { state: '' });
    oauth.loadDiscoveryDocumentAndTryLogin.and.resolveTo(true);
    oauth.hasValidAccessToken.and.returnValue(true);
    config = { charger: jasmine.createSpy('charger').and.resolveTo(), keycloakIssuer: 'http://localhost:8081/realms/tabibi', keycloakClientId: 'tabibi-web' };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OAuthService, useValue: oauth },
        { provide: ConfigService, useValue: config },
        { provide: PLATFORM_ID, useValue: plateforme },
      ],
    });
    return TestBed.inject(AuthService);
  }

  it('dans le navigateur : attend la configuration, configure l OIDC puis charge le discovery document', async () => {
    const auth = configurer('browser');

    await auth.initialiser();

    expect(config.charger).toHaveBeenCalled();
    expect(oauth.configure).toHaveBeenCalledWith(jasmine.objectContaining({ issuer: 'http://localhost:8081/realms/tabibi', clientId: 'tabibi-web' }));
    expect(oauth.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(1);
    expect(auth.estConnecte()).toBeTrue();

    await auth.seConnecter('/moi');
    expect(oauth.initCodeFlow).toHaveBeenCalledWith('/moi', { prompt: 'login' });
  });

  it('cote serveur (SSR) : aucune initialisation OIDC, jamais connecte, connexion et deconnexion sans effet', async () => {
    const auth = configurer('server');

    await auth.initialiser();
    await auth.pret();
    await auth.seConnecter('/moi');
    auth.seDeconnecter();

    expect(oauth.configure).not.toHaveBeenCalled();
    expect(oauth.loadDiscoveryDocumentAndTryLogin).not.toHaveBeenCalled();
    expect(oauth.initCodeFlow).not.toHaveBeenCalled();
    expect(oauth.logOut).not.toHaveBeenCalled();
    expect(auth.estConnecte()).toBeFalse();
  });
});
