import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminService, DemandePraticien } from './admin.service';

const STATUTS_FILTRE = [
  { valeur: 'NOUVELLE', libelle: 'Nouvelles' },
  { valeur: 'TRAITEE', libelle: 'Traitées' },
  { valeur: 'REFUSEE', libelle: 'Refusées' },
  { valeur: '', libelle: 'Toutes' },
];

const LIBELLES: Record<string, string> = { NOUVELLE: 'Nouvelle', TRAITEE: 'Traitée', REFUSEE: 'Refusée' };

type Action = 'traiter' | 'refuser' | 'creer-compte';

/**
 * Suivi des demandes praticien deposees sur /praticien (GET /api/admin/demandes-praticien) : Traitee, Refusee,
 * ou creation du compte medecin (avec confirmation).
 */
@Component({
    selector: 'app-demandes-admin',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main style="max-width:860px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">Demandes praticien</h1>
        <label style="display:flex;align-items:center;gap:8px;color:var(--text3);font-size:.9rem">
          Statut
          <select class="champ" [ngModel]="statut()" (ngModelChange)="filtrer($event)" name="statut" style="color:var(--tbi-ink);font-size:1rem">
            <option *ngFor="let s of statuts" [value]="s.valeur">{{ s.libelle }}</option>
          </select>
        </label>
      </div>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e" role="alert">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let d of demandes()" class="demande" style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:16px 18px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ d.nom }}</strong>
              <span style="color:var(--text3)"> · {{ libelleStatut(d.statut) }}</span><br>
              <span style="color:var(--text3)">
                {{ d.specialite }} · {{ d.ville ? d.ville + ' · ' : '' }}{{ d.wilaya }}
                · N° d'ordre {{ d.numeroOrdre }} · {{ d.telephone }}<ng-container *ngIf="d.email"> · {{ d.email }}</ng-container>
              </span><br>
              <span style="color:var(--text3);font-size:.9rem">
                Reçue le {{ d.creeeLe | date:'d MMMM yyyy à HH:mm' }}
                <ng-container *ngIf="d.ficheId"> · <a [routerLink]="['/medecins', d.ficheId]" style="color:var(--vert)">Voir la fiche</a></ng-container>
              </span>
              <p *ngIf="d.message" style="margin:6px 0 0;color:var(--text2);white-space:pre-line">{{ d.message }}</p>
            </div>
            <div *ngIf="d.statut === 'NOUVELLE'" style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="bouton" (click)="demander(d, 'creer-compte')" [disabled]="enCours() !== null">Créer le compte</button>
              <button type="button" class="bouton-secondaire" (click)="demander(d, 'traiter')" [disabled]="enCours() !== null">Traitée</button>
              <button type="button" class="bouton-secondaire" (click)="demander(d, 'refuser')" [disabled]="enCours() !== null">Refusée</button>
            </div>
          </div>

          <div *ngIf="aConfirmer() as conf">
            <div *ngIf="conf.id === d.id" class="confirmation-demande" style="margin:12px 0 0;border-radius:var(--r12);padding:12px 14px;display:grid;gap:8px;background:var(--green-l)">
              <strong>{{ question(conf.action, d) }}</strong>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="bouton" (click)="confirmer(d)" [disabled]="enCours() !== null">
                  {{ enCours() === d.id ? 'Enregistrement…' : 'Oui' }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">Non</button>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && demandes().length === 0">Aucune demande pour ce filtre.</p>

      <p style="margin:24px 0 0"><a routerLink="/admin" style="color:var(--vert)">Retour au tableau de bord</a></p>
    </main>
  `
})
export class DemandesAdminComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(AdminService);

  statuts = STATUTS_FILTRE;
  statut = signal('NOUVELLE');
  demandes = signal<DemandePraticien[]>([]);
  charge = signal(false);
  aConfirmer = signal<{ id: string; action: Action } | null>(null);
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

  libelleStatut(statut: string): string {
    return LIBELLES[statut] ?? statut;
  }

  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.demandesPraticien(this.statut() || undefined).subscribe({
      next: (liste) => { this.demandes.set(liste); this.charge.set(false); },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 403) this.erreur.set("Cette page est réservée à l'administrateur.");
        else this.erreur.set(e.error?.erreur ?? 'Impossible de charger les demandes.');
      },
    });
  }

  demander(d: DemandePraticien, action: Action) {
    this.succes.set('');
    this.erreur.set('');
    this.aConfirmer.set({ id: d.id, action });
  }

  question(action: Action, d: DemandePraticien): string {
    if (action === 'creer-compte') {
      return `Créer le compte de ${d.nom} ? Un e-mail « définir votre mot de passe » sera envoyé à ${d.email || "l'adresse de la demande"}.`;
    }
    return action === 'traiter' ? `Marquer la demande de ${d.nom} comme traitée ?` : `Refuser la demande de ${d.nom} ?`;
  }

  confirmer(d: DemandePraticien) {
    const conf = this.aConfirmer();
    if (!conf || conf.id !== d.id || this.enCours() !== null) return;
    const appel = conf.action === 'creer-compte' ? this.service.creerCompteDemande(d.id)
      : conf.action === 'traiter' ? this.service.traiterDemande(d.id) : this.service.refuserDemande(d.id);
    const message = conf.action === 'creer-compte' ? `Compte de ${d.nom} créé : un e-mail pour définir son mot de passe lui a été envoyé.`
      : conf.action === 'traiter' ? `Demande de ${d.nom} marquée comme traitée.` : `Demande de ${d.nom} refusée.`;
    this.enCours.set(d.id);
    this.succes.set('');
    this.erreur.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        this.succes.set(message);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 404 || e.status === 409 || e.status === 400) {
          this.erreur.set(e.error?.erreur ?? (conf.action === 'creer-compte'
            ? "Impossible de créer le compte : l'e-mail est absent ou existe déjà."
            : 'Cette demande a déjà été traitée.'));
          if (e.status !== 400) this.charger(this.erreur());
        } else {
          this.erreur.set(e.error?.erreur ?? "L'opération a échoué, veuillez réessayer.");
        }
      },
    });
  }
}
