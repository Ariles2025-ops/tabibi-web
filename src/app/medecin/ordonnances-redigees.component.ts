import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { libelleStatutOrdonnance } from '../ordonnances/statut-ordonnance';
import { BadgeStatutOrdonnanceComponent } from '../ordonnances/badge-statut-ordonnance.component';
import { MedecinService } from './medecin.service';
import { PatientsService, RepertoirePatients, nomPatient } from './patients.service';

/** Ordonnances emises par le medecin connecte (GET /api/medecin/ordonnances), avec le nom du patient. */
@Component({
    selector: 'app-ordonnances-redigees',
    imports: [CommonModule, FormsModule, RouterLink, BadgeStatutOrdonnanceComponent],
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
              <span style="color:var(--text3)">{{ o.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }}</span>
              <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
                <app-badge-statut-ordonnance [statut]="o.statut" />
                <span *ngIf="o.statut === 'ANNULEE' && o.motifAnnulation" style="color:var(--text3);font-size:13px">Motif : {{ o.motifAnnulation }}</span>
                <span *ngIf="o.statut === 'DELIVREE' && o.delivreeLe" style="color:var(--text3);font-size:13px">le {{ o.delivreeLe | date:'d MMMM yyyy' }}</span>
              </span>
            </span>
            <code style="font-size:1rem;letter-spacing:.1em;color:var(--blue-d);background:var(--blue-l);border-radius:999px;padding:4px 12px">{{ o.codeVerification }}</code>
          </a>
          <div *ngIf="o.statut === 'EMISE'" style="padding:0 16px 14px">
            <button *ngIf="aAnnuler() !== o.id" type="button" class="bouton-secondaire" (click)="demanderAnnulation(o)"
                    [disabled]="enCours() !== null" style="color:var(--red)">Annuler</button>
            <div *ngIf="aAnnuler() === o.id" class="confirmation-annulation"
                 style="background:var(--red-l);border-radius:var(--r12);padding:12px;display:grid;gap:8px">
              <strong style="color:var(--red)">Annuler cette ordonnance ? Le patient en sera informé et elle ne pourra plus être délivrée.</strong>
              <label style="display:grid;gap:4px;color:var(--text2);font-size:14px">Motif (facultatif)
                <textarea class="champ" rows="2" [(ngModel)]="motif" name="motif-{{ o.id }}" maxlength="500"></textarea>
              </label>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="bouton" (click)="confirmerAnnulation(o)" [disabled]="enCours() !== null">
                  {{ enCours() === o.id ? 'Annulation…' : 'Oui, annuler' }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="aAnnuler.set(null)" [disabled]="enCours() !== null">Non</button>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && ordonnances().length === 0">Aucune ordonnance rédigée pour le moment.</p>
    </main>
  `
})
export class OrdonnancesRedigeesComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private patients = inject(PatientsService);

  ordonnances = signal<Ordonnance[]>([]);
  repertoire = signal<RepertoirePatients>(new Map());
  charge = signal(false);
  erreur = signal('');
  /** Ordonnance dont l'annulation attend confirmation (Oui / Non), ou null. */
  aAnnuler = signal<string | null>(null);
  /** Ordonnance en cours d'annulation cote serveur, ou null. */
  enCours = signal<string | null>(null);
  motif = '';

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

  demanderAnnulation(o: Ordonnance) {
    this.motif = '';
    this.erreur.set('');
    this.aAnnuler.set(o.id);
  }

  confirmerAnnulation(o: Ordonnance) {
    this.enCours.set(o.id);
    this.erreur.set('');
    this.service.annulerOrdonnance(o.id, this.motif.trim()).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.aAnnuler.set(null);
        this.ordonnances.update((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? "L'annulation de l'ordonnance a échoué, veuillez réessayer.");
      },
    });
  }
}
