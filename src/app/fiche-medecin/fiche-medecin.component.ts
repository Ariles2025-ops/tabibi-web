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
    <main class="fm">
      <a routerLink="/" class="fm-back"><i class="fa fa-arrow-left fa-xs"></i> Retour à la recherche</a>

      <p *ngIf="erreur() && !medecin()" class="fm-err">{{ erreur() }}</p>

      <ng-container *ngIf="medecin() as m">
        <!-- Identite du praticien -->
        <header class="fm-hero">
          <div class="fm-ava" aria-hidden="true">{{ initiales(m.nomComplet) }}</div>
          <div class="fm-id">
            <h1>{{ m.nomComplet }}</h1>
            <span class="fm-spe"><i class="fa fa-stethoscope fa-xs"></i> {{ m.specialiteFr }}</span>
            <span class="fm-lieu"><i class="fa fa-location-dot fa-xs"></i> {{ m.ville || m.wilayaFr }} ({{ m.wilayaFr }})</span>
            <div class="fm-badges">
              <span class="fm-badge" *ngIf="creneaux().length"><i class="fa fa-calendar-check fa-xs"></i> Rendez-vous en ligne</span>
              <span class="fm-badge fm-badge--neutre"><i class="fa fa-wallet fa-xs"></i> Paiement au cabinet</span>
            </div>
          </div>
          <div class="fm-hero-act">
            <button type="button" class="fm-btn fm-btn--sec" (click)="ecrire()" [disabled]="ouvertureMessagerie()">
              <i class="fa fa-comment-dots"></i> {{ ouvertureMessagerie() ? 'Ouverture…' : 'Écrire au médecin' }}
            </button>
          </div>
          <p *ngIf="erreurMessagerie()" class="fm-err fm-hero-msg">{{ erreurMessagerie() }}</p>
        </header>

        <div class="fm-grid">
          <!-- Prise de rendez-vous (colonne de droite sur ordinateur, en premier sur mobile) -->
          <aside class="fm-book" aria-labelledby="fm-book-titre">
            <h2 id="fm-book-titre">Prendre rendez-vous</h2>
            <p class="fm-next" *ngIf="creneaux()[0] as premier">
              Prochaine disponibilité : <strong>{{ premier.debut | date:'EEE d MMM à HH:mm' }}</strong>
            </p>

            <div *ngIf="reservation() as r" class="fm-ok" role="status">
              <i class="fa fa-circle-check"></i>
              <div>
                <strong>Rendez-vous confirmé</strong>
                <span>{{ r.debut | date:'EEEE d MMMM à HH:mm' }}</span>
                <a routerLink="/mes-rendez-vous">Voir mes rendez-vous</a>
              </div>
            </div>
            <p *ngIf="erreur()" class="fm-err">{{ erreur() }}</p>
            <p *ngIf="charge()" class="fm-muted">Chargement des disponibilités…</p>

            <!-- Etape 2 : confirmation du creneau choisi -->
            <div *ngIf="selection() as s" class="fm-confirm">
              <span class="fm-confirm-lbl">Votre rendez-vous</span>
              <strong class="fm-confirm-date">{{ s.debut | date:'EEEE d MMMM' }}</strong>
              <span class="fm-confirm-heure"><i class="fa fa-clock fa-xs"></i> {{ s.debut | date:'HH:mm' }} · {{ s.dureeMinutes }} min</span>
              <button type="button" class="fm-btn fm-btn--pri" (click)="reserver(s)" [disabled]="enCours() !== null">
                {{ enCours() ? 'Réservation…' : 'Confirmer le rendez-vous' }}
              </button>
              <button type="button" class="fm-link" (click)="selection.set(null)" [disabled]="enCours() !== null">Choisir un autre horaire</button>
            </div>

            <!-- Etape 1 : choix du jour et de l'heure -->
            <ng-container *ngIf="!selection() && joursCreneaux().length">
              <div class="fm-nav">
                <button type="button" class="fm-nav-btn" (click)="page.set(page() - 1)" [disabled]="page() === 0" aria-label="Jours précédents"><i class="fa fa-chevron-left"></i></button>
                <span class="fm-nav-lbl">Choisissez un horaire</span>
                <button type="button" class="fm-nav-btn" (click)="page.set(page() + 1)" [disabled]="!pageSuivante()" aria-label="Jours suivants"><i class="fa fa-chevron-right"></i></button>
              </div>
              <div class="fm-jours">
                <div class="fm-jour" *ngFor="let j of joursVisibles()">
                  <div class="fm-jour-tete">
                    <span class="fm-jour-nom">{{ j.date | date:'EEE' }}</span>
                    <span class="fm-jour-num">{{ j.date | date:'d MMM' }}</span>
                  </div>
                  <button type="button" class="fm-slot" *ngFor="let c of (toutAfficher() ? j.creneaux : j.creneaux.slice(0, 4))"
                          (click)="selection.set(c)" [disabled]="enCours() !== null"
                          [attr.aria-label]="'Choisir le ' + (c.debut | date:'EEEE d MMMM à HH:mm')" dir="ltr">
                    {{ c.debut | date:'HH:mm' }}
                  </button>
                </div>
              </div>
              <button *ngIf="plusDHoraires()" type="button" class="fm-link fm-plus" (click)="toutAfficher.set(!toutAfficher())">
                {{ toutAfficher() ? "Voir moins d'horaires" : "Voir plus d'horaires" }}
                <i class="fa fa-xs" [class.fa-chevron-down]="!toutAfficher()" [class.fa-chevron-up]="toutAfficher()"></i>
              </button>
            </ng-container>

            <p *ngIf="!charge() && !erreur() && creneaux().length === 0" class="fm-vide">Aucun créneau disponible pour le moment.</p>

            <!-- Liste d'attente -->
            <div *ngIf="!charge()" class="fm-attente">
              <p>
                <strong>{{ creneaux().length === 0 ? 'Aucun créneau ne vous est proposé ?' : 'Aucun créneau ne vous convient ?' }}</strong>
                Inscrivez-vous sur la liste d'attente de ce praticien. Vous serez notifié dès qu'un créneau se libère.
              </p>
              <p *ngIf="inscription()" class="fm-attente-ok">
                {{ inscription() }}
                <a routerLink="/liste-attente">Voir mes listes d'attente</a>
              </p>
              <button *ngIf="!inscription()" type="button" class="fm-btn fm-btn--sec fm-btn--bloc" (click)="inscrire()" [disabled]="inscriptionEnCours()">
                <i class="fa fa-bell"></i> {{ inscriptionEnCours() ? 'Inscription…' : "M'inscrire sur la liste d'attente" }}
              </button>
              <p *ngIf="erreurInscription()" class="fm-err">{{ erreurInscription() }}</p>
            </div>
          </aside>

          <!-- Informations -->
          <div class="fm-infos">
            <section class="fm-card">
              <h2><i class="fa fa-location-dot"></i> Lieu de consultation</h2>
              <p class="fm-lieu-txt">{{ m.ville || m.wilayaFr }}, wilaya de {{ m.wilayaFr }}</p>
            </section>

            <section class="fm-card">
              <h2><i class="fa fa-circle-info"></i> Informations pratiques</h2>
              <ul class="fm-pratique">
                <li><i class="fa fa-wallet"></i><div><strong>Paiement au cabinet</strong><span>Vous réglez la consultation directement sur place.</span></div></li>
                <li><i class="fa fa-bolt"></i><div><strong>Confirmation immédiate</strong><span>Votre rendez-vous est enregistré dès la réservation.</span></div></li>
                <li><i class="fa fa-calendar-xmark"></i><div><strong>Un empêchement ?</strong><span>Annulez depuis « Mes rendez-vous » pour libérer la place.</span></div></li>
              </ul>
            </section>

            <section *ngIf="reclamable()" class="fm-card fm-reclame">
              <i class="fa fa-user-doctor"></i>
              <div>
                <strong>Vous êtes ce praticien ?</strong>
                <span>Réclamez gratuitement cette fiche pour gérer vos rendez-vous.</span>
              </div>
              <a routerLink="/medecin/candidature" [queryParams]="{ fiche: m.id }" class="fm-btn fm-btn--sec">Réclamer ma fiche</a>
            </section>

            <section class="fm-card">
              <app-synthese-avis [medecinId]="m.id" />
            </section>
          </div>
        </div>
      </ng-container>
    </main>
  `,
  styles: [`
    :host { display:block; background:var(--bg); }
    .fm { max-width:1080px; margin:0 auto; padding:20px var(--gutter) 48px; }
    .fm-back { display:inline-flex; align-items:center; gap:6px; color:var(--blue); font-weight:600; font-size:14px; text-decoration:none; margin-bottom:16px; }
    .fm-back:hover { text-decoration:underline; }

    /* En-tete d'identite */
    .fm-hero { display:grid; grid-template-columns:auto 1fr auto; gap:20px; align-items:center; background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1); padding:24px; }
    .fm-ava { width:80px; height:80px; border-radius:50%; background:var(--blue-l); border:1px solid var(--pastille-bd); color:var(--blue); display:grid; place-items:center; font-size:26px; font-weight:800; letter-spacing:-.02em; }
    .fm-id { min-width:0; display:flex; flex-direction:column; gap:4px; }
    .fm-id h1 { margin:0 0 2px; font-size:clamp(1.35rem, 2.4vw, 1.75rem); line-height:1.15; letter-spacing:-.02em; font-weight:800; color:var(--ink); text-wrap:balance; }
    .fm-spe { color:var(--blue); font-weight:700; font-size:15px; }
    .fm-lieu { color:var(--text3); font-size:14px; }
    .fm-badges { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .fm-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; background:var(--green-l); color:var(--blue); font-size:12px; font-weight:700; }
    .fm-badge--neutre { background:var(--bg2); color:var(--text2); }
    .fm-hero-act { align-self:start; }
    .fm-hero-msg { grid-column:1 / -1; margin:0; }

    /* Boutons */
    .fm-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:0 18px; border-radius:var(--r12); border:1.5px solid var(--blue); font:inherit; font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; transition:background .15s var(--ease), box-shadow .15s var(--ease); }
    .fm-btn:active:not(:disabled) { transform:scale(.97); }
    .fm-btn:disabled { opacity:.6; cursor:default; }
    .fm-btn--pri { background:var(--blue); color:#fff; width:100%; }
    .fm-btn--pri:hover:not(:disabled) { background:var(--blue-d); box-shadow:0 4px 14px rgba(15,117,96,.24); }
    .fm-btn--sec { background:#fff; color:var(--blue); }
    .fm-btn--sec:hover:not(:disabled) { background:var(--blue-l); }
    .fm-btn--bloc { width:100%; }
    .fm-link { background:none; border:0; padding:0; font:inherit; font-size:14px; font-weight:600; color:var(--blue); cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
    .fm-link:hover { text-decoration:underline; }

    /* Grille : infos a gauche, reservation a droite (collante) */
    .fm-grid { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:20px; margin-top:20px; align-items:start; }
    .fm-infos { grid-column:1; grid-row:1; display:flex; flex-direction:column; gap:16px; min-width:0; }
    .fm-book { grid-column:2; grid-row:1; position:sticky; top:calc(var(--nav-h, 56px) + 16px); background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:0 2px 8px rgba(16,40,34,.06), 0 20px 40px rgba(16,40,34,.10); padding:20px; display:flex; flex-direction:column; gap:14px; }
    .fm-book h2 { margin:0; font-size:1.15rem; font-weight:700; color:var(--ink); letter-spacing:-.01em; }
    .fm-next { margin:-6px 0 0; font-size:13px; color:var(--text3); }
    .fm-next strong { color:var(--blue); display:inline-block; }
    .fm-next strong::first-letter, .fm-confirm-date::first-letter, .fm-ok span::first-letter { text-transform:uppercase; }

    .fm-nav { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .fm-nav-lbl { font-size:13px; font-weight:600; color:var(--text2); }
    .fm-nav-btn { width:36px; height:36px; border-radius:50%; border:1px solid var(--border); background:#fff; color:var(--blue); cursor:pointer; display:grid; place-items:center; }
    .fm-nav-btn:hover:not(:disabled) { border-color:var(--blue); background:var(--blue-l); }
    .fm-nav-btn:disabled { color:var(--text4); cursor:default; }
    .fm-jours { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px; }
    .fm-jour { display:flex; flex-direction:column; gap:6px; min-width:0; }
    .fm-jour-tete { display:flex; flex-direction:column; align-items:center; padding-bottom:6px; margin-bottom:2px; border-bottom:1px solid var(--border); }
    .fm-jour-nom { font-size:12px; font-weight:700; color:var(--ink); text-transform:capitalize; }
    .fm-jour-num { font-size:12px; color:var(--text3); }
    .fm-slot { height:38px; border-radius:10px; border:0; background:var(--blue-l); color:var(--blue); font:inherit; font-size:14px; font-weight:700; cursor:pointer; transition:background .15s var(--ease), color .15s var(--ease); }
    .fm-slot:hover:not(:disabled) { background:var(--blue); color:#fff; }
    .fm-slot:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(15,117,96,.18); }
    .fm-slot:disabled { opacity:.5; cursor:default; }
    .fm-plus { align-self:center; }

    .fm-confirm { display:flex; flex-direction:column; gap:6px; padding:16px; border-radius:var(--r12); background:var(--blue-l); border:1px solid var(--pastille-bd); }
    .fm-confirm-lbl { font-size:12px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.04em; }
    .fm-confirm-date { font-size:17px; color:var(--ink); display:block; }
    .fm-confirm-heure { font-size:14px; color:var(--text2); margin-bottom:8px; }
    .fm-confirm .fm-link { align-self:center; margin-top:4px; }

    .fm-ok { display:flex; gap:12px; padding:14px; border-radius:var(--r12); background:var(--green-l); color:var(--blue-d); }
    .fm-ok > i { font-size:20px; color:var(--green); margin-top:2px; }
    .fm-ok div { display:flex; flex-direction:column; gap:2px; font-size:14px; }
    .fm-ok span { display:block; }
    .fm-ok a { color:var(--blue); font-weight:700; }

    .fm-vide { margin:0; padding:14px; border-radius:var(--r12); background:var(--bg2); color:var(--text2); font-size:14px; text-align:center; }
    .fm-attente { border-top:1px solid var(--border); padding-top:14px; display:flex; flex-direction:column; gap:10px; }
    .fm-attente p { margin:0; font-size:13px; color:var(--text2); line-height:1.5; }
    .fm-attente strong { display:block; color:var(--ink); font-size:14px; margin-bottom:2px; }
    .fm-attente-ok { color:var(--blue-d) !important; font-weight:600; }
    .fm-attente-ok a { color:var(--blue); }

    /* Cartes d'information */
    .fm-card { background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1); padding:20px; }
    .fm-card h2 { margin:0 0 12px; font-size:1.05rem; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:10px; }
    .fm-card h2 i { color:var(--blue); font-size:15px; }
    .fm-lieu-txt { margin:0; color:var(--text2); font-size:15px; }
    .fm-pratique { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px; }
    .fm-pratique li { display:flex; gap:12px; align-items:flex-start; }
    .fm-pratique li > i { width:34px; height:34px; flex:none; border-radius:10px; background:var(--blue-l); color:var(--blue); display:grid; place-items:center; font-size:14px; }
    .fm-pratique div { display:flex; flex-direction:column; gap:2px; }
    .fm-pratique strong { font-size:14px; color:var(--ink); }
    .fm-pratique span { font-size:13px; color:var(--text3); }
    .fm-reclame { display:flex; align-items:center; gap:14px; border-style:dashed; border-color:var(--pastille-bd); }
    .fm-reclame > i { font-size:22px; color:var(--blue); }
    .fm-reclame div { flex:1; display:flex; flex-direction:column; gap:2px; font-size:14px; }
    .fm-reclame span { color:var(--text3); font-size:13px; }

    .fm-err { color:var(--red); font-size:14px; margin:0; }
    .fm-muted { color:var(--text3); font-size:14px; margin:0; }

    /* Mobile : une colonne, la reservation passe juste sous l'identite */
    @media (max-width: 860px) {
      .fm-grid { grid-template-columns:1fr; }
      .fm-book { grid-column:1; grid-row:1; position:static; }
      .fm-infos { grid-row:2; }
    }
    @media (max-width: 560px) {
      .fm { padding-top:14px; }
      .fm-hero { grid-template-columns:auto 1fr; padding:18px; gap:14px; align-items:start; }
      .fm-ava { width:60px; height:60px; font-size:20px; }
      .fm-hero-act { grid-column:1 / -1; }
      .fm-hero-act .fm-btn { width:100%; }
      .fm-reclame { flex-wrap:wrap; }
      .fm-reclame .fm-btn { width:100%; }
    }
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
  /** Page de jours affichee dans le module de reservation (4 jours par page). */
  page = signal(0);
  private readonly joursParPage = 4;
  joursVisibles = computed(() => this.joursCreneaux().slice(this.page() * this.joursParPage, (this.page() + 1) * this.joursParPage));
  pageSuivante = computed(() => (this.page() + 1) * this.joursParPage < this.joursCreneaux().length);
  /** Affiche tous les horaires de chaque jour au lieu des 4 premiers. */
  toutAfficher = signal(false);
  plusDHoraires = computed(() => this.joursVisibles().some((j) => j.creneaux.length > 4));
  /** Creneau choisi, en attente de confirmation par le patient. */
  selection = signal<Creneau | null>(null);
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
    this.selection.set(null);
    this.page.set(0);
    this.toutAfficher.set(false);
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
          // Uniquement les creneaux libres et a venir (l'API peut encore renvoyer ceux de la journee passee).
          liste.filter((c) => c.disponible && Date.parse(c.debut) > Date.now()).sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
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
        this.selection.set(null);
        this.reservation.set(creneau);
        this.enCours.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.selection.set(null);
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
