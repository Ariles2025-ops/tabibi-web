import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminService, Candidature, libelleStatutCandidature } from './admin.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { ClesTraduction } from '../i18n/fr';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/** Filtre par statut de la liste ; '' = toutes. Le libelle est une cle de traduction. */
const STATUTS_FILTRE: ReadonlyArray<{ valeur: string; libelle: ClesTraduction }> = [
  { valeur: 'EN_ATTENTE', libelle: 'candidatures.filtreEnAttente' },
  { valeur: 'VALIDEE', libelle: 'candidatures.filtreValidees' },
  { valeur: 'REFUSEE', libelle: 'candidatures.filtreRefusees' },
  { valeur: '', libelle: 'candidatures.filtreToutes' },
];

/**
 * Examen des candidatures de medecins par l'administrateur (GET /api/admin/candidatures?statut=) : validation
 * (publication dans l'annuaire) ou refus motive ; le medecin est prevenu par l'API.
 */
@Component({
  selector: 'app-candidatures-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">{{ 'candidatures.titre' | t }}</h1>
        <label style="display:flex;align-items:center;gap:8px;color:#566b64;font-size:.9rem">
          {{ 'commun.statut' | t }}
          <select class="champ" [ngModel]="statut()" (ngModelChange)="filtrer($event)" name="statut" style="color:#10241F;font-size:1rem">
            <option *ngFor="let s of statuts" [value]="s.valeur">{{ s.libelle | t }}</option>
          </select>
        </label>
      </div>

      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let c of candidatures()" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ c.nomComplet }}</strong>
              <span style="color:#566b64"> · {{ libelleStatut(c.statut) }}</span><br>
              <span style="color:#566b64">
                {{ c.specialiteFr || c.specialiteSlug }} · {{ c.ville || ('candidature.villeNonPrecisee' | t) }} ({{ c.wilayaFr || c.wilayaCode }})
                · {{ 'candidature.numeroOrdre' | t:{ numero: c.numeroOrdre } }}<ng-container *ngIf="c.telephone"> · {{ c.telephone }}</ng-container>
              </span><br>
              <span style="color:#566b64;font-size:.9rem">
                {{ 'candidature.deposeeLe' | t:{ date: (c.deposeeLe | dateLocale:'dateHeure') } }}<ng-container *ngIf="c.traiteeLe as traitee"> · {{ 'candidature.traiteeLe' | t:{ date: (traitee | dateLocale:'dateHeure') } }}</ng-container>
              </span>
              <p *ngIf="c.motifRefus as motif" style="margin:6px 0 0;color:#b3261e">{{ 'candidatures.motifRefus' | t:{ motif } }}</p>
            </div>
            <button *ngIf="c.statut === 'EN_ATTENTE'" type="button" class="bouton" (click)="valider(c)" [disabled]="enCours() !== null">
              {{ (enCours() === c.id ? 'commun.enregistrement' : 'candidatures.valider') | t }}
            </button>
          </div>

          <form *ngIf="c.statut === 'EN_ATTENTE'" (ngSubmit)="refuser(c)"
                style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0 0">
            <input class="champ" [(ngModel)]="motifs[c.id]" [name]="'motif-' + c.id" [placeholder]="'candidatures.motifPlaceholder' | t"
                   required style="flex:1;min-width:220px;color:#10241F;font-size:1rem">
            <button type="submit" [disabled]="enCours() !== null || !motifRenseigne(c)"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ 'candidatures.refuser' | t }}
            </button>
          </form>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && candidatures().length === 0">{{ 'candidatures.aucune' | t }}</p>

      <p style="margin:24px 0 0"><a routerLink="/admin" style="color:var(--vert)">{{ 'candidatures.retourTableau' | t }}</a></p>
    </main>
  `,
})
export class CandidaturesAdminComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(AdminService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles du service. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  statuts = STATUTS_FILTRE;
  /** Statut filtre ('' = toutes) ; les candidatures en attente d'abord. */
  statut = signal('EN_ATTENTE');
  candidatures = signal<Candidature[]>([]);
  /** Motif de refus saisi, par identifiant de candidature. */
  motifs: Record<string, string> = {};
  charge = signal(false);
  /** Identifiant de la candidature en cours de traitement. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.candidatures');
    this.charger();
  }

  filtrer(statut: string) {
    this.statut.set(statut);
    this.succes.set('');
    this.charger();
  }

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (candidature deja traitee ailleurs). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.candidatures(this.statut() || undefined).subscribe({
      next: (liste) => {
        this.candidatures.set(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveAdmin'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('candidatures.erreurChargement'));
        }
      },
    });
  }

  valider(c: Candidature) {
    this.traiter(c, this.service.valider(c.id), this.i18n.t('candidatures.validee', { nom: c.nomComplet }));
  }

  refuser(c: Candidature) {
    const motif = (this.motifs[c.id] ?? '').trim();
    if (!motif) {
      this.erreur.set(this.i18n.t('candidatures.indiquerMotif'));
      return;
    }
    this.traiter(c, this.service.refuser(c.id, motif), this.i18n.t('candidatures.refusee', { nom: c.nomComplet }));
  }

  motifRenseigne(c: Candidature): boolean {
    return (this.motifs[c.id] ?? '').trim().length > 0;
  }

  libelleStatut(statut: string): string {
    return libelleStatutCandidature(statut, this.traduire);
  }

  /** Applique une decision puis recharge la liste ; 409 / 404 (deja traitee, disparue) affichent le motif et rechargent. */
  private traiter(c: Candidature, appel: ReturnType<AdminService['valider']>, message: string) {
    this.enCours.set(c.id);
    this.succes.set('');
    this.erreur.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        delete this.motifs[c.id];
        this.succes.set(message);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409 || e.status === 404) {
          this.charger(e.error?.erreur ?? this.i18n.t('candidatures.dejaTraitee'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('candidatures.traitementEchec'));
        }
      },
    });
  }
}
