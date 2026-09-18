import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { libelleStatutRendezVous } from '../rendezvous/statut-rendez-vous';
import { MedecinService } from './medecin.service';

/** Agenda du medecin : ses rendez-vous, a marquer honores, avec redaction d'ordonnance preremplie. */
@Component({
  selector: 'app-agenda-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">Agenda</h1>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

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

  rendezVous = signal<RendezVous[]>([]);
  charge = signal(false);
  /** Identifiant du rendez-vous en cours de mise a jour. */
  enCours = signal<string | null>(null);
  erreur = signal('');

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
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

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut);
  }
}
