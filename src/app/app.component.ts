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
    <nav style="background:var(--vert)">
      <div style="max-width:720px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <span style="color:#fff;font-weight:700;font-size:1.15rem">Tabibi</span>
        <a routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
        <a routerLink="/mes-rendez-vous" routerLinkActive="actif">Mes rendez-vous</a>
        <a *ngIf="connecte()" routerLink="/mes-ordonnances" routerLinkActive="actif">Mes ordonnances</a>
        <a *ngIf="connecte()" routerLink="/teleconsultations" routerLinkActive="actif">Mes téléconsultations</a>
        <a *ngIf="connecte()" routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
        <a *ngIf="connecte()" routerLink="/mes-avis" routerLinkActive="actif">Mes avis</a>
        <a routerLink="/verifier" routerLinkActive="actif">Vérifier une ordonnance</a>
        <a routerLink="/moi" routerLinkActive="actif" style="margin-left:auto">Mon compte</a>
        <app-cloche-notifications *ngIf="connecte()" />
      </div>
      <div *ngIf="estMedecin()" style="background:#0b5c4b">
        <div style="max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#cfe7e0">Espace médecin</span>
          <a routerLink="/medecin/agenda" routerLinkActive="actif">Agenda</a>
          <a routerLink="/medecin/disponibilites" routerLinkActive="actif">Disponibilités</a>
          <a routerLink="/medecin/ordonnances" routerLinkActive="actif">Mes ordonnances rédigées</a>
          <a routerLink="/medecin/teleconsultations" routerLinkActive="actif">Téléconsultations</a>
          <a routerLink="/medecin/candidature" routerLinkActive="actif">Ma candidature</a>
          <a routerLink="/medecin/avis" routerLinkActive="actif">Avis des patients</a>
        </div>
      </div>
      <div *ngIf="estAdmin()" style="background:#083f33">
        <div style="max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#cfe7e0">Administration</span>
          <a routerLink="/admin" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Tableau de bord</a>
          <a routerLink="/admin/candidatures" routerLinkActive="actif">Candidatures</a>
          <a routerLink="/admin/avis" routerLinkActive="actif">Modération des avis</a>
        </div>
      </div>
    </nav>
    <router-outlet />
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

  /** Initialisation OIDC unique pour toute l'application (les pages attendent auth.pret()), puis roles. */
  async ngOnInit() {
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
    this.roleService.charger();
  }
}
