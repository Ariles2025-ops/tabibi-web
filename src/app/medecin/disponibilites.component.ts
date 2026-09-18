import { Component, LOCALE_ID, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { MedecinService } from './medecin.service';

/** Creneau que le medecin vient d'ouvrir (message de confirmation). */
interface CreneauOuvert {
  debut: string;
  dureeMinutes: number;
}

/** Ouverture de creneaux de consultation par le medecin (POST /api/medecin/creneaux). */
@Component({
  selector: 'app-disponibilites',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Disponibilités</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Ouvrez un créneau de consultation : les patients pourront le réserver depuis votre fiche.
      </p>

      <form (ngSubmit)="ouvrir()" #f="ngForm" style="display:grid;gap:12px;max-width:360px">
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          Date et heure
          <input class="champ" type="datetime-local" [(ngModel)]="debut" name="debut" required [min]="minDebut"
                 style="color:#10241F;font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          Durée (minutes)
          <input class="champ" type="number" [(ngModel)]="dureeMinutes" name="dureeMinutes" required min="5" max="240" step="5"
                 style="color:#10241F;font-size:1rem">
        </label>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || enCours()">
            {{ enCours() ? 'Ouverture…' : 'Ouvrir le créneau' }}
          </button>
        </div>
      </form>

      <p *ngIf="succes() as c" style="color:var(--vert)">
        Créneau ouvert le {{ c.debut | date:'EEEE d MMMM à HH:mm' }} ({{ c.dureeMinutes }} min).
        <a routerLink="/medecin/agenda" style="color:var(--vert)">Voir l'agenda</a>
      </p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
    </main>
  `,
})
export class DisponibilitesComponent {
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private locale = inject(LOCALE_ID);

  /** Valeur du champ datetime-local : heure locale sans fuseau (« 2026-09-21T09:30 »). */
  debut = '';
  dureeMinutes = 30;
  /** Borne basse du selecteur : maintenant, au format attendu par datetime-local. */
  minDebut = formatDate(new Date(), "yyyy-MM-dd'T'HH:mm", this.locale);
  enCours = signal(false);
  succes = signal<CreneauOuvert | null>(null);
  erreur = signal('');

  ouvrir() {
    // new Date('2026-09-21T09:30') interprete l'heure locale ; toISOString() la convertit en ISO 8601 UTC.
    const debut = new Date(this.debut);
    const dureeMinutes = Number(this.dureeMinutes);
    this.succes.set(null);
    this.erreur.set('');
    if (!this.debut || Number.isNaN(debut.getTime())) {
      this.erreur.set('Indiquez une date et une heure valides.');
      return;
    }
    if (debut.getTime() <= Date.now()) {
      this.erreur.set('Le créneau doit commencer dans le futur.');
      return;
    }
    if (!Number.isInteger(dureeMinutes) || dureeMinutes < 5) {
      this.erreur.set("Indiquez une durée d'au moins 5 minutes.");
      return;
    }
    const debutIso = debut.toISOString();
    this.enCours.set(true);
    this.service.ouvrirCreneau(debutIso, dureeMinutes).subscribe({
      next: () => {
        this.enCours.set(false);
        this.succes.set({ debut: debutIso, dureeMinutes });
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Seul un compte médecin peut ouvrir un créneau.');
        } else if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? 'Un créneau existe déjà sur cet horaire.');
        } else {
          this.erreur.set(e.error?.erreur ?? "L'ouverture du créneau a échoué, veuillez réessayer.");
        }
      },
    });
  }
}
