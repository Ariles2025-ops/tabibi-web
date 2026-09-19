import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { LANGUES_INTERFACE, Langue, TraductionService, langueDepuisCode } from './i18n/traduction.service';
import { TPipe } from './i18n/t.pipe';
import { ProfilService } from './moi/profil.service';
import { ClocheNotificationsComponent } from './notifications/cloche-notifications.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClocheNotificationsComponent, TPipe],
  template: `
    <!-- Barre de marque (blanche) -->
    <header style="background:#fff;border-bottom:1px solid var(--bord);position:sticky;top:0;z-index:30">
      <div style="max-width:1000px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:14px">
        <a routerLink="/" style="display:flex;align-items:center;gap:10px;text-decoration:none">
          <img src="assets/logo-mark.svg" alt="Tabibi" width="40" height="40" style="border-radius:10px;display:block">
          <span style="line-height:1.05">
            <span style="font-family:var(--police-titre);font-weight:800;font-size:1.3rem;color:var(--vert);display:block">Tabibi</span>
            <span style="font-size:.78rem;color:var(--texte-doux)">طبيبي</span>
          </span>
        </a>
        <span class="pousser-fin"></span>
        <ng-container *ngIf="!connecte()">
          <button type="button" (click)="seConnecter()" class="bouton-secondaire" style="padding:8px 16px">{{ 'moi.seConnecter' | t }}</button>
          <button type="button" (click)="sInscrire()" class="bouton" style="padding:8px 16px">{{ 'nav.inscription' | t }}</button>
        </ng-container>
        <ng-container *ngIf="connecte()">
          <app-cloche-notifications />
          <a routerLink="/moi" routerLinkActive="actif" class="bouton-secondaire" style="padding:8px 16px">{{ 'nav.monCompte' | t }}</a>
          <button type="button" (click)="seDeconnecter()" class="bouton-secondaire" style="padding:8px 16px">{{ 'nav.deconnexion' | t }}</button>
        </ng-container>
      </div>
    </header>

    <!-- Bandeau de navigation (vert) -->
    <nav style="background:var(--vert)">
      <div style="max-width:1000px;margin:0 auto;padding:11px 16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">
        <a routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">{{ 'nav.accueil' | t }}</a>
        <a routerLink="/mes-rendez-vous" routerLinkActive="actif">{{ 'nav.mesRendezVous' | t }}</a>
        <a *ngIf="connecte()" routerLink="/mes-ordonnances" routerLinkActive="actif">{{ 'nav.mesOrdonnances' | t }}</a>
        <a *ngIf="connecte()" routerLink="/teleconsultations" routerLinkActive="actif">{{ 'nav.mesTeleconsultations' | t }}</a>
        <a *ngIf="connecte()" routerLink="/messagerie" routerLinkActive="actif">{{ 'nav.messagerie' | t }}</a>
        <a *ngIf="connecte()" routerLink="/mes-avis" routerLinkActive="actif">{{ 'nav.mesAvis' | t }}</a>
        <a *ngIf="connecte()" routerLink="/dawini" routerLinkActive="actif">{{ 'nav.dawini' | t }}</a>
        <a *ngIf="connecte()" routerLink="/liste-attente" routerLinkActive="actif">{{ 'nav.mesListesAttente' | t }}</a>
        <a routerLink="/verifier" routerLinkActive="actif">{{ 'nav.verifierOrdonnance' | t }}</a>
        <span class="selecteur-langue pousser-fin" role="group" [attr.aria-label]="'nav.langue' | t">
          <button *ngFor="let l of langues" type="button" [lang]="l.code" (click)="changerLangue(l.code)"
                  [class.actif]="langue() === l.code" [attr.aria-pressed]="langue() === l.code">{{ l.libelle }}</button>
        </span>
      </div>
      <div *ngIf="estMedecin()" style="background:var(--vert-800)">
        <div style="max-width:1000px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#d7ece5">{{ 'nav.espaceMedecin' | t }}</span>
          <a routerLink="/medecin/agenda" routerLinkActive="actif">{{ 'nav.agenda' | t }}</a>
          <a routerLink="/medecin/disponibilites" routerLinkActive="actif">{{ 'nav.disponibilites' | t }}</a>
          <a routerLink="/medecin/ordonnances" routerLinkActive="actif">{{ 'nav.ordonnancesRedigees' | t }}</a>
          <a routerLink="/medecin/teleconsultations" routerLinkActive="actif">{{ 'nav.teleconsultations' | t }}</a>
          <a routerLink="/medecin/candidature" routerLinkActive="actif">{{ 'nav.maCandidature' | t }}</a>
          <a routerLink="/medecin/avis" routerLinkActive="actif">{{ 'nav.avisPatients' | t }}</a>
          <a routerLink="/medecin/liste-attente" routerLinkActive="actif">{{ 'nav.listeAttente' | t }}</a>
          <a routerLink="/medecin/secretaires" routerLinkActive="actif">{{ 'nav.mesSecretaires' | t }}</a>
        </div>
      </div>
      <div *ngIf="estSecretaire()" style="background:var(--vert-800)">
        <div style="max-width:1000px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#d7ece5">{{ 'nav.espaceSecretaire' | t }}</span>
          <a routerLink="/secretaire" routerLinkActive="actif">{{ 'nav.agendaCabinet' | t }}</a>
        </div>
      </div>
      <div *ngIf="estPharmacie()" style="background:var(--vert-800)">
        <div style="max-width:1000px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#d7ece5">{{ 'nav.espacePharmacie' | t }}</span>
          <a routerLink="/pharmacie" routerLinkActive="actif">{{ 'nav.demandesMedicaments' | t }}</a>
        </div>
      </div>
      <div *ngIf="estAdmin()" style="background:var(--vert-fonce)">
        <div style="max-width:1000px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#d7ece5">{{ 'nav.administration' | t }}</span>
          <a routerLink="/admin" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">{{ 'nav.tableauDeBord' | t }}</a>
          <a routerLink="/admin/candidatures" routerLinkActive="actif">{{ 'nav.candidatures' | t }}</a>
          <a routerLink="/admin/avis" routerLinkActive="actif">{{ 'nav.moderationAvis' | t }}</a>
        </div>
      </div>
    </nav>
    <router-outlet />
  `,
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private i18n = inject(TraductionService);
  private profilService = inject(ProfilService);

  connecte = signal(false);
  estMedecin = this.roleService.estMedecin;
  estAdmin = this.roleService.estAdmin;
  estPharmacie = this.roleService.estPharmacie;
  estSecretaire = this.roleService.estSecretaire;
  langues = LANGUES_INTERFACE;
  langue = this.i18n.langue;

  async ngOnInit() {
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
    this.roleService.charger();
    if (this.connecte() && !this.i18n.choisieManuellement()) {
      this.profilService.monProfil().subscribe({
        next: (profil) => {
          const langue = langueDepuisCode(profil.langue);
          if (langue && !this.i18n.choisieManuellement()) this.i18n.changer(langue, false);
        },
        error: () => undefined,
      });
    }
  }

  seConnecter() { this.auth.seConnecter(); }
  sInscrire() { this.auth.sInscrire(); }
  seDeconnecter() { this.auth.seDeconnecter(); this.connecte.set(false); }

  changerLangue(langue: Langue) {
    this.i18n.changer(langue);
  }
}
