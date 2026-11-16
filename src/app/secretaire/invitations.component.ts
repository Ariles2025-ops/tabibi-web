import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { Invitation, SecretaireService } from './secretaire.service';

interface InvitationAffichee extends Invitation {
  medecinNom: string;
  medecinDetail: string;
}

/**
 * Invitations a gerer l'agenda d'un cabinet (lien des notifications « Invitation à rejoindre un cabinet ») :
 * la personne invitee accepte ou refuse. Rien n'est accessible avant l'acceptation.
 */
@Component({
    selector: 'app-invitations',
    imports: [CommonModule],
    template: `
    <main style="max-width:640px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--blue);margin:0 0 8px">Invitations de cabinet</h1>
      <p style="color:var(--text3);margin:0 0 20px">
        Un médecin vous propose de gérer l'agenda de son cabinet (rendez-vous, créneaux, patients).
        Acceptez seulement si vous travaillez réellement pour lui.
      </p>

      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>
      <p *ngIf="succes()" style="color:var(--blue)">{{ succes() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:12px">
        <li *ngFor="let i of invitations()"
            style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r16);padding:16px 18px;display:grid;gap:12px">
          <div>
            <strong style="color:var(--ink);font-size:1.05rem">{{ i.medecinNom }}</strong>
            <div *ngIf="i.medecinDetail" style="color:var(--text3);font-size:.9rem">{{ i.medecinDetail }}</div>
            <div style="color:var(--text3);font-size:.85rem">Invitation du {{ i.creeLe | date:'d MMMM yyyy à HH:mm' }}</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="bouton" (click)="accepter(i)" [disabled]="enCours() !== null">
              {{ enCours() === i.id ? 'Patientez…' : 'Accepter' }}
            </button>
            <button type="button" class="bouton-secondaire" (click)="refuser(i)" [disabled]="enCours() !== null">Refuser</button>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && invitations().length === 0 && !succes()" style="color:var(--text3)">
        Aucune invitation en attente.
      </p>
    </main>
  `
})
export class InvitationsComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(SecretaireService);
  private annuaire = inject(AnnuaireService);
  private router = inject(Router);

  invitations = signal<InvitationAffichee[]>([]);
  charge = signal(false);
  enCours = signal<string | null>(null);
  erreur = signal('');
  succes = signal('');

  async ngOnInit() {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter('/invitations');
      return;
    }
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.invitations().subscribe({
      next: (liste) => {
        if (liste.length === 0) {
          this.invitations.set([]);
          this.charge.set(false);
          return;
        }
        forkJoin(
          liste.map((i) =>
            this.annuaire.medecin(i.medecinId).pipe(
              map((m) => ({ ...i, medecinNom: m.nomComplet, medecinDetail: [m.specialiteFr, m.ville || m.wilayaFr].filter(Boolean).join(' · ') })),
              catchError(() => of({ ...i, medecinNom: 'Un médecin', medecinDetail: '' })),
            ),
          ),
        ).subscribe((affichees) => {
          this.invitations.set(affichees);
          this.charge.set(false);
        });
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter('/invitations');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos invitations.');
        }
      },
    });
  }

  accepter(i: InvitationAffichee) {
    this.enCours.set(i.id);
    this.erreur.set('');
    this.service.accepterInvitation(i.id).subscribe({
      next: async () => {
        // Le role SECRETAIRE vient d'etre accorde : on relit le jeton pour ouvrir l'espace secretaire tout de suite.
        await this.auth.actualiserRoles();
        this.enCours.set(null);
        this.router.navigateByUrl('/secretaire');
      },
      error: (e: HttpErrorResponse) => this.echec(e),
    });
  }

  refuser(i: InvitationAffichee) {
    this.enCours.set(i.id);
    this.erreur.set('');
    this.service.refuserInvitation(i.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set('Invitation refusée : le médecin est prévenu.');
        this.charger();
      },
      error: (e: HttpErrorResponse) => this.echec(e),
    });
  }

  private echec(e: HttpErrorResponse) {
    this.enCours.set(null);
    if (e.status === 401) {
      this.auth.seConnecter('/invitations');
    } else {
      this.erreur.set(e.error?.erreur ?? "L'opération a échoué, veuillez réessayer.");
      this.charger();
    }
  }
}
