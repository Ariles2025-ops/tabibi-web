import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { libelleStatutTeleconsultation } from '../teleconsultation/statut-teleconsultation';
import { Teleconsultation, TeleconsultationService, salleAccessible } from '../teleconsultation/teleconsultation.service';
import { MedecinService } from './medecin.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/** Action de pilotage en cours sur une teleconsultation (libelle du bouton pendant l'appel). */
type Action = 'demarrer' | 'terminer' | 'annuler';

/**
 * Teleconsultations du medecin connecte (GET /api/medecin/teleconsultations) : demarrage (uniquement apres le
 * consentement du patient), cloture, annulation et lien de la salle video.
 */
@Component({
  selector: 'app-teleconsultations-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">{{ 'teleconsultationMedecin.titre' | t }}</h1>

      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let t of teleconsultations()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong *ngIf="datesRendezVous()[t.rendezVousId] as debut">{{ 'teleconsultation.rendezVousDu' | t:{ date: (debut | dateLocale:'jourHeure') } }}</strong>
            <strong *ngIf="!datesRendezVous()[t.rendezVousId]">{{ 'teleconsultationMedecin.proposeeLe' | t:{ date: (t.creeLe | dateLocale:'jourHeure') } }}</strong>
            <span style="color:#566b64"> · {{ libelleStatut(t.statut) }}</span><br>
            <span style="color:#566b64">{{ 'commun.patientId' | t:{ id: t.patientId } }}</span>
            <span *ngIf="t.consentementPatientLe as consentement" style="color:#566b64"> · {{ 'teleconsultation.consentementDonneLe' | t:{ date: (consentement | dateLocale:'courtHeure') } }}</span>
            <span *ngIf="t.statut === 'PLANIFIEE' && !t.consentementPatientLe" style="color:#b3261e"> · {{ 'teleconsultationMedecin.enAttenteConsentement' | t }}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <a *ngIf="salleAccessible(t)" class="bouton-secondaire" [href]="t.lienSalle" target="_blank" rel="noopener">
              {{ 'teleconsultationMedecin.ouvrirSalle' | t }}
            </a>
            <button *ngIf="t.statut === 'PLANIFIEE'" type="button" class="bouton" (click)="demarrer(t)"
                    [disabled]="!t.consentementPatientLe || enCours() !== null"
                    [title]="t.consentementPatientLe ? '' : ('teleconsultationMedecin.enAttenteConsentement' | t)">
              {{ (enCours() === t.id && action() === 'demarrer' ? 'teleconsultationMedecin.demarrage' : 'teleconsultationMedecin.demarrer') | t }}
            </button>
            <button *ngIf="t.statut === 'EN_COURS'" type="button" class="bouton" (click)="terminer(t)"
                    [disabled]="enCours() !== null">
              {{ (enCours() === t.id && action() === 'terminer' ? 'teleconsultationMedecin.cloture' : 'teleconsultationMedecin.terminer') | t }}
            </button>
            <button *ngIf="t.statut === 'PLANIFIEE'" type="button" (click)="annuler(t)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ (enCours() === t.id && action() === 'annuler' ? 'commun.annulation' : 'commun.annuler') | t }}
            </button>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && teleconsultations().length === 0">
        {{ 'teleconsultationMedecin.aucune' | t }}
        <a routerLink="/medecin/agenda" style="color:var(--vert)">{{ 'teleconsultationMedecin.proposerDepuisAgenda' | t }}</a>
      </p>
    </main>
  `,
})
export class TeleconsultationsMedecinComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(TeleconsultationService);
  private medecinService = inject(MedecinService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles de statut. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  teleconsultations = signal<Teleconsultation[]>([]);
  /** Date de debut des rendez-vous de l'agenda, par identifiant de rendez-vous. */
  datesRendezVous = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  /** Identifiant de la teleconsultation en cours de mise a jour, et l'action lancee. */
  enCours = signal<string | null>(null);
  action = signal<Action | null>(null);
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.teleconsultations');
    this.charger();
  }

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (etat depasse apres un 409). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.duMedecin().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.teleconsultations.set([...liste].sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe)));
        this.chargerDatesRendezVous(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveMedecins'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('teleconsultationMedecin.erreurChargement'));
        }
      },
    });
  }

  demarrer(t: Teleconsultation) {
    if (!t.consentementPatientLe) return;
    this.piloter(t, 'demarrer', this.service.demarrer(t.id), this.i18n.t('teleconsultationMedecin.pasDeConsentement'));
  }

  terminer(t: Teleconsultation) {
    this.piloter(t, 'terminer', this.service.terminer(t.id), this.i18n.t('teleconsultationMedecin.pasEnCours'));
  }

  annuler(t: Teleconsultation) {
    if (!confirm(this.i18n.t('teleconsultationMedecin.confirmerAnnulation'))) return;
    this.piloter(t, 'annuler', this.service.annuler(t.id), this.i18n.t('teleconsultationMedecin.plusAnnulable'));
  }

  salleAccessible(t: Teleconsultation): boolean {
    return salleAccessible(t);
  }

  libelleStatut(statut: string): string {
    return libelleStatutTeleconsultation(statut, this.traduire);
  }

  /** Lance une transition ; la vue renvoyee remplace la ligne ; un 409 (etat depasse) affiche le motif et recharge. */
  private piloter(t: Teleconsultation, action: Action, appel: ReturnType<TeleconsultationService['demarrer']>, motif409: string) {
    this.enCours.set(t.id);
    this.action.set(action);
    this.erreur.set('');
    appel.subscribe({
      next: (misAJour) => {
        this.enCours.set(null);
        this.action.set(null);
        this.teleconsultations.update((liste) => liste.map((x) => (x.id === misAJour.id ? misAJour : x)));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.action.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.charger(e.error?.erreur ?? motif409);
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('teleconsultationMedecin.majEchec'));
        }
      },
    });
  }

  /** Date du rendez-vous lie, lue dans l'agenda ; a defaut, la date de proposition reste affichee. */
  private chargerDatesRendezVous(liste: Teleconsultation[]) {
    if (liste.length === 0) return;
    this.medecinService.agenda().subscribe({
      next: (rendezVous) => {
        const dates: Partial<Record<string, string>> = {};
        for (const r of rendezVous) dates[r.id] = r.debut;
        this.datesRendezVous.set(dates);
      },
      error: () => undefined,
    });
  }
}
