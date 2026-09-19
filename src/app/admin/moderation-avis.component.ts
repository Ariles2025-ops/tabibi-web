import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AvisAdmin, AvisService, libelleStatutAvis } from '../avis/avis.service';

/** Filtre par statut de la liste ; '' = tous. */
const STATUTS_FILTRE = [
  { valeur: 'SIGNALE', libelle: 'Signalés' },
  { valeur: 'PUBLIE', libelle: 'Publiés' },
  { valeur: 'MASQUE', libelle: 'Masqués' },
  { valeur: '', libelle: 'Tous' },
];

/**
 * Moderation des avis par l'administrateur (GET /api/admin/avis?statut=) : masquage (retrait de la vue publique)
 * ou retablissement (remise en ligne apres signalement ou masquage). Les avis signales sont proposes en premier.
 */
@Component({
  selector: 'app-moderation-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">Modération des avis</h1>
        <label style="display:flex;align-items:center;gap:8px;color:#566b64;font-size:.9rem">
          Statut
          <select class="champ" [ngModel]="statut()" (ngModelChange)="filtrer($event)" name="statut" style="color:#10241F;font-size:1rem">
            <option *ngFor="let s of statuts" [value]="s.valeur">{{ s.libelle }}</option>
          </select>
        </label>
      </div>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let a of avis()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <strong>{{ a.note }} / 5</strong>
            <span style="color:#566b64"> · {{ libelleStatut(a.statut) }} · déposé le {{ a.deposeLe | date:'d MMMM yyyy à HH:mm' }}</span>
            <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
            <p *ngIf="!a.commentaire" style="margin:6px 0 0;color:#566b64">Sans commentaire.</p>
            <span style="display:block;margin:6px 0 0;color:#566b64;font-size:.85rem">
              Médecin {{ a.medecinId }} · Patient {{ a.patientId }} · Rendez-vous {{ a.rendezVousId }}
            </span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button *ngIf="a.statut !== 'MASQUE'" type="button" (click)="masquer(a)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ enCours() === a.id ? 'Enregistrement…' : 'Masquer' }}
            </button>
            <button *ngIf="a.statut !== 'PUBLIE'" type="button" class="bouton" (click)="retablir(a)" [disabled]="enCours() !== null">
              {{ enCours() === a.id ? 'Enregistrement…' : 'Rétablir' }}
            </button>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && avis().length === 0">Aucun avis pour ce filtre.</p>

      <p style="margin:24px 0 0"><a routerLink="/admin" style="color:var(--vert)">Retour au tableau de bord</a></p>
    </main>
  `,
})
export class ModerationAvisComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(AvisService);

  statuts = STATUTS_FILTRE;
  /** Statut filtre ('' = tous) ; les avis signales d'abord. */
  statut = signal('SIGNALE');
  avis = signal<AvisAdmin[]>([]);
  charge = signal(false);
  /** Identifiant de l'avis en cours de traitement. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.charger();
  }

  filtrer(statut: string) {
    this.statut.set(statut);
    this.succes.set('');
    this.charger();
  }

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (avis deja traite ailleurs). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.pourModeration(this.statut() || undefined).subscribe({
      next: (liste) => {
        this.avis.set(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set("Cette page est réservée à l'administrateur.");
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger les avis.');
        }
      },
    });
  }

  masquer(a: AvisAdmin) {
    this.traiter(a, this.service.masquer(a.id), 'Avis masqué : il ne figure plus sur la fiche du praticien.');
  }

  retablir(a: AvisAdmin) {
    this.traiter(a, this.service.retablir(a.id), 'Avis rétabli : il figure de nouveau sur la fiche du praticien.');
  }

  libelleStatut(statut: string): string {
    return libelleStatutAvis(statut);
  }

  /** Applique une decision puis recharge la liste ; 409 / 404 (deja traite, disparu) affichent le motif et rechargent. */
  private traiter(a: AvisAdmin, appel: ReturnType<AvisService['masquer']>, message: string) {
    this.enCours.set(a.id);
    this.succes.set('');
    this.erreur.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set(message);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409 || e.status === 404) {
          this.charger(e.error?.erreur ?? 'Cet avis a déjà été traité.');
        } else {
          this.erreur.set(e.error?.erreur ?? "Le traitement de l'avis a échoué, veuillez réessayer.");
        }
      },
    });
  }
}
