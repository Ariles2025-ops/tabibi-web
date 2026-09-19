import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Configuration de l'application, lue a l'execution dans `assets/config.json` (remplace au deploiement). */
export interface ConfigurationApplication {
  /** Origine de l'API Tabibi, sans barre oblique finale (ex. https://api.tabibi.dz). */
  apiUrl: string;
  /** Issuer OIDC du realm Keycloak (ex. https://auth.tabibi.dz/realms/tabibi). */
  keycloakIssuer: string;
  /** Client public OIDC du front web. */
  keycloakClientId: string;
}

/** Chemin du fichier, relatif a la base du document (`<base href>`), pour fonctionner aussi sous un sous-chemin. */
export const CHEMIN_CONFIGURATION = 'assets/config.json';

/** Valeurs de repli, celles du poste de developpement (API et Keycloak lances en local). */
export const CONFIGURATION_PAR_DEFAUT: ConfigurationApplication = {
  apiUrl: 'http://localhost:8080',
  keycloakIssuer: 'http://localhost:8081/realms/tabibi',
  keycloakClientId: 'tabibi-web',
};

/**
 * Configuration chargee a l'execution, avant le demarrage de l'application (APP_INITIALIZER dans app.config.ts) :
 * le meme build sert en dev, en recette et en production, seul `assets/config.json` change. Si le fichier est
 * absent ou illisible, les valeurs localhost s'appliquent avec un avertissement dans la console ; un champ
 * manquant ou vide est complete par sa valeur par defaut.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private configuration: ConfigurationApplication = { ...CONFIGURATION_PAR_DEFAUT };
  private chargement: Promise<void> | null = null;

  get apiUrl(): string {
    return this.configuration.apiUrl;
  }

  get keycloakIssuer(): string {
    return this.configuration.keycloakIssuer;
  }

  get keycloakClientId(): string {
    return this.configuration.keycloakClientId;
  }

  /** Charge le fichier une seule fois (les appels suivants renvoient la meme promesse) ; ne rejette jamais. */
  charger(): Promise<void> {
    if (!this.chargement) {
      this.chargement = firstValueFrom(this.http.get<Partial<ConfigurationApplication>>(CHEMIN_CONFIGURATION))
        .then((lue) => {
          this.configuration = {
            apiUrl: sansBarreFinale(valeur(lue?.apiUrl, CONFIGURATION_PAR_DEFAUT.apiUrl)),
            keycloakIssuer: sansBarreFinale(valeur(lue?.keycloakIssuer, CONFIGURATION_PAR_DEFAUT.keycloakIssuer)),
            keycloakClientId: valeur(lue?.keycloakClientId, CONFIGURATION_PAR_DEFAUT.keycloakClientId),
          };
        })
        .catch((e) => {
          console.warn(`Configuration ${CHEMIN_CONFIGURATION} absente ou illisible : valeurs localhost par defaut.`, e);
          this.configuration = { ...CONFIGURATION_PAR_DEFAUT };
        });
    }
    return this.chargement;
  }
}

/** La valeur lue si c'est une chaine non vide (espaces retires), sinon la valeur par defaut. */
function valeur(lue: unknown, parDefaut: string): string {
  return typeof lue === 'string' && lue.trim() ? lue.trim() : parDefaut;
}

/** « https://api.tabibi.dz/ » → « https://api.tabibi.dz » (les chemins sont ensuite concatenes avec `/api/...`). */
function sansBarreFinale(url: string): string {
  return url.replace(/\/+$/, '');
}
