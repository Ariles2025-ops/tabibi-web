import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Creneau, Medecin } from '../annuaire/annuaire.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-fiche-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/" style="color:var(--vert)">Retour à l'annuaire</a></p>

      <ng-container *ngIf="medecin() as m">
        <h1 style="color:var(--vert);margin:0 0 4px">{{ m.nomComplet }}</h1>
        <p style="color:#566b64;margin:0 0 24px">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</p>
      </ng-container>

      <h2 style="font-size:1.1rem;margin:0 0 12px">Créneaux disponibles</h2>

      <p *ngIf="reservation() as r" style="color:var(--vert)">
        Rendez-vous réservé le {{ r.debut | date:'EEEE d MMMM à HH:mm' }}.
        <a routerLink="/mes-rendez-vous" style="color:var(--vert)">Voir mes rendez-vous</a>
      </p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
      <p *ngIf="charge()">Chargement…</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let c of creneaux()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span>
            <strong>{{ c.debut | date:'EEEE d MMMM à HH:mm' }}</strong>
            <span style="color:#566b64">({{ c.dureeMinutes }} min)</span>
          </span>
          <button (click)="reserver(c)" [disabled]="enCours() !== null"
                  style="padding:10px 16px;background:var(--vert);color:#fff;border:0;border-radius:8px">
            {{ enCours() === c.id ? 'Réservation…' : 'Réserver' }}
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && creneaux().length === 0">Aucun créneau disponible pour le moment.</p>
    </main>
  `,
})
export class FicheMedecinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private rendezVous = inject(RendezVousService);
  private auth = inject(AuthService);

  private medecinId = '';
  medecin = signal<Medecin | null>(null);
  creneaux = signal<Creneau[]>([]);
  charge = signal(false);
  /** Identifiant du creneau dont la reservation est en cours. */
  enCours = signal<string | null>(null);
  /** Dernier creneau reserve avec succes (message de confirmation). */
  reservation = signal<Creneau | null>(null);
  erreur = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? ''));
  }

  private charger(id: string) {
    this.medecinId = id;
    this.medecin.set(null);
    this.creneaux.set([]);
    this.reservation.set(null);
    this.erreur.set('');
    this.annuaire.medecin(id).subscribe({
      next: (m) => this.medecin.set(m),
      error: (e: HttpErrorResponse) =>
        this.erreur.set(e.status === 404 ? 'Praticien introuvable.' : (e.error?.erreur ?? 'Impossible de charger la fiche du praticien.')),
    });
    this.chargerCreneaux();
  }

  private chargerCreneaux() {
    this.charge.set(true);
    this.annuaire.creneaux(this.medecinId).subscribe({
      next: (liste) => {
        this.creneaux.set(
          liste.filter((c) => c.disponible).sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
        );
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.creneaux.set([]);
        this.erreur.set(e.error?.erreur ?? 'Impossible de charger les créneaux.');
        this.charge.set(false);
      },
    });
  }

  async reserver(creneau: Creneau) {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    this.enCours.set(creneau.id);
    this.reservation.set(null);
    this.erreur.set('');
    this.rendezVous.reserver(creneau.id).subscribe({
      next: () => {
        this.creneaux.update((liste) => liste.filter((c) => c.id !== creneau.id));
        this.reservation.set(creneau);
        this.enCours.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.erreur.set("Ce créneau vient d'être pris.");
          this.chargerCreneaux();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Seul un compte patient peut réserver un créneau.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'La réservation a échoué, veuillez réessayer.');
        }
      },
    });
  }
}
