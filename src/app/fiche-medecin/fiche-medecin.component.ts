import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
    <main class="section" style="max-width:720px;margin:0 auto">
      <p style="margin:0 0 16px"><a routerLink="/" style="color:var(--blue);text-decoration:none;font-weight:600"><i class="fa fa-arrow-left fa-xs"></i> Retour à l'annuaire</a></p>

      <ng-container *ngIf="medecin() as m">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:20px;margin:0 0 20px">
          <div style="display:flex;gap:16px;align-items:flex-start">
            <div class="doc-ava" style="width:56px;height:56px;font-size:18px;flex:none">{{ initiales(m.nomComplet) }}</div>
            <div style="flex:1;min-width:0">
              <h1 style="font-size:1.4rem;margin:0 0 4px;color:var(--ink)">{{ m.nomComplet }}</h1>
              <div style="color:var(--blue);font-weight:600"><i class="fa fa-stethoscope fa-xs"></i> {{ m.specialiteFr }}</div>
              <div style="color:var(--text3)"><i class="fa fa-location-dot fa-xs"></i> {{ m.ville || m.wilayaFr }} ({{ m.wilayaFr }})</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 0">
            <button type="button" class="btn" style="background:#fff;border:1.5px solid var(--border);color:var(--ink)" (click)="ecrire()" [disabled]="ouvertureMessagerie()">
              <i class="fa fa-comment-dots"></i> {{ ouvertureMessagerie() ? 'Ouverture…' : 'Écrire au médecin' }}
            </button>
          </div>
          <p *ngIf="erreurMessagerie()" style="color:#b3261e;margin:12px 0 0">{{ erreurMessagerie() }}</p>
          <p *ngIf="reclamable()" style="border:1.5px dashed var(--pastille-bd);border-radius:var(--r12);padding:12px 14px;margin:16px 0 0;font-size:13px">
            <i class="fa fa-user-doctor" style="color:var(--blue)"></i> Vous êtes ce praticien ? Réclamez gratuitement cette fiche.
            <a routerLink="/medecin/candidature" [queryParams]="{ fiche: m.id }" style="color:var(--blue);font-weight:700">Réclamer ma fiche</a>
          </p>
        </div>
      </ng-container>

      <h2 class="sec-title" style="font-size:1.1rem;margin:0 0 12px">Créneaux disponibles</h2>

      <p *ngIf="reservation() as r" style="background:var(--blue-l);color:var(--blue-d);border-radius:var(--r12);padding:12px 14px">
        <i class="fa fa-circle-check"></i> Rendez-vous réservé le {{ r.debut | date:'EEEE d MMMM à HH:mm' }}.
        <a routerLink="/mes-rendez-vous" style="color:var(--blue-d);font-weight:700">Voir mes rendez-vous</a>
      </p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>

      <div *ngIf="joursCreneaux().length" class="cal-jours">
        <div class="cal-jour" *ngFor="let j of joursCreneaux()">
          <div class="cal-date">{{ j.date | date:'EEE d MMM' }}</div>
          <div class="cal-horaires">
            <button type="button" class="cal-slot" *ngFor="let c of j.creneaux"
                    (click)="reserver(c)" [disabled]="enCours() !== null"
                    [attr.aria-label]="'Réserver le ' + (c.debut | date:'EEEE d MMMM à HH:mm')" dir="ltr">
              {{ enCours() === c.id ? '…' : (c.debut | date:'HH:mm') }}
            </button>
          </div>
        </div>
      </div>
      <p *ngIf="!charge() && !erreur() && creneaux().length === 0" style="color:var(--text3)">Aucun créneau disponible pour le moment.</p>

      <section *ngIf="!charge()" [style.margin]="creneaux().length === 0 ? '12px 0 0' : '24px 0 0'"
               style="background:var(--blue-l);border:1px solid var(--border);border-radius:var(--r16);padding:18px">
        <h2 style="font-size:1.05rem;margin:0 0 6px;color:var(--ink)">Liste d'attente</h2>
        <p style="color:var(--text2);margin:0 0 12px;font-size:14px">
          {{ creneaux().length === 0 ? 'Aucun créneau ne vous est proposé ?' : 'Aucun créneau ne vous convient ?' }}
          Inscrivez-vous sur la liste d'attente de ce praticien. Vous serez notifié dès qu'un créneau se libère.
        </p>
        <p *ngIf="inscription()" style="color:var(--blue-d);margin:0;font-weight:600">
          {{ inscription() }}
          <a routerLink="/liste-attente" style="color:var(--blue-d)">Voir mes listes d'attente</a>
        </p>
        <button *ngIf="!inscription()" type="button" class="btn" style="background:#fff;border:1.5px solid var(--border);color:var(--ink)" (click)="inscrire()" [disabled]="inscriptionEnCours()">
          <i class="fa fa-bell"></i> {{ inscriptionEnCours() ? 'Inscription…' : "M'inscrire sur la liste d'attente" }}
        </button>
        <p *ngIf="erreurInscription()" style="color:#b3261e;margin:12px 0 0">{{ erreurInscription() }}</p>
      </section>

      <div *ngIf="medecin() as m" style="margin:32px 0 0">
        <app-synthese-avis [medecinId]="m.id" />
      </div>
    </main>
  `,
  styles: [`
    /* Creneaux en grille par jour : chaque jour est une colonne qui defile horizontalement sur mobile. */
    .cal-jours { display:flex; gap:12px; overflow-x:auto; padding-bottom:6px; -webkit-overflow-scrolling:touch; }
    .cal-jour { flex:0 0 auto; width:128px; background:#fff; border:1px solid var(--border); border-radius:var(--r12); box-shadow:var(--s1); padding:12px 10px; }
    .cal-date { font-weight:700; color:var(--ink); text-align:center; text-transform:capitalize; padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid var(--border); }
    .cal-horaires { display:flex; flex-direction:column; gap:8px; }
    .cal-slot { padding:9px 6px; background:#fff; border:1.5px solid var(--vert); border-radius:10px; color:var(--vert); font:inherit; font-weight:700; cursor:pointer; }
    .cal-slot:hover:not(:disabled) { background:var(--vert); color:#fff; }
    .cal-slot:disabled { opacity:.5; cursor:default; }
  `],
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
  /** Vrai si la fiche n'appartient a aucun compte : on propose au praticien de la reclamer. */
  reclamable = signal(false);
  creneaux = signal<Creneau[]>([]);
  /**
   * Creneaux regroupes par jour pour l'affichage en grille (une colonne par date).
   * `creneaux()` est deja trie par date croissante, donc les jours et leurs horaires restent dans l'ordre.
   */
  joursCreneaux = computed<{ date: string; creneaux: Creneau[] }[]>(() => {
    const groupes = new Map<string, { date: string; creneaux: Creneau[] }>();
    for (const c of this.creneaux()) {
      const d = new Date(c.debut);
      const cle = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let groupe = groupes.get(cle);
      if (!groupe) { groupe = { date: c.debut, creneaux: [] }; groupes.set(cle, groupe); }
      groupe.creneaux.push(c);
    }
    return Array.from(groupes.values());
  });
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

  /** Monogramme (1 ou 2 lettres) a partir du nom, pour l'avatar. */
  initiales(nom: string): string {
    const mots = (nom || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    const lettres = mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase());
    return lettres.join('') || '•';
  }

  private charger(id: string) {
    this.medecinId = id;
    this.medecin.set(null);
    this.reclamable.set(false);
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
    this.annuaire.reclamable(id).subscribe({
      next: (r) => this.reclamable.set(r.reclamable),
      error: () => this.reclamable.set(false),
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
