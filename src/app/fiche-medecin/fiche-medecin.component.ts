import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnnuaireService, Creneau, Medecin } from '../annuaire/annuaire.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { AuthService } from '../auth/auth.service';
import { SyntheseAvisComponent } from '../avis/synthese-avis.component';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';
import { ListeAttenteService } from '../liste-attente/liste-attente.service';
import { MessagerieService } from '../messagerie/messagerie.service';
import { SeoService } from '../seo/seo.service';

@Component({
  selector: 'app-fiche-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink, SyntheseAvisComponent, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/" style="color:var(--vert)">{{ 'fiche.retourAnnuaire' | t }}</a></p>

      <ng-container *ngIf="medecin() as m">
        <h1 style="color:var(--vert);margin:0 0 4px">{{ m.nomComplet }}</h1>
        <p style="color:#566b64;margin:0 0 16px">{{ m.specialiteFr }} · {{ m.ville }} ({{ m.wilayaFr }})</p>
        <p style="margin:0 0 24px">
          <button type="button" class="bouton-secondaire" (click)="ecrire()" [disabled]="ouvertureMessagerie()">
            {{ (ouvertureMessagerie() ? 'fiche.ouverture' : 'fiche.ecrire') | t }}
          </button>
        </p>
        <p *ngIf="erreurMessagerie()" style="color:#b3261e;margin:-12px 0 24px">{{ erreurMessagerie() }}</p>
      </ng-container>

      <h2 style="font-size:1.1rem;margin:0 0 12px">{{ 'fiche.creneaux' | t }}</h2>

      <p *ngIf="reservation() as r" style="color:var(--vert)">
        {{ 'fiche.reserve' | t:{ date: (r.debut | dateLocale:'jourHeure') } }}
        <a routerLink="/mes-rendez-vous" style="color:var(--vert)">{{ 'fiche.voirMesRendezVous' | t }}</a>
      </p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let c of creneaux()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span>
            <strong>{{ c.debut | dateLocale:'jourHeure' }}</strong>
            <span style="color:#566b64">({{ 'commun.minutes' | t:{ n: c.dureeMinutes } }})</span>
          </span>
          <button (click)="reserver(c)" [disabled]="enCours() !== null"
                  style="padding:10px 16px;background:var(--vert);color:#fff;border:0;border-radius:8px">
            {{ (enCours() === c.id ? 'fiche.reservation' : 'fiche.reserver') | t }}
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && creneaux().length === 0">{{ 'fiche.aucunCreneau' | t }}</p>

      <section *ngIf="!charge()" [style.margin]="creneaux().length === 0 ? '8px 0 0' : '24px 0 0'"
               style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;background:#f8faf9">
        <h2 style="font-size:1.05rem;margin:0 0 6px">{{ 'fiche.listeAttente' | t }}</h2>
        <p style="color:#566b64;margin:0 0 12px">
          {{ (creneaux().length === 0 ? 'fiche.aucunPropose' : 'fiche.aucunConvient') | t }}
          {{ 'fiche.inscrivezVous' | t }}
        </p>
        <p *ngIf="inscription()" style="color:var(--vert);margin:0">
          {{ inscription() }}
          <a routerLink="/liste-attente" style="color:var(--vert)">{{ 'fiche.voirMesListes' | t }}</a>
        </p>
        <button *ngIf="!inscription()" type="button" class="bouton-secondaire" (click)="inscrire()" [disabled]="inscriptionEnCours()">
          {{ (inscriptionEnCours() ? 'fiche.inscription' : 'fiche.mInscrire') | t }}
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
  private seo = inject(SeoService);
  private i18n = inject(TraductionService);

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
    this.seo.definir({ titre: 'seo.fiche.attente', canonique: `/medecins/${id}` });
    this.annuaire.medecin(id).subscribe({
      next: (m) => {
        this.medecin.set(m);
        const params = {
          nom: m.nomComplet,
          nomSansDr: m.nomComplet.replace(/^Dr\.?\s+/i, ''),
          specialite: m.specialiteFr,
          specialiteMinuscule: m.specialiteFr.toLowerCase(),
          ville: m.ville,
          wilaya: m.wilayaFr,
        };
        this.seo.definir(() => ({
          titre: this.i18n.t('seo.fiche.titre', params),
          description: this.i18n.t('seo.fiche.description', params),
          canonique: `/medecins/${m.id}`,
        }));
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 404) {
          this.erreur.set(this.i18n.t('fiche.introuvable'));
          this.seo.introuvable('seo.fiche.introuvable');
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('fiche.erreurChargement'));
        }
      },
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
        this.erreur.set(e.error?.erreur ?? this.i18n.t('fiche.erreurCreneaux'));
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
          this.erreur.set(this.i18n.t('fiche.creneauPris'));
          this.chargerCreneaux();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('fiche.reservePatient'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('fiche.reservationEchec'));
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
          this.erreurMessagerie.set(this.i18n.t('fiche.messagerieRendezVous'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurMessagerie.set(e.error?.erreur ?? this.i18n.t('fiche.messagerieEchec'));
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
        this.inscription.set(this.i18n.t('fiche.inscrit'));
      },
      error: (e: HttpErrorResponse) => {
        this.inscriptionEnCours.set(false);
        if (e.status === 409) {
          this.inscription.set(this.i18n.t('fiche.dejaInscrit'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurInscription.set(this.i18n.t('fiche.inscriptionPatient'));
        } else if (e.status === 404) {
          this.erreurInscription.set(this.i18n.t('fiche.introuvable'));
        } else {
          this.erreurInscription.set(e.error?.erreur ?? this.i18n.t('fiche.inscriptionEchec'));
        }
      },
    });
  }
}
