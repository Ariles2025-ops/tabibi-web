import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES } from '../secretaire/secretaire.service';
import { MedecinService } from './medecin.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';

/** Creneau que le medecin vient d'ouvrir (message de confirmation). */
interface CreneauOuvert {
  debut: string;
  dureeMinutes: number;
}

/** Ouverture de creneaux de consultation par le medecin (POST /api/medecin/creneaux). */
@Component({
  selector: 'app-disponibilites',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'disponibilites.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'disponibilites.intro' | t }}</p>

      <form (ngSubmit)="ouvrir()" #f="ngForm" style="display:grid;gap:12px;max-width:360px">
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          {{ 'disponibilites.dateHeure' | t }}
          <input class="champ" type="datetime-local" [(ngModel)]="debut" name="debut" required [min]="minDebut"
                 style="color:#10241F;font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          {{ 'disponibilites.duree' | t:{ min: dureeMin, max: dureeMax } }}
          <input class="champ" type="number" [(ngModel)]="dureeMinutes" name="dureeMinutes" required [min]="dureeMin" [max]="dureeMax" step="5"
                 style="color:#10241F;font-size:1rem">
        </label>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || enCours()">
            {{ (enCours() ? 'disponibilites.ouverture' : 'disponibilites.ouvrir') | t }}
          </button>
        </div>
      </form>

      <p *ngIf="succes() as c" style="color:var(--vert)">
        {{ 'disponibilites.creneauOuvert' | t:{ date: (c.debut | dateLocale:'jourHeure'), duree: c.dureeMinutes } }}
        <a routerLink="/medecin/agenda" style="color:var(--vert)">{{ 'disponibilites.voirAgenda' | t }}</a>
      </p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
    </main>
  `,
})
export class DisponibilitesComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private i18n = inject(TraductionService);

  ngOnInit() {
    this.seo.definirPrivee('seo.disponibilites');
  }

  /** Valeur du champ datetime-local : heure locale sans fuseau (« 2026-09-21T09:30 »). */
  debut = '';
  dureeMinutes = 30;
  /** Bornes de la duree, celles de l'API (CreneauService : 5 a 120 minutes), partagees avec l'espace secretaire. */
  dureeMin = DUREE_MIN_MINUTES;
  dureeMax = DUREE_MAX_MINUTES;
  /** Borne basse du selecteur : maintenant, au format attendu par datetime-local. */
  minDebut = formatDate(new Date(), "yyyy-MM-dd'T'HH:mm", this.i18n.locale());
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
      this.erreur.set(this.i18n.t('disponibilites.dateInvalide'));
      return;
    }
    if (debut.getTime() <= Date.now()) {
      this.erreur.set(this.i18n.t('disponibilites.futur'));
      return;
    }
    if (!Number.isInteger(dureeMinutes) || dureeMinutes < DUREE_MIN_MINUTES || dureeMinutes > DUREE_MAX_MINUTES) {
      this.erreur.set(this.i18n.t('disponibilites.dureeInvalide', { min: DUREE_MIN_MINUTES, max: DUREE_MAX_MINUTES }));
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
          this.erreur.set(this.i18n.t('disponibilites.seulMedecin'));
        } else if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('disponibilites.creneauExiste'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('disponibilites.ouvertureEchec'));
        }
      },
    });
  }
}
