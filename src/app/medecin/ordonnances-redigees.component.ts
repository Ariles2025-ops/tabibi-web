import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ListeOrdonnancesComponent } from '../ordonnances/liste-ordonnances.component';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { MedecinService } from './medecin.service';

/** Ordonnances emises par le medecin connecte (GET /api/medecin/ordonnances). */
@Component({
  selector: 'app-ordonnances-redigees',
  standalone: true,
  imports: [CommonModule, RouterLink, ListeOrdonnancesComponent],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">Mes ordonnances rédigées</h1>
        <a class="bouton" routerLink="/medecin/ordonnance/nouvelle">Rédiger une ordonnance</a>
      </div>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <app-liste-ordonnances [ordonnances]="ordonnances()" [afficherPatient]="true" />
      <p *ngIf="!charge() && !erreur() && ordonnances().length === 0">Aucune ordonnance rédigée pour le moment.</p>
    </main>
  `,
})
export class OrdonnancesRedigeesComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);

  ordonnances = signal<Ordonnance[]>([]);
  charge = signal(false);
  erreur = signal('');

  ngOnInit() {
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
}
