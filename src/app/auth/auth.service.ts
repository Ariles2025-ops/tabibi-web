import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { ConfigService } from '../config/config.service';
import { creerAuthConfig } from './auth.config';
import { connexionFermee } from '../lancement';

/**
 * Fin wrapper d'OAuthService (Keycloak) : initialisation unique de l'OIDC
 * et etat de connexion, partages par toutes les pages.
 *
 * Cote serveur (rendu SSR), il n'y a ni session ni jeton : l'OIDC n'est pas configure (window, sessionStorage
 * et la redirection vers Keycloak n'existent pas), l'utilisateur est toujours « non connecte » et les demandes
 * de connexion ou de deconnexion sont sans effet ; le navigateur les rejoue apres l'hydratation.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private oauth = inject(OAuthService);
  private router = inject(Router);
  private config = inject(ConfigService);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private initialisation: Promise<void> | null = null;
  private zone = inject(NgZone);
  private derniereActivite = Date.now();

  /** Donnees de sante : deconnexion automatique apres 15 minutes sans aucune action. */
  static readonly INACTIVITE_MAX_MS = 15 * 60 * 1000;

  /**
   * Attend la configuration (issuer et client Keycloak lus dans assets/config.json ; deja chargee par
   * l'APP_INITIALIZER, l'attente est alors immediate), configure l'OIDC, puis charge le discovery document
   * et traite un eventuel retour de Keycloak (?code=...). Appelee une seule fois par AppComponent ;
   * les appels suivants renvoient la meme promesse.
   */
  initialiser(): Promise<void> {
    if (!this.initialisation) {
      // Pre-lancement, visiteur sans acces equipe : personne ne peut se connecter, donc on ne contacte pas Keycloak
      // (evite une requete discovery inutile, bloquee par CORS quand le site est ouvert depuis un autre domaine).
      this.initialisation = !this.navigateur || connexionFermee()
        ? Promise.resolve()
        : this.config
            .charger()
            .then(() => {
              this.oauth.configure(creerAuthConfig(this.config));
              return this.oauth.loadDiscoveryDocumentAndTryLogin();
            })
            .then(() => this.garderLaSession())
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
    return this.navigateur && this.oauth.hasValidAccessToken();
  }

  /** Page « Lancement prochainement » dans la langue de la page courante (/ar/... -> version arabe). */
  private pageBientot(): string {
    const url = this.router.url;
    return url === '/ar' || url.startsWith('/ar/') || url.startsWith('/ar?') ? '/ar/bientot' : '/bientot';
  }

  /**
   * Redirige vers la page de connexion Keycloak. Apres connexion, l'utilisateur
   * revient sur `retour` (la page courante par defaut), transmis via le `state` OIDC.
   */
  async seConnecter(retour: string = this.router.url): Promise<void> {
    if (!this.navigateur) return;
    // Pre-lancement : pas de connexion, page « Lancement prochainement ».
    if (connexionFermee()) { this.router.navigateByUrl(this.pageBientot()); return; }
    await this.initialiser();
    // Mot de passe exige a chaque connexion, meme si une session Keycloak existe encore dans ce navigateur.
    this.oauth.initCodeFlow(retour, { prompt: 'login' });
  }

  /**
   * Inscription par e-mail : redirige directement vers le formulaire d'inscription Keycloak
   * (endpoint /registrations au lieu de /auth), avec les memes parametres OIDC (dont PKCE).
   * initCodeFlow part de `loginUrl` ; on le pointe sur l'endpoint d'inscription juste avant la redirection
   * (la page quitte aussitot vers Keycloak, l'etat n'a pas besoin d'etre restaure).
   */
  async sInscrireParEmail(retour: string = this.router.url): Promise<void> {
    if (!this.navigateur) return;
    if (connexionFermee()) { this.router.navigateByUrl(this.pageBientot()); return; }
    await this.initialiser();
    const urlAuth = this.oauth.loginUrl || '';
    // Cibler l'endpoint precis (pas le "/auth" present dans l'hote auth.tabibi.doctor).
    if (urlAuth.includes('/openid-connect/auth')) {
      this.oauth.loginUrl = urlAuth.replace('/openid-connect/auth', '/openid-connect/registrations');
    }
    this.oauth.initCodeFlow(retour);
  }

  /** Relit les roles apres un changement cote serveur (ex. invitation de secretaire acceptee) via le jeton de rafraichissement. */
  async actualiserRoles(): Promise<void> {
    if (!this.navigateur || !this.oauth.getRefreshToken()) return;
    try {
      await this.oauth.refreshToken();
    } catch {
      // Les nouveaux roles seront pris a la prochaine connexion.
    }
  }

  seDeconnecter(): void {
    if (!this.navigateur) return;
    this.oauth.logOut();
  }

  /**
   * Le jeton d'acces Keycloak ne vit que 5 minutes : sans renouvellement, l'utilisateur serait renvoye vers la
   * connexion en pleine saisie. On renouvelle un jeton expire au chargement (jeton de rafraichissement), puis
   * automatiquement avant chaque expiration, tant que la session Keycloak est active.
   */
  private async garderLaSession(): Promise<void> {
    const rafraichissable = !!this.oauth.getRefreshToken();
    if (rafraichissable && !this.oauth.hasValidAccessToken()) {
      try {
        await this.oauth.refreshToken();
      } catch {
        // Session Keycloak terminee : l'utilisateur se reconnectera a sa prochaine action.
      }
    }
    if (rafraichissable) {
      this.oauth.setupAutomaticSilentRefresh();
    }
    this.surveillerInactivite();
  }

  /**
   * Le renouvellement automatique garderait la session ouverte indefiniment sur un onglet oublie (ordinateur
   * partage, cybercafe) : sans clic, frappe, defilement ni toucher pendant 15 minutes, on deconnecte.
   */
  private surveillerInactivite(): void {
    const marquer = () => (this.derniereActivite = Date.now());
    this.zone.runOutsideAngular(() => {
      for (const evt of ['click', 'keydown', 'scroll', 'touchstart', 'mousemove']) {
        window.addEventListener(evt, marquer, { passive: true });
      }
      // Onglet en veille ou ordinateur mis en veille : verifier aussi au retour sur l'onglet.
      document.addEventListener('visibilitychange', () => this.verifierInactivite());
      setInterval(() => this.verifierInactivite(), 30_000);
    });
  }

  private verifierInactivite(): void {
    if (!this.oauth.getRefreshToken() && !this.oauth.hasValidAccessToken()) return;
    if (Date.now() - this.derniereActivite > AuthService.INACTIVITE_MAX_MS) {
      this.zone.run(() => this.seDeconnecter());
    }
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
