import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Rattachement, estUuid } from '../secretaire/secretaire.service';
import { MedecinService } from './medecin.service';

/**
 * Secretaires du cabinet (role MEDECIN) : rattachements en cours (GET /api/medecin/secretaires), ajout par
 * l'identifiant Keycloak du compte de la secretaire (POST /api/medecin/secretaires { secretaireId }) et retrait
 * (POST /api/medecin/secretaires/{id}/retirer). Une secretaire rattachee agit sur l'agenda depuis l'espace secretaire.
 */
@Component({
  selector: 'app-secretaires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Mes secrétaires</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Une secrétaire rattachée à votre cabinet consulte votre agenda, ouvre des créneaux et marque vos rendez-vous
        honorés ou annulés depuis son espace. Elle est prévenue de son rattachement et de son retrait.
      </p>

      <form (ngSubmit)="rattacher()" style="display:grid;gap:12px;margin:0 0 28px">
        <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
          Identifiant du compte de votre secrétaire (visible dans Mon compte)
          <input class="champ" [(ngModel)]="secretaireId" name="secretaireId" required
                 placeholder="Ex. 55555555-5555-5555-5555-555555555555" style="color:#10241F;font-size:1rem;font-family:monospace">
        </label>
        <p *ngIf="succes()" style="color:var(--vert);margin:0">{{ succes() }}</p>
        <p *ngIf="erreurFormulaire()" style="color:#b3261e;margin:0">{{ erreurFormulaire() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? 'Rattachement…' : 'Rattacher cette secrétaire' }}</button>
        </div>
      </form>

      <h2 style="font-size:1.1rem;margin:0 0 12px">Secrétaires rattachées</h2>
      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let r of rattachements()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <code style="font-size:.95rem">{{ r.secretaireId }}</code><br>
            <span style="color:#566b64">Rattachée le {{ r.creeLe | date:'d MMMM yyyy à HH:mm' }}</span>
          </div>
          <button type="button" (click)="retirer(r)" [disabled]="retraitEnCours() !== null"
                  style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
            {{ retraitEnCours() === r.id ? 'Retrait…' : 'Retirer' }}
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">Aucune secrétaire rattachée pour le moment.</p>
    </main>
  `,
})
export class SecretairesComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);

  secretaireId = '';
  rattachements = signal<Rattachement[]>([]);
  charge = signal(false);
  enCours = signal(false);
  /** Identifiant du rattachement dont le retrait est en cours. */
  retraitEnCours = signal<string | null>(null);
  succes = signal('');
  /** Erreur du formulaire de rattachement (distincte de celle de la liste). */
  erreurFormulaire = signal('');
  erreur = signal('');

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.secretaires().subscribe({
      next: (liste) => {
        this.rattachements.set([...liste].sort((a, b) => Date.parse(a.creeLe) - Date.parse(b.creeLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux médecins.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos secrétaires.');
        }
      },
    });
  }

  rattacher() {
    const secretaireId = this.secretaireId.trim().toLowerCase();
    this.succes.set('');
    if (!estUuid(secretaireId)) {
      this.erreurFormulaire.set("Indiquez l'identifiant du compte de votre secrétaire (36 caractères, visible dans Mon compte).");
      return;
    }
    this.erreurFormulaire.set('');
    this.enCours.set(true);
    this.service.rattacherSecretaire(secretaireId).subscribe({
      next: () => {
        this.enCours.set(false);
        this.secretaireId = '';
        this.succes.set('Secrétaire rattachée : elle est prévenue et accède à votre agenda.');
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 409) {
          this.erreurFormulaire.set(e.error?.erreur ?? 'Cette secrétaire est déjà rattachée à votre cabinet.');
          this.charger();
        } else if (e.status === 400) {
          this.erreurFormulaire.set(e.error?.erreur ?? "L'identifiant est invalide.");
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurFormulaire.set('Seul un compte médecin peut rattacher une secrétaire.');
        } else {
          this.erreurFormulaire.set(e.error?.erreur ?? 'Le rattachement a échoué, veuillez réessayer.');
        }
      },
    });
  }

  retirer(rattachement: Rattachement) {
    if (!confirm('Retirer cette secrétaire de votre cabinet ?')) return;
    this.retraitEnCours.set(rattachement.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.retirerSecretaire(rattachement.id).subscribe({
      next: () => {
        this.retraitEnCours.set(null);
        this.succes.set('Secrétaire retirée : elle est prévenue.');
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.retraitEnCours.set(null);
        if (e.status === 404) {
          // Deja retiree : la liste est rechargee.
          this.charger();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? 'Le retrait a échoué, veuillez réessayer.');
        }
      },
    });
  }
}
