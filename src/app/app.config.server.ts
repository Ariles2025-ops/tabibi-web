import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { CONFIGURATION_SERVEUR, configurationServeur } from './config/config.service';

/**
 * Configuration de l'application rendue cote serveur (server.ts) : celle du navigateur, plus le rendu serveur et
 * la configuration (API, Keycloak) lue dans l'environnement du processus node au lieu de assets/config.json.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // TABIBI_API_URL_INTERNE (ex. http://backend:8080) : le rendu serveur appelle l'API par le reseau interne,
    // hors de la limite anti-copie par IP ; le navigateur, lui, garde l'adresse publique (assets/config.json).
    { provide: CONFIGURATION_SERVEUR, useFactory: () => configurationServeur(process.env) },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
