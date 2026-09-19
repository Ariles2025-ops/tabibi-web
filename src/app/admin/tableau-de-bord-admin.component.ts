import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminService, StatistiquesAdministration } from './admin.service';

/** Tableau de bord de l'administrateur : nombre de candidatures par statut (GET /api/admin/statistiques). */
@Component({
  selector: 'app-tableau-de-bord-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">Administration</h1>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul *ngIf="statistiques() as s" style="list-style:none;padding:0;margin:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <li style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <span style="display:block;color:#566b64;font-size:.9rem">Candidatures en attente</span>
          <strong style="display:block;font-size:2rem;font-weight:600">{{ s.candidaturesEnAttente }}</strong>
        </li>
        <li style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <span style="display:block;color:#566b64;font-size:.9rem">Candidatures validées</span>
          <strong style="display:block;font-size:2rem;font-weight:600">{{ s.candidaturesValidees }}</strong>
        </li>
        <li style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <span style="display:block;color:#566b64;font-size:.9rem">Candidatures refusées</span>
          <strong style="display:block;font-size:2rem;font-weight:600">{{ s.candidaturesRefusees }}</strong>
        </li>
      </ul>

      <p style="margin:24px 0 0">
        <a class="bouton" routerLink="/admin/candidatures">Examiner les candidatures</a>
      </p>
    </main>
  `,
})
export class TableauDeBordAdminComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(AdminService);

  statistiques = signal<StatistiquesAdministration | null>(null);
  charge = signal(false);
  erreur = signal('');

  ngOnInit() {
    this.charge.set(true);
    this.service.statistiques().subscribe({
      next: (s) => {
        this.statistiques.set(s);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set("Cette page est réservée à l'administrateur.");
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger les statistiques.');
        }
      },
    });
  }
}
