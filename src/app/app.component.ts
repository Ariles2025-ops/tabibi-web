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
    <nav style="background:var(--vert)">
      <div style="max-width:720px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <span style="color:#fff;font-weight:700;font-size:1.15rem">Tabibi</span>
        <a routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">{{ 'nav.accueil' | t }}</a>
        <a routerLink="/mes-rendez-vous" routerLinkActive="actif">{{ 'nav.mesRendezVous' | t }}</a>
        <a *ngIf="connecte()" routerLink="/mes-ordonnances" routerLinkActive="actif">{{ 'nav.mesOrdonnances' | t }}</a>
        <a *ngIf="connecte()" routerLink="/teleconsultations" routerLinkActive="actif">{{ 'nav.mesTeleconsultations' | t }}</a>
        <a *ngIf="connecte()" routerLink="/messagerie" routerLinkActive="actif">{{ 'nav.messagerie' | t }}</a>
        <a *ngIf="connecte()" routerLink="/mes-avis" routerLinkActive="actif">{{ 'nav.mesAvis' | t }}</a>
        <a *ngIf="connecte()" routerLink="/dawini" routerLinkActive="actif">{{ 'nav.dawini' | t }}</a>
        <a *ngIf="connecte()" routerLink="/liste-attente" routerLinkActive="actif">{{ 'nav.mesListesAttente' | t }}</a>
        <a routerLink="/verifier" routerLinkActive="actif">{{ 'nav.verifierOrdonnance' | t }}</a>
        <a routerLink="/moi" routerLinkActive="actif" class="pousser-fin">{{ 'nav.monCompte' | t }}</a>
        <app-cloche-notifications *ngIf="connecte()" />
        <span class="selecteur-langue" role="group" [attr.aria-label]="'nav.langue' | t">
          <button *ngFor="let l of langues" type="button" [lang]="l.code" (click)="changerLangue(l.code)"
                  [class.actif]="langue() === l.code" [attr.aria-pressed]="langue() === l.code">{{ l.libelle }}</button>
        </span>
      </div>
      <div *ngIf="estMedecin()" style="background:#0b5c4b">
        <div style="max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#cfe7e0">{{ 'nav.espaceMedecin' | t }}</span>
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
      <div *ngIf="estSecretaire()" style="background:#0b5c4b">
        <div style="max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#cfe7e0">{{ 'nav.espaceSecretaire' | t }}</span>
          <a routerLink="/secretaire" routerLinkActive="actif">{{ 'nav.agendaCabinet' | t }}</a>
        </div>
      </div>
      <div *ngIf="estPharmacie()" style="background:#0b5c4b">
        <div style="max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#cfe7e0">{{ 'nav.espacePharmacie' | t }}</span>
          <a routerLink="/pharmacie" routerLinkActive="actif">{{ 'nav.demandesMedicaments' | t }}</a>
        </div>
      </div>
      <div *ngIf="estAdmin()" style="background:#083f33">
        <div style="max-width:720px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:.95rem">
          <span style="color:#cfe7e0">{{ 'nav.administration' | t }}</span>
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
  /** Langues proposees par le selecteur (Français / العربية / English) et langue courante. */
  langues = LANGUES_INTERFACE;
  langue = this.i18n.langue;

  /**
   * Initialisation OIDC unique pour toute l'application (les pages attendent auth.pret()), puis roles. Une fois
   * connecte, la langue enregistree dans le profil (`GET /api/moi/profil`) initialise l'interface, sauf si
   * l'utilisateur a deja choisi une langue lui-meme (selecteur, memorise).
   */
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
        // 404 (profil jamais renseigne) ou API indisponible : la langue detectee reste.
        error: () => undefined,
      });
    }
  }

  /** Selecteur de la barre de navigation : la langue choisie est memorisee (localStorage). */
  changerLangue(langue: Langue) {
    this.i18n.changer(langue);
  }
}
