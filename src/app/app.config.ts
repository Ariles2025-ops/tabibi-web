import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, inject, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: APP_INITIALIZER, useFactory: chargerConfiguration, multi: true },
    { provide: LOCALE_ID, useValue: 'fr' },
  ],
};
