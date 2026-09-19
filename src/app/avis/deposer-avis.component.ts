import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RendezVous, RendezVousService } from '../rendezvous/rendezvous.service';
import { AvisService, LONGUEUR_MAX_COMMENTAIRE, NOTE_MAX, NOTE_MIN } from './avis.service';

/** Notes proposees, de 1 a 5. */
const NOTES = Array.from({ length: NOTE_MAX - NOTE_MIN + 1 }, (_, i) => NOTE_MIN + i);

/**
 * Depot d'un avis par le patient sur un rendez-vous honore (POST /api/avis) : note de 1 a 5 par cinq boutons
 * radio stylises, commentaire facultatif (500 caracteres au plus). Le rendez-vous et le praticien sont rappeles
 * s'ils sont retrouves dans mes rendez-vous. 409 : avis deja donne (ou rendez-vous non honore).
 */
@Component({
  selector: 'app-deposer-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/mes-rendez-vous" style="color:var(--vert)">Retour à mes rendez-vous</a></p>
      <h1 style="color:var(--vert);margin:0 0 8px">Donner mon avis</h1>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="rendezVous() as r" style="color:#566b64;margin:0 0 20px">
          Rendez-vous du {{ r.debut | date:'EEEE d MMMM à HH:mm' }}<ng-container *ngIf="nomMedecin()"> avec {{ nomMedecin() }}</ng-container>.
          Votre avis est publié sans votre nom.
        </p>

        <p *ngIf="succes()" style="color:var(--vert)">
          {{ succes() }} <a routerLink="/mes-avis" style="color:var(--vert)">Voir mes avis</a>
        </p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <form *ngIf="!succes()" (ngSubmit)="deposer()" style="display:grid;gap:16px">
          <fieldset style="border:0;padding:0;margin:0">
            <legend style="color:#566b64;font-size:.9rem;margin:0 0 6px">Note *</legend>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <label *ngFor="let n of notes" class="note" [class.note-choisie]="note === n" [attr.aria-label]="'Note ' + n + ' sur 5'">
                <input type="radio" name="note" [value]="n" [(ngModel)]="note">{{ n }}
              </label>
              <span style="color:#566b64;font-size:.9rem;margin-left:4px">{{ note !== null ? note + ' / 5' : 'Choisissez une note de 1 à 5' }}</span>
            </div>
          </fieldset>

          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Commentaire (facultatif)
            <textarea class="champ" [(ngModel)]="commentaire" name="commentaire" rows="4" style="color:#10241F;font-size:1rem;resize:vertical"></textarea>
            <span [style.color]="commentaireTropLong() ? '#b3261e' : '#566b64'">{{ commentaire.length }} / {{ maxCommentaire }}</span>
          </label>

          <div>
            <button type="submit" class="bouton" [disabled]="enCours() || commentaireTropLong()">
              {{ enCours() ? 'Envoi…' : 'Envoyer mon avis' }}
            </button>
          </div>
        </form>
      </ng-container>
    </main>
  `,
})
export class DeposerAvisComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(AvisService);
  private rendezVousService = inject(RendezVousService);
  private annuaire = inject(AnnuaireService);

  private rendezVousId = '';
  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Le rendez-vous note, s'il est retrouve dans mes rendez-vous (rappel de la date et du praticien). */
  rendezVous = signal<RendezVous | null>(null);
  nomMedecin = signal<string | null>(null);
  notes = NOTES;
  /** Note choisie ; null tant qu'aucun bouton n'est coche. */
  note: number | null = null;
  commentaire = '';
  maxCommentaire = LONGUEUR_MAX_COMMENTAIRE;
  enCours = signal(false);
  succes = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.rendezVousId = this.route.snapshot.paramMap.get('rendezVousId') ?? '';
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.chargerRendezVous();
  }

  deposer() {
    this.succes.set('');
    if (this.note === null) {
      this.erreur.set('Choisissez une note de 1 à 5.');
      return;
    }
    if (this.commentaireTropLong()) {
      this.erreur.set(`Le commentaire ne peut pas dépasser ${LONGUEUR_MAX_COMMENTAIRE} caractères.`);
      return;
    }
    const commentaire = this.commentaire.trim();
    this.erreur.set('');
    this.enCours.set(true);
    this.service.deposer(this.rendezVousId, this.note, commentaire || null).subscribe({
      next: () => {
        this.enCours.set(false);
        this.succes.set('Merci, votre avis a été enregistré.');
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.erreur.set('Vous avez déjà donné votre avis pour ce rendez-vous.');
        } else if (e.status === 403) {
          this.erreur.set(e.error?.erreur ?? 'Seul le patient du rendez-vous peut donner son avis.');
        } else if (e.status === 404) {
          this.erreur.set('Rendez-vous introuvable.');
        } else {
          this.erreur.set(e.error?.erreur ?? "L'envoi de l'avis a échoué, veuillez réessayer.");
        }
      },
    });
  }

  commentaireTropLong(): boolean {
    return this.commentaire.length > LONGUEUR_MAX_COMMENTAIRE;
  }

  /** Rappel du rendez-vous (date, praticien) ; a defaut, le formulaire reste utilisable. */
  private chargerRendezVous() {
    this.rendezVousService.mes().subscribe({
      next: (liste) => {
        const r = liste.find((x) => x.id === this.rendezVousId) ?? null;
        this.rendezVous.set(r);
        if (!r) return;
        this.annuaire.medecin(r.medecinId).subscribe({
          next: (m) => this.nomMedecin.set(m.nomComplet),
          error: () => undefined,
        });
      },
      error: () => undefined,
    });
  }
}
