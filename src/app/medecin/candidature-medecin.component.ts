import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Candidature, DemandeCandidature, libelleStatutCandidature } from '../admin/admin.service';
import { AuthService } from '../auth/auth.service';
import { MedecinService } from './medecin.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/** Champs du formulaire, vides ou prerempli depuis une candidature refusee. */
function formulaireVide(): DemandeCandidature {
  return { nomComplet: '', specialiteSlug: '', specialiteFr: '', wilayaCode: '', wilayaFr: '', ville: '', numeroOrdre: '', telephone: '' };
}

/**
 * Candidature du medecin a figurer dans l'annuaire : etat de la derniere candidature (GET /api/medecin/candidature),
 * formulaire de depot s'il n'en a jamais depose ou si la derniere a ete refusee (POST /api/medecin/candidature).
 */
@Component({
  selector: 'app-candidature-medecin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'candidature.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'candidature.intro' | t }}</p>

      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <section *ngIf="candidature() as c" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;margin:0 0 20px">
        <strong>{{ c.nomComplet }}</strong>
        <span style="color:#566b64"> · {{ libelleStatut(c.statut) }}</span><br>
        <span style="color:#566b64">
          {{ c.specialiteFr || c.specialiteSlug }} · {{ c.ville || ('candidature.villeNonPrecisee' | t) }} ({{ c.wilayaFr || c.wilayaCode }})
          · {{ 'candidature.numeroOrdre' | t:{ numero: c.numeroOrdre } }}<ng-container *ngIf="c.telephone"> · {{ c.telephone }}</ng-container>
        </span><br>
        <span style="color:#566b64;font-size:.9rem">
          {{ 'candidature.deposeeLe' | t:{ date: (c.deposeeLe | dateLocale:'dateHeure') } }}<ng-container *ngIf="c.traiteeLe as traitee"> · {{ 'candidature.traiteeLe' | t:{ date: (traitee | dateLocale:'dateHeure') } }}</ng-container>
        </span>
        <p *ngIf="c.statut === 'EN_ATTENTE'" style="margin:10px 0 0">{{ 'candidature.enExamen' | t }}</p>
        <p *ngIf="c.statut === 'VALIDEE'" style="margin:10px 0 0;color:var(--vert)">
          {{ 'candidature.validee' | t }}
          <a [routerLink]="['/medecins', c.medecinId]" style="color:var(--vert)">{{ 'candidature.voirMaFiche' | t }}</a>
        </p>
        <p *ngIf="c.statut === 'REFUSEE'" style="margin:10px 0 0;color:#b3261e">
          {{ 'candidature.refusee' | t }}<ng-container *ngIf="c.motifRefus as motif"> · {{ 'candidature.motif' | t:{ motif } }}</ng-container>.
          {{ 'candidature.deposerNouvelle' | t }}
        </p>
      </section>

      <form *ngIf="formulaireVisible()" (ngSubmit)="deposer()" #f="ngForm" style="display:grid;gap:12px">
        <h2 *ngIf="candidature()" style="font-size:1.1rem;margin:0">{{ 'candidature.nouvelle' | t }}</h2>
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.nomComplet' | t }}
            <input class="champ" [(ngModel)]="demande.nomComplet" name="nomComplet" required [placeholder]="'candidature.nomPlaceholder' | t" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.numeroOrdreLabel' | t }}
            <input class="champ" [(ngModel)]="demande.numeroOrdre" name="numeroOrdre" required style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.specialiteCode' | t }}
            <input class="champ" [(ngModel)]="demande.specialiteSlug" name="specialiteSlug" required
                   [placeholder]="'candidature.specialiteCodePlaceholder' | t" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.specialiteLibelle' | t }}
            <input class="champ" [(ngModel)]="demande.specialiteFr" name="specialiteFr" [placeholder]="'candidature.specialiteLibellePlaceholder' | t" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.wilayaCode' | t }}
            <input class="champ" [(ngModel)]="demande.wilayaCode" name="wilayaCode" required [placeholder]="'candidature.wilayaCodePlaceholder' | t" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.wilayaLibelle' | t }}
            <input class="champ" [(ngModel)]="demande.wilayaFr" name="wilayaFr" [placeholder]="'candidature.wilayaLibellePlaceholder' | t" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.ville' | t }}
            <input class="champ" [(ngModel)]="demande.ville" name="ville" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            {{ 'candidature.telephone' | t }}
            <input class="champ" [(ngModel)]="demande.telephone" name="telephone" type="tel" [placeholder]="'candidature.telephonePlaceholder' | t" style="color:#10241F;font-size:1rem">
          </label>
        </div>
        <p style="color:#566b64;font-size:.9rem;margin:0">{{ 'commun.champsObligatoires' | t }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">
            {{ (enCours() ? 'commun.envoi' : 'candidature.deposer') | t }}
          </button>
        </div>
      </form>
    </main>
  `,
})
export class CandidatureMedecinComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles de statut. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  /** Derniere candidature deposee ; null s'il n'y en a aucune. */
  candidature = signal<Candidature | null>(null);
  /** Vrai une fois l'etat connu : aucune candidature, ou la derniere refusee. */
  formulaireVisible = signal(false);
  demande: DemandeCandidature = formulaireVide();
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.maCandidature');
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.maCandidature().subscribe({
      next: (c) => {
        this.charge.set(false);
        this.afficher(c);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Aucune candidature deposee : on propose le formulaire.
          this.candidature.set(null);
          this.formulaireVisible.set(true);
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveMedecins'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('candidature.erreurChargement'));
        }
      },
    });
  }

  deposer() {
    const demande: DemandeCandidature = {
      nomComplet: this.demande.nomComplet.trim(),
      specialiteSlug: this.demande.specialiteSlug.trim(),
      specialiteFr: this.demande.specialiteFr.trim(),
      wilayaCode: this.demande.wilayaCode.trim(),
      wilayaFr: this.demande.wilayaFr.trim(),
      ville: this.demande.ville.trim(),
      numeroOrdre: this.demande.numeroOrdre.trim(),
      telephone: this.demande.telephone.trim(),
    };
    this.succes.set('');
    if (!demande.nomComplet || !demande.specialiteSlug || !demande.wilayaCode || !demande.numeroOrdre) {
      this.erreur.set(this.i18n.t('candidature.champsRequis'));
      return;
    }
    this.erreur.set('');
    this.enCours.set(true);
    this.service.deposerCandidature(demande).subscribe({
      next: (c) => {
        this.enCours.set(false);
        this.afficher(c);
        this.succes.set(this.i18n.t('candidature.deposee'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('candidature.seulMedecin'));
        } else if (e.status === 409) {
          // Une candidature est deja en attente ou validee : on l'affiche avec le motif renvoye.
          this.erreur.set(e.error?.erreur ?? this.i18n.t('candidature.dejaEnAttente'));
          this.service.maCandidature().subscribe({ next: (c) => this.afficher(c), error: () => undefined });
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('candidature.incomplete'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('candidature.depotEchec'));
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutCandidature(statut, this.traduire);
  }

  /** Affiche la candidature ; le formulaire (prerempli) n'est propose que si elle a ete refusee. */
  private afficher(c: Candidature) {
    this.candidature.set(c);
    const refusee = c.statut === 'REFUSEE';
    this.formulaireVisible.set(refusee);
    if (refusee) {
      this.demande = {
        nomComplet: c.nomComplet,
        specialiteSlug: c.specialiteSlug,
        specialiteFr: c.specialiteFr ?? '',
        wilayaCode: c.wilayaCode,
        wilayaFr: c.wilayaFr ?? '',
        ville: c.ville ?? '',
        numeroOrdre: c.numeroOrdre,
        telephone: c.telephone ?? '',
      };
    }
  }
}
