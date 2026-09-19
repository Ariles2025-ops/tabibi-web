import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { AvisService } from '../avis/avis.service';
import { RendezVous, RendezVousService } from './rendezvous.service';
import { libelleStatutRendezVous } from './statut-rendez-vous';

@Component({
  selector: 'app-mes-rendez-vous',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">Mes rendez-vous</h1>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let r of rendezVous()"
              style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ r.debut | date:'EEEE d MMMM à HH:mm' }}</strong><br>
              <a [routerLink]="['/medecins', r.medecinId]" style="color:var(--vert)">{{ noms()[r.medecinId] ?? 'Voir le praticien' }}</a>
              <span style="color:#566b64"> · {{ libelleStatut(r.statut) }}</span>
            </div>
            <button *ngIf="peutAnnuler(r)" (click)="annuler(r)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px">
              {{ enCours() === r.id ? 'Annulation…' : 'Annuler' }}
            </button>
            <a *ngIf="r.statut === 'HONORE' && !avisDonne(r)" class="bouton-secondaire" [routerLink]="['/avis/nouveau', r.id]">Donner mon avis</a>
            <span *ngIf="r.statut === 'HONORE' && avisDonne(r)" style="color:#566b64">Avis donné</span>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && rendezVous().length === 0">
          Aucun rendez-vous pour le moment. <a routerLink="/" style="color:var(--vert)">Trouver un praticien</a>
        </p>
      </ng-container>
    </main>
  `,
})
export class MesRendezVousComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(RendezVousService);
  private annuaire = inject(AnnuaireService);
  private avis = inject(AvisService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  rendezVous = signal<RendezVous[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  /** Identifiants des rendez-vous pour lesquels j'ai deja donne un avis (GET /api/avis/mes). */
  rendezVousNotes = signal<Set<string>>(new Set());
  charge = signal(false);
  /** Identifiant du rendez-vous dont l'annulation est en cours. */
  enCours = signal<string | null>(null);
  erreur = signal('');

  async ngOnInit() {
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mes().subscribe({
      next: (liste) => {
        this.rendezVous.set([...liste].sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)));
        this.chargerNoms(liste);
        this.chargerAvis(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux patients.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos rendez-vous.');
        }
      },
    });
  }

  annuler(rdv: RendezVous) {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    this.enCours.set(rdv.id);
    this.erreur.set('');
    this.service.annuler(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? "L'annulation a échoué, veuillez réessayer.");
      },
    });
  }

  /** Un rendez-vous deja annule ou deja honore (consultation passee) ne s'annule plus. */
  peutAnnuler(rdv: RendezVous): boolean {
    return rdv.statut !== 'ANNULE' && rdv.statut !== 'HONORE';
  }

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut);
  }

  /** Vrai si un avis a deja ete depose sur ce rendez-vous (« Avis donné » a la place du bouton). */
  avisDonne(rdv: RendezVous): boolean {
    return this.rendezVousNotes().has(rdv.id);
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des rendez-vous. */
  private chargerNoms(liste: RendezVous[]) {
    const ids = new Set(liste.map((r) => r.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe((m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })));
    }
  }

  /** Lit mes avis (s'il y a au moins un rendez-vous honore) pour ne proposer « Donner mon avis » qu'une fois. */
  private chargerAvis(liste: RendezVous[]) {
    if (!liste.some((r) => r.statut === 'HONORE')) return;
    this.avis.mes().subscribe({
      next: (avis) => this.rendezVousNotes.set(new Set(avis.map((a) => a.rendezVousId))),
      error: () => undefined,
    });
  }
}
