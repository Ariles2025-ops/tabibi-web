import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
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

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  rendezVous = signal<RendezVous[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
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

  /** Recupere (une seule fois par praticien) le nom des medecins des rendez-vous. */
  private chargerNoms(liste: RendezVous[]) {
    const ids = new Set(liste.map((r) => r.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe((m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })));
    }
  }
}
