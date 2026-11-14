import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { ClocheNotificationsComponent } from './notifications/cloche-notifications.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClocheNotificationsComponent],
  template: `
    <div class="shell">
      <aside class="side">
        <a class="side__brand" routerLink="/">tabibi<i>.</i></a>
        <nav class="side__nav">
          <a class="side__home" routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
          <a *ngIf="estPatient()" routerLink="/mes-rendez-vous" routerLinkActive="actif">Mes rendez-vous</a>
          <a *ngIf="estPatient()" routerLink="/mes-ordonnances" routerLinkActive="actif">Mes ordonnances</a>
          <a *ngIf="estPatient()" routerLink="/teleconsultations" routerLinkActive="actif">Mes téléconsultations</a>
          <a *ngIf="estPatient()" routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
          <a *ngIf="estPatient()" routerLink="/mes-avis" routerLinkActive="actif">Mes avis</a>
          <a *ngIf="estPatient()" routerLink="/dawini" routerLinkActive="actif">Dawini</a>
          <a *ngIf="estPatient()" routerLink="/liste-attente" routerLinkActive="actif">Mes listes d'attente</a>

          <div *ngIf="estMedecin()" class="side__group">
            <div class="side__grouptitle">Espace médecin</div>
            <a routerLink="/medecin/agenda" routerLinkActive="actif">Agenda</a>
            <a routerLink="/medecin/disponibilites" routerLinkActive="actif">Disponibilités</a>
            <a routerLink="/medecin/ordonnances" routerLinkActive="actif">Mes ordonnances rédigées</a>
            <a routerLink="/medecin/teleconsultations" routerLinkActive="actif">Téléconsultations</a>
            <a routerLink="/medecin/candidature" routerLinkActive="actif">Ma candidature</a>
            <a routerLink="/medecin/avis" routerLinkActive="actif">Avis des patients</a>
            <a routerLink="/medecin/liste-attente" routerLinkActive="actif">Liste d'attente</a>
            <a routerLink="/medecin/secretaires" routerLinkActive="actif">Mes secrétaires</a>
          </div>

          <div *ngIf="estSecretaire()" class="side__group">
            <div class="side__grouptitle">Espace secrétaire</div>
            <a routerLink="/secretaire" routerLinkActive="actif">Agenda du cabinet</a>
          </div>

          <div *ngIf="estPharmacie()" class="side__group">
            <div class="side__grouptitle">Espace pharmacie</div>
            <a routerLink="/pharmacie" routerLinkActive="actif">Demandes de médicaments</a>
          </div>

          <div *ngIf="estAdmin()" class="side__group">
            <div class="side__grouptitle">Administration</div>
            <a routerLink="/admin" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Tableau de bord</a>
            <a routerLink="/admin/candidatures" routerLinkActive="actif">Candidatures</a>
            <a routerLink="/admin/avis" routerLinkActive="actif">Modération des avis</a>
          </div>

          <div class="side__account">
            <ng-container *ngIf="!connecte()">
              <a class="side__pro" routerLink="/praticien">Vous êtes praticien ?</a>
              <a class="side__help" href="#aide">Centre d'aide</a>
              <a class="side__login" (click)="seConnecter()" tabindex="0" role="button">Se connecter</a>
              <a class="side__signup" routerLink="/moi">Créer un compte</a>
            </ng-container>
            <ng-container *ngIf="connecte()">
              <a class="side__help" href="#aide">Centre d'aide</a>
              <app-cloche-notifications />
              <a routerLink="/moi" routerLinkActive="actif">Mon compte</a>
            </ng-container>
          </div>
        </nav>
      </aside>

      <div class="content">
        <router-outlet />
        <footer class="siteft" id="aide">
          <div class="siteft__in">
            <div class="siteft__top">
              <div class="siteft__q">
                <b>Des questions ?</b>
                <span>Consultez notre aide ou contactez-nous.</span>
              </div>
              <a class="siteft__contact" href="mailto:contact@tabibi.doctor">Nous contacter</a>
            </div>

            <div class="siteft__apps">
              <span class="siteft__appslbl">Téléchargez l'application Tabibi</span>
              <div class="siteft__badges">
                <a class="storebadge" href="#" aria-label="Télécharger dans l'App Store">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 2c.1 1-.3 2-1 2.7-.7.8-1.8 1.4-2.8 1.3-.1-1 .4-2 .9-2.6.7-.8 1.9-1.3 2.9-1.4zM19.6 17.3c-.5 1.2-.8 1.7-1.5 2.8-1 1.5-2.3 3.3-4 3.3-1.5 0-1.9-1-3.9-1-2 0-2.4 1-3.9 1-1.7 0-2.9-1.6-3.9-3.1-2.8-4.2-3.1-9.1-1.4-11.7C2.3 6.3 4 5.3 5.6 5.3c1.6 0 2.7 1 4 1 1.3 0 2-1 3.9-1 1.4 0 2.9.8 4 2.1-3.5 1.9-2.9 6.9 2.1 8.9z"/></svg>
                  <span><small>Télécharger dans</small>App Store</span>
                </a>
                <a class="storebadge" href="#" aria-label="Disponible sur Google Play">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 2.3c-.2.2-.3.5-.3 1v17.4c0 .5.1.8.3 1l9.3-9.7L3.6 2.3zm10.4 8.3 2.8-2.9L5.6 1.3c-.3-.2-.6-.2-.9-.1l9.3 9.4zm0 2.8L4.7 22.8c.3.1.6.1.9-.1l11.2-6.4-2.8-2.9zm6.1-3.5-2.4-1.4-3 3.1 3 3.1 2.4-1.4c.9-.5.9-2.5 0-3z"/></svg>
                  <span><small>Disponible sur</small>Google Play</span>
                </a>
              </div>
            </div>

            <div class="siteft__cols">
              <div class="siteft__col">
                <h4>Tabibi</h4>
                <a routerLink="/verifier">Vérifier une ordonnance</a>
                <a href="/legal/mentions-legales.html">Mentions légales</a>
                <a href="/legal/cgu.html">Conditions d'utilisation</a>
                <a href="/legal/confidentialite.html">Confidentialité</a>
                <a href="mailto:contact@tabibi.doctor">Nous contacter</a>
                <a routerLink="/praticien">Vous êtes praticien ?</a>
              </div>
              <div class="siteft__col">
                <h4>Spécialités</h4>
                <a routerLink="/">Médecin généraliste</a>
                <a routerLink="/">Cardiologue</a>
                <a routerLink="/">Dentiste</a>
                <a routerLink="/">Pédiatre</a>
                <a routerLink="/">Gynécologue</a>
                <a routerLink="/">Dermatologue</a>
              </div>
              <div class="siteft__col">
                <h4>Villes</h4>
                <a routerLink="/">Alger</a>
                <a routerLink="/">Oran</a>
                <a routerLink="/">Constantine</a>
                <a routerLink="/">Annaba</a>
                <a routerLink="/">Blida</a>
                <a routerLink="/">Sétif</a>
              </div>
            </div>

            <div class="siteft__bottom">
              <span class="siteft__logo">tabibi<i>.</i></span>
              <span class="siteft__copy">© 2026 Tabibi — Tous droits réservés.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private roleService = inject(RoleService);

  /** Etat de connexion, connu une fois l'initialisation OIDC terminee (liens reserves aux connectes). */
  connecte = signal(false);
  /** Vrai si l'utilisateur connecte a le role MEDECIN (section « Espace médecin »). */
  estMedecin = this.roleService.estMedecin;
  /** Vrai si l'utilisateur connecte a le role ADMIN (section « Administration »). */
  estAdmin = this.roleService.estAdmin;
  /** Vrai si l'utilisateur connecte a le role PHARMACIE (section « Espace pharmacie », Dawini). */
  estPharmacie = this.roleService.estPharmacie;
  /** Vrai si l'utilisateur connecte a le role SECRETAIRE (section « Espace secrétaire », cabinet). */
  estSecretaire = this.roleService.estSecretaire;
  /**
   * Patient « pur » : connecte sans role professionnel ni admin. Les comptes medecin / admin / pharmacie /
   * secretaire ont aussi le role PATIENT par defaut ; on leur masque le menu patient pour n'afficher que leur espace.
   */
  estPatient = computed(() =>
    this.connecte() && !this.estMedecin() && !this.estAdmin() && !this.estPharmacie() && !this.estSecretaire(),
  );

  /** Lance la connexion Keycloak (bouton « Se connecter » de la barre de navigation). */
  seConnecter() { this.auth.seConnecter(); }

  /** Initialisation OIDC unique pour toute l'application (les pages attendent auth.pret()), puis roles. */
  async ngOnInit() {
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
    this.roleService.charger();
  }
}
