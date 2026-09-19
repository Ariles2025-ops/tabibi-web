import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CHEMIN_CONFIGURATION,
  CONFIGURATION_PAR_DEFAUT,
  ConfigurationApplication,
  normaliserConfiguration,
} from './config.formats';

// Forme, valeurs par defaut, normalisation et variables d'environnement : module pur (`./config.formats`),
// reexporte pour les imports existants (server.ts, app.config.server.ts).
export { CHEMIN_CONFIGURATION, CONFIGURATION_PAR_DEFAUT, configurationDepuisEnvironnement, normaliserConfiguration } from './config.formats';
export type { ConfigurationApplication } from './config.formats';

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
    this.configuration = normaliserConfiguration(lue);
  }
}
