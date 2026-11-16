import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES } from '../secretaire/secretaire.service';
import { grouperParJour, valeurDateHeureLocale, styleOnglet } from './agenda-utils';

/** Acces aux creneaux d'un agenda : celui du medecin connecte ou celui d'un cabinet rattache (secretaire). */
export interface SourceCreneaux {
  lister(): Observable<Creneau[]>;
  ouvrir(debutIso: string, dureeMinutes: number): Observable<Creneau>;
  supprimer(creneauId: string): Observable<void>;
}

/** Creneau que l'on vient d'ouvrir (message de confirmation). */
interface CreneauOuvert {
  debut: string;
  dureeMinutes: number;
}

/** Nombre maximal de creneaux ouverts d'un coup par une serie. */
const SERIE_MAX = 48;

/**
 * Ouverture de creneaux (un seul, ou une serie consecutive sur une plage horaire) et liste des creneaux a venir,
 * par jour, avec suppression des creneaux libres apres confirmation dans la page. Partage entre la page
 * « Disponibilites » du medecin et l'espace secretaire.
 */
@Component({
    selector: 'app-gestion-creneaux',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:20px;margin:0 0 24px">
      <div role="tablist" style="display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap">
        <button type="button" role="tab" [attr.aria-selected]="mode() === 'unique'" (click)="changerMode('unique')"
                [ngStyle]="ongletStyle(mode() === 'unique')">Un créneau</button>
        <button type="button" role="tab" [attr.aria-selected]="mode() === 'serie'" (click)="changerMode('serie')"
                [ngStyle]="ongletStyle(mode() === 'serie')">Une série</button>
      </div>

      <form *ngIf="mode() === 'unique'" (ngSubmit)="ouvrir()" #f="ngForm" style="display:grid;gap:12px;max-width:380px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          Date et heure
          <input class="champ" type="datetime-local" [(ngModel)]="debut" name="debut" required [min]="minDebut"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          Durée (minutes, de {{ dureeMin }} à {{ dureeMax }})
          <input class="champ" type="number" [(ngModel)]="dureeMinutes" name="dureeMinutes" required [min]="dureeMin" [max]="dureeMax" step="5"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || ouverture()">
            {{ ouverture() ? 'Ouverture…' : 'Ouvrir le créneau' }}
          </button>
        </div>
      </form>

      <form *ngIf="mode() === 'serie'" (ngSubmit)="ouvrirSerie()" #fs="ngForm" style="display:grid;gap:12px;max-width:380px">
        <p style="margin:0;color:var(--text3);font-size:.9rem">
          Des créneaux consécutifs sont ouverts de l'heure de début jusqu'à l'heure de fin.
        </p>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          Date
          <input class="champ" type="date" [(ngModel)]="serieDate" name="serieDate" required [min]="minDate"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            De
            <input class="champ" type="time" [(ngModel)]="serieDebut" name="serieDebut" required style="color:var(--ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            À
            <input class="champ" type="time" [(ngModel)]="serieFin" name="serieFin" required style="color:var(--ink);font-size:1rem">
          </label>
        </div>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          Durée de chaque créneau (minutes, de {{ dureeMin }} à {{ dureeMax }})
          <input class="champ" type="number" [(ngModel)]="serieDuree" name="serieDuree" required [min]="dureeMin" [max]="dureeMax" step="5"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <div>
          <button type="submit" class="bouton" [disabled]="fs.invalid || ouverture()">
            {{ ouverture() ? 'Ouverture…' : 'Ouvrir la série' }}
          </button>
        </div>
      </form>

      <p *ngIf="succes() as c" style="color:var(--blue);margin:12px 0 0">
        Créneau ouvert le {{ c.debut | date:'EEEE d MMMM à HH:mm' }} ({{ c.dureeMinutes }} min).
        <a *ngIf="lienAgenda() as lien" [routerLink]="lien" style="color:var(--blue)">Voir l'agenda</a>
      </p>
      <p *ngIf="succesSerie()" style="color:var(--blue);margin:12px 0 0">{{ succesSerie() }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:12px 0 0">{{ erreur() }}</p>
    </section>

    <h2 style="font-size:1.1rem;margin:0 0 12px;color:var(--ink)">Créneaux à venir</h2>
    <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
    <p *ngIf="erreurListe()" role="alert" style="color:var(--red)">{{ erreurListe() }}</p>
    <p *ngIf="!charge() && !erreurListe() && creneaux().length === 0" style="color:var(--text3)">Aucun créneau à venir.</p>

    <div *ngFor="let j of jours()" style="margin:0 0 16px">
      <h3 style="font-size:.95rem;margin:0 0 8px;color:var(--text2);text-transform:capitalize">{{ j.debut | date:'EEEE d MMMM' }}</h3>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
        <li *ngFor="let c of j.elements" class="creneau"
            style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span>
            <strong style="color:var(--ink)">{{ c.debut | date:'HH:mm' }}</strong>
            <span style="color:var(--text3)"> · {{ c.dureeMinutes }} min</span>
            <span *ngIf="c.disponible" style="display:inline-block;margin-left:8px;background:var(--blue-l);color:var(--blue-d);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600">Libre</span>
            <span *ngIf="!c.disponible" style="display:inline-block;margin-left:8px;background:var(--red-l);color:var(--red);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600">Réservé</span>
          </span>
          <ng-container *ngIf="c.disponible">
            <span *ngIf="aConfirmer() === c.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span style="color:var(--text2);font-size:.9rem">Supprimer ce créneau ?</span>
              <button type="button" class="bouton" (click)="supprimer(c)" [disabled]="suppression() !== null">
                {{ suppression() === c.id ? 'Suppression…' : 'Oui' }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="suppression() !== null">Non</button>
            </span>
            <button *ngIf="aConfirmer() !== c.id" type="button" (click)="aConfirmer.set(c.id)" [disabled]="suppression() !== null"
                    style="padding:8px 14px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
              Supprimer
            </button>
          </ng-container>
        </li>
      </ul>
    </div>
  `
})
export class GestionCreneauxComponent implements OnChanges {
  private auth = inject(AuthService);

  source = input.required<SourceCreneaux>();
  /** Message affiche sur un 403. */
  message403 = input("Vous n'avez pas accès à cet agenda.");
  /** Lien « Voir l'agenda » apres ouverture d'un creneau (aucun si null). */
  lienAgenda = input<string | null>(null);

  mode = signal<'unique' | 'serie'>('unique');
  creneaux = signal<Creneau[]>([]);
  jours = computed(() => grouperParJour(this.creneaux()));
  charge = signal(false);
  ouverture = signal(false);
  /** Creneau dont la suppression est demandee (confirmation Oui / Non), puis en cours. */
  aConfirmer = signal<string | null>(null);
  suppression = signal<string | null>(null);
  succes = signal<CreneauOuvert | null>(null);
  succesSerie = signal('');
  erreur = signal('');
  erreurListe = signal('');

  dureeMin = DUREE_MIN_MINUTES;
  dureeMax = DUREE_MAX_MINUTES;
  /** Bornes basses des selecteurs : maintenant, aux formats datetime-local et date. */
  minDebut = valeurDateHeureLocale(new Date());
  minDate = this.minDebut.slice(0, 10);

  /** Valeur du champ datetime-local : heure locale sans fuseau (« 2026-09-21T09:30 »). */
  debut = '';
  dureeMinutes = 30;
  serieDate = '';
  serieDebut = '09:00';
  serieFin = '12:00';
  serieDuree = 30;

  ngOnChanges() {
    this.succes.set(null);
    this.succesSerie.set('');
    this.erreur.set('');
    this.aConfirmer.set(null);
    this.charger();
  }

  changerMode(mode: 'unique' | 'serie') {
    this.mode.set(mode);
    this.erreur.set('');
  }

  ongletStyle(actif: boolean): Record<string, string> {
    return styleOnglet(actif);
  }

  charger() {
    const source = this.source();
    this.charge.set(true);
    this.erreurListe.set('');
    source.lister().subscribe({
      next: (liste) => {
        if (source !== this.source()) return;
        const maintenant = Date.now();
        this.creneaux.set(
          liste
            .filter((c) => Date.parse(c.debut) + c.dureeMinutes * 60_000 > maintenant)
            .sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
        );
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 403) this.erreurListe.set(this.message403());
        else this.erreurListe.set(e.error?.erreur ?? 'Impossible de charger les créneaux.');
      },
    });
  }

  ouvrir() {
    // new Date('2026-09-21T09:30') interprete l'heure locale ; toISOString() la convertit en ISO 8601 UTC.
    const debut = new Date(this.debut);
    const dureeMinutes = Number(this.dureeMinutes);
    this.reinitialiserMessages();
    if (!this.debut || Number.isNaN(debut.getTime())) {
      this.erreur.set('Indiquez une date et une heure valides.');
      return;
    }
    if (debut.getTime() <= Date.now()) {
      this.erreur.set('Le créneau doit commencer dans le futur.');
      return;
    }
    if (!this.dureeValide(dureeMinutes)) return;
    const debutIso = debut.toISOString();
    this.ouverture.set(true);
    this.source().ouvrir(debutIso, dureeMinutes).subscribe({
      next: () => {
        this.ouverture.set(false);
        this.succes.set({ debut: debutIso, dureeMinutes });
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.ouverture.set(false);
        this.traiterErreurOuverture(e);
      },
    });
  }

  /** Serie : creneaux consecutifs de `serieDebut` a `serieFin` ; les appels s'arretent a la premiere erreur. */
  ouvrirSerie() {
    this.reinitialiserMessages();
    const duree = Number(this.serieDuree);
    if (!this.dureeValide(duree)) return;
    const debut = new Date(`${this.serieDate}T${this.serieDebut}`);
    const fin = new Date(`${this.serieDate}T${this.serieFin}`);
    if (!this.serieDate || Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
      this.erreur.set('Indiquez une date et des heures valides.');
      return;
    }
    if (fin.getTime() <= debut.getTime()) {
      this.erreur.set("L'heure de fin doit être après l'heure de début.");
      return;
    }
    const maintenant = Date.now();
    const debuts: Date[] = [];
    for (let t = debut.getTime(); t + duree * 60_000 <= fin.getTime(); t += duree * 60_000) {
      if (t > maintenant) debuts.push(new Date(t));
    }
    if (debuts.length === 0) {
      this.erreur.set('Aucun créneau à venir dans cette plage horaire.');
      return;
    }
    if (debuts.length > SERIE_MAX) {
      this.erreur.set(`Une série est limitée à ${SERIE_MAX} créneaux : réduisez la plage horaire.`);
      return;
    }
    this.ouverture.set(true);
    this.ouvrirSuivant(debuts, 0, duree);
  }

  supprimer(c: Creneau) {
    this.suppression.set(c.id);
    this.erreurListe.set('');
    this.source().supprimer(c.id).subscribe({
      next: () => {
        this.suppression.set(null);
        this.aConfirmer.set(null);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.suppression.set(null);
        this.aConfirmer.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
          return;
        }
        const message =
          e.error?.erreur ??
          (e.status === 409
            ? "Ce créneau est réservé : annulez d'abord le rendez-vous."
            : e.status === 403
              ? this.message403()
              : 'La suppression du créneau a échoué, veuillez réessayer.');
        this.charger();
        this.erreurListe.set(message);
      },
    });
  }

  private ouvrirSuivant(debuts: Date[], index: number, duree: number) {
    if (index >= debuts.length) {
      this.ouverture.set(false);
      this.succesSerie.set(`${debuts.length} créneau${debuts.length > 1 ? 'x' : ''} ouvert${debuts.length > 1 ? 's' : ''}.`);
      this.charger();
      return;
    }
    this.source().ouvrir(debuts[index].toISOString(), duree).subscribe({
      next: () => this.ouvrirSuivant(debuts, index + 1, duree),
      error: (e: HttpErrorResponse) => {
        this.ouverture.set(false);
        if (index > 0) {
          this.succesSerie.set(`${index} créneau${index > 1 ? 'x' : ''} ouvert${index > 1 ? 's' : ''} avant l'arrêt.`);
          this.charger();
        }
        const heure = debuts[index].toTimeString().slice(0, 5);
        this.traiterErreurOuverture(e, `Arrêt au créneau de ${heure} : `);
      },
    });
  }

  private dureeValide(duree: number): boolean {
    if (!Number.isInteger(duree) || duree < DUREE_MIN_MINUTES || duree > DUREE_MAX_MINUTES) {
      this.erreur.set(`Indiquez une durée entre ${DUREE_MIN_MINUTES} et ${DUREE_MAX_MINUTES} minutes.`);
      return false;
    }
    return true;
  }

  private reinitialiserMessages() {
    this.succes.set(null);
    this.succesSerie.set('');
    this.erreur.set('');
  }

  private traiterErreurOuverture(e: HttpErrorResponse, prefixe = '') {
    if (e.status === 401) {
      this.auth.seConnecter();
    } else if (e.status === 403) {
      this.erreur.set(prefixe + this.message403());
    } else if (e.status === 409) {
      this.erreur.set(prefixe + (e.error?.erreur ?? 'Un créneau existe déjà sur cet horaire.'));
    } else if (e.status === 400) {
      this.erreur.set(prefixe + (e.error?.erreur ?? 'Le créneau est invalide.'));
    } else {
      this.erreur.set(prefixe + (e.error?.erreur ?? "L'ouverture du créneau a échoué, veuillez réessayer."));
    }
  }
}
