import { Component, OnInit, inject, signal } from '@angular/core';
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
          <a routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
          <a routerLink="/mes-rendez-vous" routerLinkActive="actif">Mes rendez-vous</a>
          <a *ngIf="connecte()" routerLink="/mes-ordonnances" routerLinkActive="actif">Mes ordonnances</a>
          <a *ngIf="connecte()" routerLink="/teleconsultations" routerLinkActive="actif">Mes téléconsultations</a>
          <a *ngIf="connecte()" routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
          <a *ngIf="connecte()" routerLink="/mes-avis" routerLinkActive="actif">Mes avis</a>
          <a *ngIf="connecte()" routerLink="/dawini" routerLinkActive="actif">Dawini</a>
          <a *ngIf="connecte()" routerLink="/liste-attente" routerLinkActive="actif">Mes listes d'attente</a>
          <a routerLink="/verifier" routerLinkActive="actif">Vérifier une ordonnance</a>

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
            <a routerLink="/moi" routerLinkActive="actif">Mon compte</a>
            <app-cloche-notifications *ngIf="connecte()" />
          </div>
        </nav>
      </aside>

      <div class="content">
        <router-outlet />
        <footer class="pied">
          <a href="/legal/mentions-legales.html">Mentions légales</a>
          <a href="/legal/cgu.html">Conditions d'utilisation</a>
          <a href="/legal/confidentialite.html">Confidentialité</a>
          <a href="mailto:contact@tabibi.doctor">contact&#64;tabibi.doctor</a>
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

  /** Initialisation OIDC unique pour toute l'application (les pages attendent auth.pret()), puis roles. */
  async ngOnInit() {
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
    this.roleService.charger();
  }
}
