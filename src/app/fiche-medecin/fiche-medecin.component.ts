import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnnuaireService, Creneau, Medecin } from '../annuaire/annuaire.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { AuthService } from '../auth/auth.service';
import { SyntheseAvisComponent } from '../avis/synthese-avis.component';
import { ListeAttenteService } from '../liste-attente/liste-attente.service';
import { MessagerieService } from '../messagerie/messagerie.service';

@Component({
  selector: 'app-fiche-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink, SyntheseAvisComponent],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/" style="color:var(--vert)">Retour à l'annuaire</a></p>

      <ng-container *ngIf="medecin() as m">
        <h1 style="color:var(--vert);margin:0 0 4px">{{ m.nomComplet }}</h1>
        <p style="color:#566b64;margin:0 0 16px">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</p>
        <p style="margin:0 0 24px">
          <button type="button" class="bouton-secondaire" (click)="ecrire()" [disabled]="ouvertureMessagerie()">
            {{ ouvertureMessagerie() ? 'Ouverture…' : 'Écrire au médecin' }}
          </button>
        </p>
        <p *ngIf="erreurMessagerie()" style="color:#b3261e;margin:-12px 0 24px">{{ erreurMessagerie() }}</p>
      </ng-container>

      <h2 style="font-size:1.1rem;margin:0 0 12px">Créneaux disponibles</h2>

      <p *ngIf="reservation() as r" style="color:var(--vert)">
        Rendez-vous réservé le {{ r.debut | date:'EEEE d MMMM à HH:mm' }}.
        <a routerLink="/mes-rendez-vous" style="color:var(--vert)">Voir mes rendez-vous</a>
      </p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
      <p *ngIf="charge()">Chargement…</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let c of creneaux()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span>
            <strong>{{ c.debut | date:'EEEE d MMMM à HH:mm' }}</strong>
            <span style="color:#566b64">({{ c.dureeMinutes }} min)</span>
          </span>
          <button (click)="reserver(c)" [disabled]="enCours() !== null"
                  style="padding:10px 16px;background:var(--vert);color:#fff;border:0;border-radius:8px">
            {{ enCours() === c.id ? 'Réservation…' : 'Réserver' }}
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && creneaux().length === 0">Aucun créneau disponible pour le moment.</p>

      <section *ngIf="!charge()" [style.margin]="creneaux().length === 0 ? '8px 0 0' : '24px 0 0'"
               style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;background:#f8faf9">
        <h2 style="font-size:1.05rem;margin:0 0 6px">Liste d'attente</h2>
        <p style="color:#566b64;margin:0 0 12px">
          {{ creneaux().length === 0 ? 'Aucun créneau ne vous est proposé ?' : 'Aucun créneau ne vous convient ?' }}
          Inscrivez-vous sur la liste d'attente de ce praticien. Vous serez notifié dès qu'un créneau se libère.
        </p>
        <p *ngIf="inscription()" style="color:var(--vert);margin:0">
          {{ inscription() }}
          <a routerLink="/liste-attente" style="color:var(--vert)">Voir mes listes d'attente</a>
        </p>
        <button *ngIf="!inscription()" type="button" class="bouton-secondaire" (click)="inscrire()" [disabled]="inscriptionEnCours()">
          {{ inscriptionEnCours() ? 'Inscription…' : "M'inscrire sur la liste d'attente" }}
        </button>
        <p *ngIf="erreurInscription()" style="color:#b3261e;margin:12px 0 0">{{ erreurInscription() }}</p>
      </section>

      <div *ngIf="medecin() as m" style="margin:32px 0 0">
        <app-synthese-avis [medecinId]="m.id" />
      </div>
    </main>
  `,
})
export class FicheMedecinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private rendezVous = inject(RendezVousService);
  private auth = inject(AuthService);
  private messagerie = inject(MessagerieService);
  private listeAttente = inject(ListeAttenteService);
  private router = inject(Router);

  private medecinId = '';
  medecin = signal<Medecin | null>(null);
  creneaux = signal<Creneau[]>([]);
  charge = signal(false);
  /** Identifiant du creneau dont la reservation est en cours. */
  enCours = signal<string | null>(null);
  /** Dernier creneau reserve avec succes (message de confirmation). */
  reservation = signal<Creneau | null>(null);
  erreur = signal('');
  /** Vrai pendant l'ouverture de la conversation avec le medecin. */
  ouvertureMessagerie = signal(false);
  erreurMessagerie = signal('');
  /** Message une fois inscrit sur la liste d'attente du praticien (ou deja inscrit, 409) ; vide sinon. */
  inscription = signal('');
  inscriptionEnCours = signal(false);
  erreurInscription = signal('');

  ngOnInit() {
    this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? ''));
  }

  private charger(id: string) {
    this.medecinId = id;
    this.medecin.set(null);
    this.creneaux.set([]);
    this.reservation.set(null);
    this.erreur.set('');
    this.erreurMessagerie.set('');
    this.inscription.set('');
    this.erreurInscription.set('');
    this.annuaire.medecin(id).subscribe({
      next: (m) => this.medecin.set(m),
      error: (e: HttpErrorResponse) =>
        this.erreur.set(e.status === 404 ? 'Praticien introuvable.' : (e.error?.erreur ?? 'Impossible de charger la fiche du praticien.')),
    });
    this.chargerCreneaux();
  }

  private chargerCreneaux() {
    this.charge.set(true);
    this.annuaire.creneaux(this.medecinId).subscribe({
      next: (liste) => {
        this.creneaux.set(
          liste.filter((c) => c.disponible).sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
        );
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.creneaux.set([]);
        this.erreur.set(e.error?.erreur ?? 'Impossible de charger les créneaux.');
        this.charge.set(false);
      },
    });
  }

  async reserver(creneau: Creneau) {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    this.enCours.set(creneau.id);
    this.reservation.set(null);
    this.erreur.set('');
    this.rendezVous.reserver(creneau.id).subscribe({
      next: () => {
        this.creneaux.update((liste) => liste.filter((c) => c.id !== creneau.id));
        this.reservation.set(creneau);
        this.enCours.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.erreur.set("Ce créneau vient d'être pris.");
          this.chargerCreneaux();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Seul un compte patient peut réserver un créneau.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'La réservation a échoué, veuillez réessayer.');
        }
      },
    });
  }

  /**
   * Ouvre (ou retrouve) la conversation avec le medecin puis mene au fil ; reserve aux patients ayant deja un
   * rendez-vous avec lui (403 sinon). Non connecte → page de connexion puis retour sur la fiche.
   */
  async ecrire() {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    this.ouvertureMessagerie.set(true);
    this.erreurMessagerie.set('');
    this.messagerie.ouvrir(this.medecinId).subscribe({
      next: (c) => {
        this.ouvertureMessagerie.set(false);
        this.router.navigate(['/messagerie', c.id]);
      },
      error: (e: HttpErrorResponse) => {
        this.ouvertureMessagerie.set(false);
        if (e.status === 403) {
          this.erreurMessagerie.set('Vous devez avoir un rendez-vous avec ce médecin pour lui écrire.');
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurMessagerie.set(e.error?.erreur ?? "L'ouverture de la conversation a échoué, veuillez réessayer.");
        }
      },
    });
  }

  /**
   * Inscrit le patient sur la liste d'attente du praticien : il sera prevenu des qu'un creneau se libere.
   * 409 (deja inscrit) → message et etat « inscrit ». Non connecte → page de connexion puis retour sur la fiche.
   */
  async inscrire() {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    this.inscriptionEnCours.set(true);
    this.erreurInscription.set('');
    this.listeAttente.inscrire(this.medecinId).subscribe({
      next: () => {
        this.inscriptionEnCours.set(false);
        this.inscription.set("Vous êtes inscrit sur la liste d'attente de ce praticien.");
      },
      error: (e: HttpErrorResponse) => {
        this.inscriptionEnCours.set(false);
        if (e.status === 409) {
          this.inscription.set('Vous êtes déjà inscrit sur cette liste.');
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurInscription.set("Seul un compte patient peut s'inscrire sur une liste d'attente.");
        } else if (e.status === 404) {
          this.erreurInscription.set('Praticien introuvable.');
        } else {
          this.erreurInscription.set(e.error?.erreur ?? "L'inscription a échoué, veuillez réessayer.");
        }
      },
    });
  }
}
