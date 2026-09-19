import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, inject, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { ConfigService } from './config/config.service';

// Dates et nombres en francais (DatePipe : « jeudi 18 septembre à 14:30 »).
registerLocaleData(localeFr);

/**
 * Charge assets/config.json (API, Keycloak) avant le demarrage : les services et la connexion OIDC lisent
 * ensuite ConfigService. Angular 18.2 n'a pas encore provideAppInitializer (19+), d'ou APP_INITIALIZER.
 */
function chargerConfiguration(): () => Promise<void> {
  const config = inject(ConfigService);
  return () => config.charger();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideOAuthClient(),
    // fetch plutot que XMLHttpRequest : recommande des que l'application est aussi rendue cote serveur.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: APP_INITIALIZER, useFactory: chargerConfiguration, multi: true },
    { provide: LOCALE_ID, useValue: 'fr' },
    // Hydratation du HTML rendu par le serveur (SSR) : le DOM est reutilise au lieu d'etre reconstruit, et les
    // reponses GET obtenues pendant le rendu sont transmises au navigateur (cache de transfert HTTP), qui ne les
    // redemande pas. Sans SSR (ng serve, tests), sans effet.
    provideClientHydration(),
  ],
};
