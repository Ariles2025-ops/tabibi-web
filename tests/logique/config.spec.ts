import { expect, test } from '@playwright/test';
import {
  CONFIGURATION_PAR_DEFAUT,
  configurationDepuisEnvironnement,
  normaliserConfiguration,
} from '../../src/app/config/config.formats';

/**
 * Forme de la configuration a l'execution : valeurs par defaut, normalisation des URL et lecture des variables
 * d'environnement du serveur de rendu. Le chargement HTTP de `assets/config.json` (une seule fois, repli sur
 * localhost si le fichier manque) est verifie dans le projet `navigateur`.
 */

test.describe('normaliserConfiguration', () => {
  test('retire la barre oblique finale des URL et retire les espaces', () => {
    const config = normaliserConfiguration({
      apiUrl: ' https://api.tabibi.dz/ ',
      keycloakIssuer: 'https://auth.tabibi.dz/realms/tabibi//',
      keycloakClientId: 'tabibi-prod',
    });

    expect(config.apiUrl).toBe('https://api.tabibi.dz');
    expect(config.keycloakIssuer).toBe('https://auth.tabibi.dz/realms/tabibi');
    expect(config.keycloakClientId).toBe('tabibi-prod');
  });

  test('complete un champ manquant ou vide par sa valeur par defaut', () => {
    const config = normaliserConfiguration({ apiUrl: 'https://api.tabibi.dz', keycloakIssuer: '' });

    expect(config.apiUrl).toBe('https://api.tabibi.dz');
    expect(config.keycloakIssuer).toBe(CONFIGURATION_PAR_DEFAUT.keycloakIssuer);
    expect(config.keycloakClientId).toBe(CONFIGURATION_PAR_DEFAUT.keycloakClientId);
  });

  test('sans rien de lu, les valeurs localhost du poste de developpement', () => {
    expect(normaliserConfiguration(null)).toEqual(CONFIGURATION_PAR_DEFAUT);
    expect(CONFIGURATION_PAR_DEFAUT).toEqual({
      apiUrl: 'http://localhost:8080',
      keycloakIssuer: 'http://localhost:8081/realms/tabibi',
      keycloakClientId: 'tabibi-web',
    });
  });
});

test.describe('configurationDepuisEnvironnement', () => {
  test('lit TABIBI_API_URL, TABIBI_KEYCLOAK_ISSUER et TABIBI_KEYCLOAK_CLIENT_ID', () => {
    expect(
      configurationDepuisEnvironnement({
        TABIBI_API_URL: 'https://api.recette.tabibi.dz',
        TABIBI_KEYCLOAK_ISSUER: 'https://auth.recette.tabibi.dz/realms/tabibi',
        TABIBI_KEYCLOAK_CLIENT_ID: 'tabibi-recette',
        DOMAINE: 'ignore.example',
      }),
    ).toEqual({
      apiUrl: 'https://api.recette.tabibi.dz',
      keycloakIssuer: 'https://auth.recette.tabibi.dz/realms/tabibi',
      keycloakClientId: 'tabibi-recette',
    });
  });

  test('derive api. et auth. de DOMAINE (docker-compose.prod.yml du backend) quand les variables manquent', () => {
    expect(configurationDepuisEnvironnement({ DOMAINE: ' tabibi.example ' })).toEqual({
      apiUrl: 'https://api.tabibi.example',
      keycloakIssuer: 'https://auth.tabibi.example/realms/tabibi',
      keycloakClientId: undefined,
    });
  });

  test('ne fournit rien sans variable (les valeurs par defaut s appliquent au chargement)', () => {
    expect(configurationDepuisEnvironnement({ TABIBI_API_URL: '' })).toEqual({
      apiUrl: undefined,
      keycloakIssuer: undefined,
      keycloakClientId: undefined,
    });
  });
});
