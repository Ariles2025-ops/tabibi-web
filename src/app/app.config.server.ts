import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { CONFIGURATION_SERVEUR, configurationDepuisEnvironnement } from './config/config.service';

/**
 * Configuration de l'application rendue cote serveur (server.ts) : celle du navigateur, plus le rendu serveur et
 * la configuration (API, Keycloak) lue dans l'environnement du processus node au lieu de assets/config.json.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    { provide: CONFIGURATION_SERVEUR, useFactory: () => configurationDepuisEnvironnement(process.env) },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
