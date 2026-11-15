import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { libelleStatutOrdonnance } from '../ordonnances/statut-ordonnance';
import { MedecinService } from './medecin.service';
import { PatientsService, RepertoirePatients, nomPatient } from './patients.service';

/** Ordonnances emises par le medecin connecte (GET /api/medecin/ordonnances), avec le nom du patient. */
@Component({
  selector: 'app-ordonnances-redigees',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--blue);margin:0">Mes ordonnances rédigées</h1>
        <a class="bouton" routerLink="/medecin/ordonnance/nouvelle">Rédiger une ordonnance</a>
      </div>

      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let o of ordonnances()" style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);box-shadow:var(--s1)">
          <a [routerLink]="['/ordonnances', o.id]"
             style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;color:inherit;text-decoration:none">
            <span>
              <strong style="color:var(--ink)"><i class="fa fa-user fa-xs" style="color:var(--blue)"></i> {{ nom(o.patientId) }}</strong><br>
              <span style="color:var(--text3)">{{ o.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }} · {{ libelleStatut(o.statut) }}</span>
            </span>
            <code style="font-size:1rem;letter-spacing:.1em;color:var(--blue-d);background:var(--blue-l);border-radius:999px;padding:4px 12px">{{ o.codeVerification }}</code>
          </a>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && ordonnances().length === 0">Aucune ordonnance rédigée pour le moment.</p>
    </main>
  `,
})
export class OrdonnancesRedigeesComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private patients = inject(PatientsService);

  ordonnances = signal<Ordonnance[]>([]);
  repertoire = signal<RepertoirePatients>(new Map());
  charge = signal(false);
  erreur = signal('');

  ngOnInit() {
    this.patients.patientsDuMedecin().subscribe({ next: (r) => this.repertoire.set(r), error: () => undefined });
    this.charge.set(true);
    this.service.ordonnancesRedigees().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.ordonnances.set([...liste].sort((a, b) => Date.parse(b.emiseLe) - Date.parse(a.emiseLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux médecins.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos ordonnances.');
        }
      },
    });
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId);
  }

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut);
  }
}
