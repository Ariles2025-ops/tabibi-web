import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { ConfigService } from '../config/config.service';
import { creerAuthConfig } from './auth.config';

/**
 * Fin wrapper d'OAuthService (Keycloak) : initialisation unique de l'OIDC
 * et etat de connexion, partages par toutes les pages.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private oauth = inject(OAuthService);
  private router = inject(Router);
  private config = inject(ConfigService);
  private initialisation: Promise<void> | null = null;

  /**
   * Attend la configuration (issuer et client Keycloak lus dans assets/config.json ; deja chargee par
   * l'APP_INITIALIZER, l'attente est alors immediate), configure l'OIDC, puis charge le discovery document
   * et traite un eventuel retour de Keycloak (?code=...). Appelee une seule fois par AppComponent ;
   * les appels suivants renvoient la meme promesse.
   */
  initialiser(): Promise<void> {
    if (!this.initialisation) {
      this.initialisation = this.config
        .charger()
        .then(() => {
          this.oauth.configure(creerAuthConfig(this.config));
          return this.oauth.loadDiscoveryDocumentAndTryLogin();
        })
        .then(() => this.revenirApresConnexion())
        .catch((e) => console.error('Initialisation OIDC impossible', e));
    }
    return this.initialisation;
  }

  /** Resolue une fois l'initialisation terminee : a attendre avant de lire estConnecte(). */
  pret(): Promise<void> {
    return this.initialiser();
  }

  estConnecte(): boolean {
    return this.oauth.hasValidAccessToken();
  }

  /**
   * Redirige vers la page de connexion Keycloak. Apres connexion, l'utilisateur
   * revient sur `retour` (la page courante par defaut), transmis via le `state` OIDC.
   */
  async seConnecter(retour: string = this.router.url): Promise<void> {
    await this.initialiser();
    this.oauth.initCodeFlow(retour);
  }

  seDeconnecter(): void {
    this.oauth.logOut();
  }

  /** Apres un retour de Keycloak, reprend la navigation vers la page demandee avant la connexion. */
  private revenirApresConnexion(): void {
    const etat = this.oauth.state;
    if (!etat) return;
    this.oauth.state = '';
    const cible = etat.startsWith('/') ? etat : decodeURIComponent(etat);
    if (cible.startsWith('/')) {
      this.router.navigateByUrl(cible);
    }
  }
}
