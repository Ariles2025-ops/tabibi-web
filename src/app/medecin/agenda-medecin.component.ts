import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { libelleStatutRendezVous } from '../rendezvous/statut-rendez-vous';
import { TeleconsultationService } from '../teleconsultation/teleconsultation.service';
import { MedecinService } from './medecin.service';

/**
 * Agenda du medecin : ses rendez-vous, a marquer honores ou a annuler (creneau remis a disposition, patient
 * prevenu), avec redaction d'ordonnance preremplie et proposition d'une teleconsultation sur un rendez-vous confirme.
 */
@Component({
  selector: 'app-agenda-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">Agenda</h1>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
      <p *ngIf="teleconsultationProposee() as r" style="color:var(--vert)">
        Téléconsultation proposée au patient pour le rendez-vous du {{ r.debut | date:'EEEE d MMMM à HH:mm' }}.
        <a routerLink="/medecin/teleconsultations" style="color:var(--vert)">Voir mes téléconsultations</a>
      </p>
      <p *ngIf="annule() as r" style="color:var(--vert)">
        Rendez-vous du {{ r.debut | date:'EEEE d MMMM à HH:mm' }} annulé : le créneau est de nouveau proposé et le patient est prévenu.
      </p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let r of rendezVous()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong>{{ r.debut | date:'EEEE d MMMM à HH:mm' }}</strong>
            <span style="color:#566b64"> · {{ libelleStatut(r.statut) }}</span><br>
            <span style="color:#566b64">Patient : {{ r.patientId }}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button *ngIf="r.statut === 'CONFIRME'" type="button" class="bouton" (click)="honorer(r)"
                    [disabled]="enCours() !== null">
              {{ enCours() === r.id ? 'Enregistrement…' : 'Marquer honoré' }}
            </button>
            <button *ngIf="r.statut === 'CONFIRME'" type="button" class="bouton-secondaire" (click)="proposerTeleconsultation(r)"
                    [disabled]="enCours() !== null">
              {{ enCours() === r.id ? 'Envoi…' : 'Proposer une téléconsultation' }}
            </button>
            <button *ngIf="r.statut === 'CONFIRME'" type="button" (click)="annuler(r)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ enCours() === r.id ? 'Annulation…' : 'Annuler' }}
            </button>
            <a *ngIf="r.statut !== 'ANNULE'" class="bouton-secondaire" routerLink="/medecin/ordonnance/nouvelle"
               [queryParams]="{ patientId: r.patientId, rendezVousId: r.id }">Rédiger une ordonnance</a>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && rendezVous().length === 0">
        Aucun rendez-vous pour le moment.
        <a routerLink="/medecin/disponibilites" style="color:var(--vert)">Ouvrir des créneaux</a>
      </p>
    </main>
  `,
})
export class AgendaMedecinComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private teleconsultations = inject(TeleconsultationService);

  rendezVous = signal<RendezVous[]>([]);
  charge = signal(false);
  /** Identifiant du rendez-vous en cours de mise a jour. */
  enCours = signal<string | null>(null);
  /** Rendez-vous sur lequel une teleconsultation vient d'etre proposee (message de confirmation). */
  teleconsultationProposee = signal<RendezVous | null>(null);
  /** Rendez-vous que le medecin vient d'annuler (message de confirmation). */
  annule = signal<RendezVous | null>(null);
  erreur = signal('');

  ngOnInit() {
    this.charger();
  }

  /** Recharge l'agenda ; `motif` est un message d'erreur a conserver a l'ecran (rendez-vous modifie ailleurs). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.agenda().subscribe({
      next: (liste) => {
        this.rendezVous.set([...liste].sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux médecins.');
        } else {
          this.erreur.set(e.error?.erreur ?? "Impossible de charger l'agenda.");
        }
      },
    });
  }

  honorer(rdv: RendezVous) {
    this.enCours.set(rdv.id);
    this.erreur.set('');
    this.teleconsultationProposee.set(null);
    this.annule.set(null);
    this.service.honorer(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? 'La mise à jour du rendez-vous a échoué, veuillez réessayer.');
      },
    });
  }

  /**
   * Annule un rendez-vous confirme, apres confirmation : le creneau est remis a disposition et le patient prevenu
   * par l'API (409 s'il n'est plus confirme : motif affiche et agenda recharge).
   */
  annuler(rdv: RendezVous) {
    if (!confirm('Annuler ce rendez-vous ? Le patient sera prévenu et le créneau de nouveau proposé.')) return;
    this.enCours.set(rdv.id);
    this.erreur.set('');
    this.teleconsultationProposee.set(null);
    this.annule.set(null);
    this.service.annulerRendezVous(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.annule.set(rdv);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.charger(e.error?.erreur ?? "Ce rendez-vous n'est plus confirmé.");
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? "L'annulation a échoué, veuillez réessayer.");
        }
      },
    });
  }

  /** Planifie une teleconsultation sur le rendez-vous (409 si non confirme ou deja planifiee : motif affiche). */
  proposerTeleconsultation(rdv: RendezVous) {
    this.enCours.set(rdv.id);
    this.erreur.set('');
    this.teleconsultationProposee.set(null);
    this.annule.set(null);
    this.teleconsultations.planifier(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.teleconsultationProposee.set(rdv);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? 'Une téléconsultation est déjà proposée sur ce rendez-vous.');
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? 'La proposition de téléconsultation a échoué, veuillez réessayer.');
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut);
  }
}
