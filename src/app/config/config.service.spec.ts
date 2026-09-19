import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CHEMIN_CONFIGURATION,
  CONFIGURATION_PAR_DEFAUT,
  CONFIGURATION_SERVEUR,
  ConfigService,
  configurationDepuisEnvironnement,
} from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('expose les valeurs localhost tant que le fichier n est pas charge', () => {
    expect(service.apiUrl).toBe('http://localhost:8080');
    expect(service.keycloakIssuer).toBe('http://localhost:8081/realms/tabibi');
    expect(service.keycloakClientId).toBe('tabibi-web');
  });

  it('charge assets/config.json par GET et expose apiUrl, keycloakIssuer et keycloakClientId', async () => {
    const chargement = service.charger();

    const requete = http.expectOne(CHEMIN_CONFIGURATION);
    expect(requete.request.method).toBe('GET');
    requete.flush({ apiUrl: 'https://api.tabibi.dz', keycloakIssuer: 'https://auth.tabibi.dz/realms/tabibi', keycloakClientId: 'tabibi-prod' });
    await chargement;

    expect(service.apiUrl).toBe('https://api.tabibi.dz');
    expect(service.keycloakIssuer).toBe('https://auth.tabibi.dz/realms/tabibi');
    expect(service.keycloakClientId).toBe('tabibi-prod');
  });

  it('retire la barre oblique finale des URL et complete un champ manquant ou vide par sa valeur par defaut', async () => {
    const chargement = service.charger();

    http.expectOne(CHEMIN_CONFIGURATION).flush({ apiUrl: ' https://api.tabibi.dz/ ', keycloakIssuer: '' });
    await chargement;

    expect(service.apiUrl).toBe('https://api.tabibi.dz');
    expect(service.keycloakIssuer).toBe(CONFIGURATION_PAR_DEFAUT.keycloakIssuer);
    expect(service.keycloakClientId).toBe(CONFIGURATION_PAR_DEFAUT.keycloakClientId);
  });

  it('se replie sur les valeurs localhost, avec un avertissement, si le fichier est absent (404)', async () => {
    const avertissement = spyOn(console, 'warn');
    const chargement = service.charger();

    http.expectOne(CHEMIN_CONFIGURATION).flush('Not Found', { status: 404, statusText: 'Not Found' });
    await expectAsync(chargement).toBeResolved();

    expect(service.apiUrl).toBe(CONFIGURATION_PAR_DEFAUT.apiUrl);
    expect(service.keycloakIssuer).toBe(CONFIGURATION_PAR_DEFAUT.keycloakIssuer);
    expect(service.keycloakClientId).toBe(CONFIGURATION_PAR_DEFAUT.keycloakClientId);
    expect(avertissement).toHaveBeenCalled();
  });

  it('ne lit le fichier qu une seule fois', async () => {
    const premier = service.charger();
    const second = service.charger();

    http.expectOne(CHEMIN_CONFIGURATION).flush({ apiUrl: 'https://api.tabibi.dz' });
    await Promise.all([premier, second]);

    expect(second).toBe(premier);
    expect(service.apiUrl).toBe('https://api.tabibi.dz');
    http.expectNone(CHEMIN_CONFIGURATION);
  });

  describe('cote serveur (CONFIGURATION_SERVEUR fournie par app.config.server.ts)', () => {
    it('prend la configuration fournie sans lire assets/config.json', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: CONFIGURATION_SERVEUR, useValue: { apiUrl: 'https://api.tabibi.dz/', keycloakIssuer: 'https://auth.tabibi.dz/realms/tabibi' } },
        ],
      });
      service = TestBed.inject(ConfigService);
      http = TestBed.inject(HttpTestingController);

      await service.charger();

      http.expectNone(CHEMIN_CONFIGURATION);
      expect(service.apiUrl).toBe('https://api.tabibi.dz');
      expect(service.keycloakIssuer).toBe('https://auth.tabibi.dz/realms/tabibi');
      expect(service.keycloakClientId).toBe(CONFIGURATION_PAR_DEFAUT.keycloakClientId);
    });
  });
});

describe('configurationDepuisEnvironnement', () => {
  it('lit TABIBI_API_URL, TABIBI_KEYCLOAK_ISSUER et TABIBI_KEYCLOAK_CLIENT_ID', () => {
    expect(configurationDepuisEnvironnement({
      TABIBI_API_URL: 'https://api.recette.tabibi.dz',
      TABIBI_KEYCLOAK_ISSUER: 'https://auth.recette.tabibi.dz/realms/tabibi',
      TABIBI_KEYCLOAK_CLIENT_ID: 'tabibi-recette',
      DOMAINE: 'ignore.example',
    })).toEqual({
      apiUrl: 'https://api.recette.tabibi.dz',
      keycloakIssuer: 'https://auth.recette.tabibi.dz/realms/tabibi',
      keycloakClientId: 'tabibi-recette',
    });
  });

  it('derive api. et auth. de DOMAINE (docker-compose.prod.yml du backend) quand les variables manquent', () => {
    expect(configurationDepuisEnvironnement({ DOMAINE: ' tabibi.example ' })).toEqual({
      apiUrl: 'https://api.tabibi.example',
      keycloakIssuer: 'https://auth.tabibi.example/realms/tabibi',
      keycloakClientId: undefined,
    });
  });

  it('ne fournit rien sans variable (les valeurs par defaut s appliquent au chargement)', () => {
    expect(configurationDepuisEnvironnement({ TABIBI_API_URL: '' })).toEqual({
      apiUrl: undefined,
      keycloakIssuer: undefined,
      keycloakClientId: undefined,
    });
  });
});
