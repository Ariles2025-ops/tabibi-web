import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AvisAdmin, AvisService, libelleStatutAvis } from '../avis/avis.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { ClesTraduction } from '../i18n/fr';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/** Filtre par statut de la liste ; '' = tous. Le libelle est une cle de traduction. */
const STATUTS_FILTRE: ReadonlyArray<{ valeur: string; libelle: ClesTraduction }> = [
  { valeur: 'SIGNALE', libelle: 'moderation.filtreSignales' },
  { valeur: 'PUBLIE', libelle: 'moderation.filtrePublies' },
  { valeur: 'MASQUE', libelle: 'moderation.filtreMasques' },
  { valeur: '', libelle: 'moderation.filtreTous' },
];

/**
 * Moderation des avis par l'administrateur (GET /api/admin/avis?statut=) : masquage (retrait de la vue publique)
 * ou retablissement (remise en ligne apres signalement ou masquage). Les avis signales sont proposes en premier.
 */
@Component({
  selector: 'app-moderation-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">{{ 'moderation.titre' | t }}</h1>
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
        <li *ngFor="let a of avis()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <strong>{{ 'avis.sur5' | t:{ note: a.note } }}</strong>
            <span style="color:#566b64"> · {{ libelleStatut(a.statut) }} · {{ 'moderation.deposeLe' | t:{ date: (a.deposeLe | dateLocale:'dateHeure') } }}</span>
            <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
            <p *ngIf="!a.commentaire" style="margin:6px 0 0;color:#566b64">{{ 'moderation.sansCommentaire' | t }}</p>
            <span style="display:block;margin:6px 0 0;color:#566b64;font-size:.85rem">
              {{ 'moderation.references' | t:{ medecinId: a.medecinId, patientId: a.patientId, rendezVousId: a.rendezVousId } }}
            </span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button *ngIf="a.statut !== 'MASQUE'" type="button" (click)="masquer(a)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ (enCours() === a.id ? 'commun.enregistrement' : 'moderation.masquer') | t }}
            </button>
            <button *ngIf="a.statut !== 'PUBLIE'" type="button" class="bouton" (click)="retablir(a)" [disabled]="enCours() !== null">
              {{ (enCours() === a.id ? 'commun.enregistrement' : 'moderation.retablir') | t }}
            </button>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && avis().length === 0">{{ 'moderation.aucun' | t }}</p>

      <p style="margin:24px 0 0"><a routerLink="/admin" style="color:var(--vert)">{{ 'candidatures.retourTableau' | t }}</a></p>
    </main>
  `,
})
export class ModerationAvisComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(AvisService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles du service. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  statuts = STATUTS_FILTRE;
  /** Statut filtre ('' = tous) ; les avis signales d'abord. */
  statut = signal('SIGNALE');
  avis = signal<AvisAdmin[]>([]);
  charge = signal(false);
  /** Identifiant de l'avis en cours de traitement. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.moderationAvis');
    this.charger();
  }

  filtrer(statut: string) {
    this.statut.set(statut);
    this.succes.set('');
    this.charger();
  }

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (avis deja traite ailleurs). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.pourModeration(this.statut() || undefined).subscribe({
      next: (liste) => {
        this.avis.set(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveAdmin'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('moderation.erreurChargement'));
        }
      },
    });
  }

  masquer(a: AvisAdmin) {
    this.traiter(a, this.service.masquer(a.id), this.i18n.t('moderation.masque'));
  }

  retablir(a: AvisAdmin) {
    this.traiter(a, this.service.retablir(a.id), this.i18n.t('moderation.retabli'));
  }

  libelleStatut(statut: string): string {
    return libelleStatutAvis(statut, this.traduire);
  }

  /** Applique une decision puis recharge la liste ; 409 / 404 (deja traite, disparu) affichent le motif et rechargent. */
  private traiter(a: AvisAdmin, appel: ReturnType<AvisService['masquer']>, message: string) {
    this.enCours.set(a.id);
    this.succes.set('');
    this.erreur.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set(message);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409 || e.status === 404) {
          this.charger(e.error?.erreur ?? this.i18n.t('moderation.dejaTraite'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('moderation.traitementEchec'));
        }
      },
    });
  }
}
