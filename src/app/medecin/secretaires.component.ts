import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Rattachement, estUuid } from '../secretaire/secretaire.service';
import { MedecinService } from './medecin.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/**
 * Secretaires du cabinet (role MEDECIN) : rattachements en cours (GET /api/medecin/secretaires), ajout par
 * l'identifiant Keycloak du compte de la secretaire (POST /api/medecin/secretaires { secretaireId }) et retrait
 * (POST /api/medecin/secretaires/{id}/retirer). Une secretaire rattachee agit sur l'agenda depuis l'espace secretaire.
 */
@Component({
  selector: 'app-secretaires',
  standalone: true,
  imports: [CommonModule, FormsModule, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'secretaires.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'secretaires.intro' | t }}</p>

      <form (ngSubmit)="rattacher()" style="display:grid;gap:12px;margin:0 0 28px">
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          {{ 'secretaires.identifiant' | t }}
          <input class="champ" [(ngModel)]="secretaireId" name="secretaireId" required
                 [placeholder]="'secretaires.identifiantPlaceholder' | t" style="color:#10241F;font-size:1rem;font-family:monospace">
        </label>
        <p *ngIf="succes()" style="color:var(--vert);margin:0">{{ succes() }}</p>
        <p *ngIf="erreurFormulaire()" style="color:#b3261e;margin:0">{{ erreurFormulaire() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">{{ (enCours() ? 'secretaires.rattachement' : 'secretaires.rattacher') | t }}</button>
        </div>
      </form>

      <h2 style="font-size:1.1rem;margin:0 0 12px">{{ 'secretaires.rattachees' | t }}</h2>
      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let r of rattachements()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <code style="font-size:.95rem">{{ r.secretaireId }}</code><br>
            <span style="color:#566b64">{{ 'secretaires.rattacheeLe' | t:{ date: (r.creeLe | dateLocale:'dateHeure') } }}</span>
          </div>
          <button type="button" (click)="retirer(r)" [disabled]="retraitEnCours() !== null"
                  style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
            {{ (retraitEnCours() === r.id ? 'commun.retrait' : 'commun.retirer') | t }}
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">{{ 'secretaires.aucune' | t }}</p>
    </main>
  `,
})
export class SecretairesComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private i18n = inject(TraductionService);

  secretaireId = '';
  rattachements = signal<Rattachement[]>([]);
  charge = signal(false);
  enCours = signal(false);
  /** Identifiant du rattachement dont le retrait est en cours. */
  retraitEnCours = signal<string | null>(null);
  succes = signal('');
  /** Erreur du formulaire de rattachement (distincte de celle de la liste). */
  erreurFormulaire = signal('');
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.mesSecretaires');
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.secretaires().subscribe({
      next: (liste) => {
        this.rattachements.set([...liste].sort((a, b) => Date.parse(a.creeLe) - Date.parse(b.creeLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveMedecins'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('secretaires.erreurChargement'));
        }
      },
    });
  }

  rattacher() {
    const secretaireId = this.secretaireId.trim().toLowerCase();
    this.succes.set('');
    if (!estUuid(secretaireId)) {
      this.erreurFormulaire.set(this.i18n.t('secretaires.identifiantInvalide'));
      return;
    }
    this.erreurFormulaire.set('');
    this.enCours.set(true);
    this.service.rattacherSecretaire(secretaireId).subscribe({
      next: () => {
        this.enCours.set(false);
        this.secretaireId = '';
        this.succes.set(this.i18n.t('secretaires.rattachee'));
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 409) {
          this.erreurFormulaire.set(e.error?.erreur ?? this.i18n.t('secretaires.dejaRattachee'));
          this.charger();
        } else if (e.status === 400) {
          this.erreurFormulaire.set(e.error?.erreur ?? this.i18n.t('secretaires.identifiantRefuse'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurFormulaire.set(this.i18n.t('secretaires.seulMedecin'));
        } else {
          this.erreurFormulaire.set(e.error?.erreur ?? this.i18n.t('secretaires.rattachementEchec'));
        }
      },
    });
  }

  retirer(rattachement: Rattachement) {
    if (!confirm(this.i18n.t('secretaires.confirmerRetrait'))) return;
    this.retraitEnCours.set(rattachement.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.retirerSecretaire(rattachement.id).subscribe({
      next: () => {
        this.retraitEnCours.set(null);
        this.succes.set(this.i18n.t('secretaires.retiree'));
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.retraitEnCours.set(null);
        if (e.status === 404) {
          // Deja retiree : la liste est rechargee.
          this.charger();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('secretaires.retraitEchec'));
        }
      },
    });
  }
}
