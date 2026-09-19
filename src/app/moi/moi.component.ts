import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';
import { SeoService } from '../seo/seo.service';

/**
 * Mon compte : utilisateur connecte, roles, identifiant du compte (sujet du jeton Keycloak, a communiquer par une
 * secretaire au medecin qui la rattache) avec copie dans le presse-papiers, lien vers le profil, deconnexion.
 */
@Component({
  selector: 'app-moi',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  template: `
    <main style="max-width:640px;margin:40px auto;padding:0 16px">
      <h1 style="color:var(--vert)">{{ 'moi.titre' | t }}</h1>
      <button *ngIf="!connecte()" type="button" class="bouton" (click)="seConnecter()">{{ 'moi.seConnecter' | t }}</button>
      <div *ngIf="connecte()">
        <p>{{ 'moi.connecteEnTantQue' | t }} <b>{{ moi()?.nom }}</b></p>
        <p>{{ 'moi.roles' | t:{ roles: moi()?.roles?.join(', ') } }}</p>
        <p *ngIf="moi()?.sujet as sujet" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span>{{ 'moi.identifiant' | t }} <code style="font-size:.95rem">{{ sujet }}</code></span>
          <button type="button" class="bouton-secondaire" style="padding:6px 12px" (click)="copier(sujet)">{{ 'moi.copier' | t }}</button>
          <span *ngIf="copie()" style="color:var(--vert)">{{ 'moi.copie' | t }}</span>
          <span *ngIf="erreurCopie()" style="color:#b3261e">{{ erreurCopie() }}</span>
        </p>
        <p style="color:#566b64;font-size:.9rem">
          {{ 'moi.identifiantSecretaire' | t }}
        </p>
        <p style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="bouton" routerLink="/moi/profil">{{ 'moi.monProfil' | t }}</a>
          <button type="button" class="bouton-secondaire" (click)="seDeconnecter()">{{ 'moi.seDeconnecter' | t }}</button>
        </p>
      </div>
    </main>
  `,
})
export class MoiComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private i18n = inject(TraductionService);
  connecte = signal(false);
  /** Profil /api/moi, lu depuis le cache de RoleService (une seule requete par chargement de page). */
  moi = this.roleService.moi;
  /** Vrai une fois l'identifiant copie dans le presse-papiers. */
  copie = signal(false);
  erreurCopie = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('seo.monCompte');
    await this.auth.pret();
    if (this.auth.estConnecte()) {
      this.connecte.set(true);
      this.roleService.charger();
    }
  }

  seConnecter() { this.auth.seConnecter(); }
  seDeconnecter() { this.auth.seDeconnecter(); this.connecte.set(false); }

  /** Copie l'identifiant ; le presse-papiers peut etre refuse (contexte non securise, permission) : message de repli. */
  async copier(sujet: string) {
    this.copie.set(false);
    this.erreurCopie.set('');
    try {
      await navigator.clipboard.writeText(sujet);
      this.copie.set(true);
    } catch {
      this.erreurCopie.set(this.i18n.t('moi.copieImpossible'));
    }
  }
}
