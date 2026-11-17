import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { Rattachement } from '../secretaire/secretaire.service';

/** Forme minimale d'une adresse e-mail (le serveur verifie qu'un compte l'utilise). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import { MedecinService } from './medecin.service';

/**
 * Secretaires du cabinet (role MEDECIN) : rattachements en cours (GET /api/medecin/secretaires), ajout par
 * l'adresse e-mail du compte Ndawik de la secretaire (POST /api/medecin/secretaires { email }) et retrait
 * confirme dans la page (POST /api/medecin/secretaires/{id}/retirer). Une secretaire rattachee agit sur l'agenda depuis l'espace secretaire.
 */
@Component({
    selector: 'app-secretaires',
    imports: [CommonModule, FormsModule],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--blue);margin:0 0 8px">Mes secrétaires</h1>
      <p style="color:var(--text3);margin:0 0 20px">
        Une secrétaire rattachée à votre cabinet consulte votre agenda, ouvre des créneaux et marque vos rendez-vous
        honorés ou annulés depuis son espace. Vous l'invitez ; elle n'a accès à rien tant qu'elle n'a pas accepté.
      </p>

      <form (ngSubmit)="rattacher()" style="display:grid;gap:12px;margin:0 0 28px;background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:20px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          Adresse e-mail du compte Ndawik de votre secrétaire
          <input class="champ" type="email" [(ngModel)]="email" name="email" required autocomplete="off"
                 placeholder="Ex. secretaire@exemple.dz" style="color:var(--ink);font-size:1rem">
        </label>
        <p style="margin:0;color:var(--text3);font-size:.9rem">
          La secrétaire doit avoir créé son compte Ndawik. Elle reçoit une invitation à accepter depuis ses notifications.
        </p>
        <p *ngIf="succes()" style="color:var(--blue);margin:0">{{ succes() }}</p>
        <p *ngIf="erreurFormulaire()" role="alert" style="color:var(--red);margin:0">{{ erreurFormulaire() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? 'Envoi…' : 'Inviter cette secrétaire' }}</button>
        </div>
      </form>

      <h2 style="font-size:1.1rem;margin:0 0 12px;color:var(--ink)">Secrétaires rattachées</h2>
      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let r of rattachements()"
            style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong style="color:var(--ink)">{{ nom(r) }}</strong>
            <span *ngIf="r.secretaireNom && r.secretaireEmail" style="color:var(--text3)"> · {{ r.secretaireEmail }}</span><br>
            <span *ngIf="r.accepte !== false" style="color:var(--text3);font-size:.9rem">Rattachée le {{ r.creeLe | date:'d MMMM yyyy à HH:mm' }}</span>
            <span *ngIf="r.accepte === false" style="color:#8a5a00;font-size:.9rem">
              <strong style="background:#fff5d6;border-radius:999px;padding:2px 8px">En attente</strong>
              Invitée le {{ r.creeLe | date:'d MMMM yyyy à HH:mm' }}, pas encore acceptée
            </span>
          </div>
          <div *ngIf="aConfirmer() === r.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:var(--text2);font-size:.9rem">Retirer cette secrétaire ?</span>
            <button type="button" class="bouton" (click)="retirer(r)" [disabled]="retraitEnCours() !== null">
              {{ retraitEnCours() === r.id ? 'Retrait…' : 'Oui' }}
            </button>
            <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="retraitEnCours() !== null">Non</button>
          </div>
          <button *ngIf="aConfirmer() !== r.id" type="button" (click)="aConfirmer.set(r.id)" [disabled]="retraitEnCours() !== null"
                  style="padding:11px 18px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
            Retirer
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">Aucune secrétaire rattachée pour le moment.</p>
    </main>
  `
})
export class SecretairesComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);

  email = '';
  /** Rattachement dont le retrait attend la confirmation (Oui / Non). */
  aConfirmer = signal<string | null>(null);
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
    const email = this.email.trim().toLowerCase();
    this.succes.set('');
    if (!EMAIL.test(email)) {
      this.erreurFormulaire.set("Indiquez l'adresse e-mail du compte Ndawik de votre secrétaire.");
      return;
    }
    this.erreurFormulaire.set('');
    this.enCours.set(true);
    this.service.rattacherSecretaire(email).subscribe({
      next: () => {
        this.enCours.set(false);
        this.email = '';
        this.succes.set("Invitation envoyée : votre secrétaire aura accès à votre agenda dès qu'elle l'aura acceptée.");
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 409) {
          this.erreurFormulaire.set(e.error?.erreur ?? 'Cette secrétaire est déjà rattachée à votre cabinet.');
          this.charger();
        } else if (e.status === 400) {
          this.erreurFormulaire.set(e.error?.erreur ?? "Aucun compte Ndawik n'utilise cette adresse e-mail.");
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurFormulaire.set('Seul un compte médecin peut inviter une secrétaire.');
        } else {
          this.erreurFormulaire.set(e.error?.erreur ?? 'Le rattachement a échoué, veuillez réessayer.');
        }
      },
    });
  }

  retirer(rattachement: Rattachement) {
    this.retraitEnCours.set(rattachement.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.retirerSecretaire(rattachement.id).subscribe({
      next: () => {
        this.retraitEnCours.set(null);
        this.aConfirmer.set(null);
        this.succes.set(rattachement.accepte === false ? 'Invitation annulée.' : 'Secrétaire retirée : elle est prévenue.');
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.retraitEnCours.set(null);
        this.aConfirmer.set(null);
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

  /** Nom de la secretaire, a defaut son e-mail, a defaut un identifiant abrege. */
  nom(r: Rattachement): string {
    return r.secretaireNom?.trim() || r.secretaireEmail?.trim() || `Secrétaire ${abregerIdentifiant(r.secretaireId)}`;
  }
}
