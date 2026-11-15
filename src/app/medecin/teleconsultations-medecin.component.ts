import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { libelleStatutTeleconsultation } from '../teleconsultation/statut-teleconsultation';
import { Teleconsultation, TeleconsultationService, salleAccessible } from '../teleconsultation/teleconsultation.service';
import { MedecinService } from './medecin.service';
import { PatientsService, RepertoirePatients, nomPatient } from './patients.service';

/** Le medecin peut demarrer une teleconsultation a partir de 15 minutes avant l'heure du rendez-vous. */
export const AVANCE_DEMARRAGE_MS = 15 * 60_000;

/** Action de pilotage en cours sur une teleconsultation (libelle du bouton pendant l'appel). */
type Action = 'demarrer' | 'terminer' | 'annuler';

/**
 * Teleconsultations du medecin connecte (GET /api/medecin/teleconsultations), avec le nom du patient :
 * demarrage (apres le consentement du patient, a partir de 15 min avant le rendez-vous), cloture (le rendez-vous
 * est alors marque honore par l'API), annulation confirmee dans la page et lien de la salle video.
 */
@Component({
  selector: 'app-teleconsultations-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--blue);margin:0 0 16px">Téléconsultations</h1>

      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let t of teleconsultations()"
            style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong *ngIf="datesRendezVous()[t.rendezVousId] as debut" style="color:var(--ink)">Rendez-vous du {{ debut | date:'EEEE d MMMM à HH:mm' }}</strong>
            <strong *ngIf="!datesRendezVous()[t.rendezVousId]" style="color:var(--ink)">Proposée le {{ t.creeLe | date:'EEEE d MMMM à HH:mm' }}</strong>
            <span style="display:inline-block;background:var(--blue-l);color:var(--blue-d);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:6px">{{ libelleStatut(t.statut) }}</span><br>
            <span style="color:var(--text2)"><i class="fa fa-user fa-xs"></i> {{ nom(t.patientId) }}</span>
            <span *ngIf="t.consentementPatientLe" style="color:var(--text3)"> · consentement donné le {{ t.consentementPatientLe | date:'d MMMM à HH:mm' }}</span>
            <span *ngIf="t.statut === 'PLANIFIEE' && !t.consentementPatientLe" style="color:var(--red)"> · En attente du consentement du patient</span>
            <span *ngIf="t.statut === 'PLANIFIEE' && t.consentementPatientLe && !demarrable(t)" style="display:block;color:var(--text3);font-size:.9rem;margin-top:4px">
              Démarrage possible 15 minutes avant le rendez-vous.
            </span>
          </div>

          <div *ngIf="aConfirmer() === t.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:var(--text2);font-size:.9rem">Annuler cette téléconsultation ?</span>
            <button type="button" class="bouton" (click)="annuler(t)" [disabled]="enCours() !== null">
              {{ enCours() === t.id && action() === 'annuler' ? 'Annulation…' : 'Oui' }}
            </button>
            <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">Non</button>
          </div>

          <div *ngIf="aConfirmer() !== t.id" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <a *ngIf="salleAccessible(t)" class="bouton-secondaire" [href]="t.lienSalle" target="_blank" rel="noopener">
              Ouvrir la salle
            </a>
            <button *ngIf="t.statut === 'PLANIFIEE'" type="button" class="bouton" (click)="demarrer(t)"
                    [disabled]="!t.consentementPatientLe || !demarrable(t) || enCours() !== null"
                    [title]="!t.consentementPatientLe ? 'En attente du consentement du patient' : !demarrable(t) ? 'Disponible 15 minutes avant le rendez-vous' : ''">
              {{ enCours() === t.id && action() === 'demarrer' ? 'Démarrage…' : 'Démarrer' }}
            </button>
            <button *ngIf="t.statut === 'EN_COURS'" type="button" class="bouton" (click)="terminer(t)"
                    [disabled]="enCours() !== null">
              {{ enCours() === t.id && action() === 'terminer' ? 'Clôture…' : 'Terminer' }}
            </button>
            <button *ngIf="t.statut === 'PLANIFIEE'" type="button" (click)="aConfirmer.set(t.id)" [disabled]="enCours() !== null"
                    style="padding:11px 18px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
              Annuler
            </button>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && teleconsultations().length === 0">
        Aucune téléconsultation pour le moment.
        <a routerLink="/medecin/agenda" style="color:var(--blue)">Proposer une téléconsultation depuis l'agenda</a>
      </p>
    </main>
  `,
})
export class TeleconsultationsMedecinComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(TeleconsultationService);
  private medecinService = inject(MedecinService);
  private patients = inject(PatientsService);

  teleconsultations = signal<Teleconsultation[]>([]);
  /** Date de debut des rendez-vous de l'agenda, par identifiant de rendez-vous. */
  datesRendezVous = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  /** Identifiant de la teleconsultation en cours de mise a jour, et l'action lancee. */
  enCours = signal<string | null>(null);
  action = signal<Action | null>(null);
  /** Teleconsultation dont l'annulation attend la confirmation (Oui / Non). */
  aConfirmer = signal<string | null>(null);
  repertoire = signal<RepertoirePatients>(new Map());
  erreur = signal('');

  ngOnInit() {
    this.charger();
    this.patients.patientsDuMedecin().subscribe({ next: (r) => this.repertoire.set(r), error: () => undefined });
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId);
  }

  /** Demarrable a partir de 15 min avant le rendez-vous ; si sa date est inconnue, le serveur tranche. */
  demarrable(t: Teleconsultation): boolean {
    const debut = this.datesRendezVous()[t.rendezVousId];
    return !debut || Date.now() >= Date.parse(debut) - AVANCE_DEMARRAGE_MS;
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
          this.erreur.set('Cette page est réservée aux médecins.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos téléconsultations.');
        }
      },
    });
  }

  demarrer(t: Teleconsultation) {
    if (!t.consentementPatientLe || !this.demarrable(t)) return;
    this.piloter(t, 'demarrer', this.service.demarrer(t.id), "Le patient n'a pas encore donné son consentement.");
  }

  terminer(t: Teleconsultation) {
    this.piloter(t, 'terminer', this.service.terminer(t.id), "Cette téléconsultation n'est pas en cours.");
  }

  annuler(t: Teleconsultation) {
    this.piloter(t, 'annuler', this.service.annuler(t.id), "Cette téléconsultation ne peut plus être annulée.");
  }

  salleAccessible(t: Teleconsultation): boolean {
    return salleAccessible(t);
  }

  libelleStatut(statut: string): string {
    return libelleStatutTeleconsultation(statut);
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
        this.aConfirmer.set(null);
        this.teleconsultations.update((liste) => liste.map((x) => (x.id === misAJour.id ? misAJour : x)));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.action.set(null);
        this.aConfirmer.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.charger(e.error?.erreur ?? motif409);
        } else {
          this.erreur.set(e.error?.erreur ?? 'La mise à jour de la téléconsultation a échoué, veuillez réessayer.');
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
