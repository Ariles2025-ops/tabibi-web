import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { InscriptionAttente, ListeAttenteService } from '../liste-attente/liste-attente.service';
import { PatientsService, RepertoirePatients, nomPatient, telephonePatient } from './patients.service';

/**
 * Liste d'attente du medecin (GET /api/medecin/liste-attente) : patients inscrits, du plus ancien au plus recent,
 * designes par leur nom (et telephone) et leur date d'inscription. Ils sont prevenus par l'API des qu'un creneau
 * s'ouvre ou se libere.
 */
@Component({
  selector: 'app-liste-attente-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--blue);margin:0 0 8px">Liste d'attente</h1>
      <p style="color:var(--text3);margin:0 0 20px">
        Patients qui attendent un créneau chez vous, du plus ancien au plus récent. Ils sont prévenus dès que vous
        ouvrez un créneau ou qu'un rendez-vous est annulé.
      </p>

      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <ol style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let i of inscriptions(); let n = index"
            style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);box-shadow:var(--s1);padding:12px 16px;display:flex;align-items:center;gap:12px">
          <span style="flex:none;width:28px;height:28px;border-radius:999px;background:var(--blue-l);color:var(--blue-d);display:grid;place-items:center;font-weight:700;font-size:.85rem">{{ n + 1 }}</span>
          <span>
            <strong style="color:var(--ink)">{{ nom(i.patientId) }}</strong>
            <a *ngIf="telephone(i.patientId) as tel" [href]="'tel:' + tel" style="color:var(--text3);margin-left:8px;text-decoration:none">
              <i class="fa fa-phone fa-xs"></i> {{ tel }}
            </a><br>
            <span style="color:var(--text3);font-size:.9rem">Inscrit le {{ i.inscritLe | date:'d MMMM yyyy à HH:mm' }}</span>
          </span>
        </li>
      </ol>
      <p *ngIf="!charge() && !erreur() && inscriptions().length === 0">
        Aucun patient en liste d'attente pour le moment.
        <a routerLink="/medecin/disponibilites" style="color:var(--blue)">Ouvrir des créneaux</a>
      </p>
    </main>
  `,
})
export class ListeAttenteMedecinComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(ListeAttenteService);
  private patients = inject(PatientsService);

  inscriptions = signal<InscriptionAttente[]>([]);
  charge = signal(false);
  repertoire = signal<RepertoirePatients>(new Map());
  erreur = signal('');

  ngOnInit() {
    this.patients.patientsDuMedecin().subscribe({ next: (r) => this.repertoire.set(r), error: () => undefined });
    this.charge.set(true);
    this.service.duMedecin().subscribe({
      next: (liste) => {
        this.inscriptions.set([...liste].sort((a, b) => Date.parse(a.inscritLe) - Date.parse(b.inscritLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux médecins.');
        } else {
          this.erreur.set(e.error?.erreur ?? "Impossible de charger la liste d'attente.");
        }
      },
    });
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId);
  }

  telephone(patientId: string): string {
    return telephonePatient(this.repertoire(), patientId);
  }
}
