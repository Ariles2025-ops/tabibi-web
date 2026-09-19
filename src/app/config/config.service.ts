import { Injectable, InjectionToken, inject } from '@angular/core';
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
 * Configuration fournie par le serveur de rendu (SSR) a la place de `assets/config.json` : `app.config.server.ts`
 * la lit dans les variables d'environnement du processus node (`configurationDepuisEnvironnement`). Absente dans
 * le navigateur, ou le fichier est charge par HTTP.
 */
export const CONFIGURATION_SERVEUR = new InjectionToken<Partial<ConfigurationApplication>>('CONFIGURATION_SERVEUR');

/**
 * Configuration chargee a l'execution, avant le demarrage de l'application (APP_INITIALIZER dans app.config.ts) :
 * le meme build sert en dev, en recette et en production, seul `assets/config.json` change. Si le fichier est
 * absent ou illisible, les valeurs localhost s'appliquent avec un avertissement dans la console ; un champ
 * manquant ou vide est complete par sa valeur par defaut. Cote serveur (SSR), `CONFIGURATION_SERVEUR` remplace
 * le fichier : un chemin relatif n'aurait pas de sens hors du navigateur.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private serveur = inject(CONFIGURATION_SERVEUR, { optional: true });
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
      this.chargement = this.serveur
        ? Promise.resolve(this.appliquer(this.serveur))
        : firstValueFrom(this.http.get<Partial<ConfigurationApplication>>(CHEMIN_CONFIGURATION))
            .then((lue) => this.appliquer(lue))
            .catch((e) => {
              console.warn(`Configuration ${CHEMIN_CONFIGURATION} absente ou illisible : valeurs localhost par defaut.`, e);
              this.configuration = { ...CONFIGURATION_PAR_DEFAUT };
            });
    }
    return this.chargement;
  }

  private appliquer(lue: Partial<ConfigurationApplication> | null | undefined): void {
    this.configuration = {
      apiUrl: sansBarreFinale(valeur(lue?.apiUrl, CONFIGURATION_PAR_DEFAUT.apiUrl)),
      keycloakIssuer: sansBarreFinale(valeur(lue?.keycloakIssuer, CONFIGURATION_PAR_DEFAUT.keycloakIssuer)),
      keycloakClientId: valeur(lue?.keycloakClientId, CONFIGURATION_PAR_DEFAUT.keycloakClientId),
    };
  }
}

/**
 * Configuration lue dans les variables d'environnement du serveur de rendu : les memes que celles de l'image Docker
 * (`TABIBI_API_URL`, `TABIBI_KEYCLOAK_ISSUER`, `TABIBI_KEYCLOAK_CLIENT_ID`) ; sans elles, `DOMAINE` (le `.env` de
 * docker-compose.prod.yml) donne `https://api.DOMAINE` et `https://auth.DOMAINE/realms/tabibi` ; sinon un champ
 * absent est complete par sa valeur par defaut a l'application (`charger()`).
 */
export function configurationDepuisEnvironnement(env: Record<string, string | undefined>): Partial<ConfigurationApplication> {
  const domaine = env['DOMAINE']?.trim();
  return {
    apiUrl: env['TABIBI_API_URL'] || (domaine ? `https://api.${domaine}` : undefined),
    keycloakIssuer: env['TABIBI_KEYCLOAK_ISSUER'] || (domaine ? `https://auth.${domaine}/realms/tabibi` : undefined),
    keycloakClientId: env['TABIBI_KEYCLOAK_CLIENT_ID'],
  };
}

/** La valeur lue si c'est une chaine non vide (espaces retires), sinon la valeur par defaut. */
function valeur(lue: unknown, parDefaut: string): string {
  return typeof lue === 'string' && lue.trim() ? lue.trim() : parDefaut;
}

/** « https://api.tabibi.dz/ » → « https://api.tabibi.dz » (les chemins sont ensuite concatenes avec `/api/...`). */
function sansBarreFinale(url: string): string {
  return url.replace(/\/+$/, '');
}
