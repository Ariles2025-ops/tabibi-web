import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { InscriptionAttente, ListeAttenteService } from '../liste-attente/liste-attente.service';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { SeoService } from '../seo/seo.service';

/**
 * Liste d'attente du medecin (GET /api/medecin/liste-attente) : patients inscrits, du plus ancien au plus recent,
 * designes par un identifiant abrege et leur date d'inscription. Ils sont prevenus par l'API des qu'un creneau
 * s'ouvre ou se libere.
 */
@Component({
  selector: 'app-liste-attente-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Liste d'attente</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Patients qui attendent un créneau chez vous, du plus ancien au plus récent. Ils sont prévenus dès que vous
        ouvrez un créneau ou qu'un rendez-vous est annulé.
      </p>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ol style="padding:0 0 0 24px;margin:0;display:grid;gap:10px">
        <li *ngFor="let i of inscriptions()" style="padding:4px 0">
          <strong>Patient {{ abreger(i.patientId) }}</strong>
          <span style="color:#566b64"> · inscrit le {{ i.inscritLe | date:'d MMMM yyyy à HH:mm' }}</span>
        </li>
      </ol>
      <p *ngIf="!charge() && !erreur() && inscriptions().length === 0">
        Aucun patient en liste d'attente pour le moment.
        <a routerLink="/medecin/disponibilites" style="color:var(--vert)">Ouvrir des créneaux</a>
      </p>
    </main>
  `,
})
export class ListeAttenteMedecinComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(ListeAttenteService);

  inscriptions = signal<InscriptionAttente[]>([]);
  charge = signal(false);
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee("Liste d'attente");
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

  abreger(id: string): string {
    return abregerIdentifiant(id);
  }
}
