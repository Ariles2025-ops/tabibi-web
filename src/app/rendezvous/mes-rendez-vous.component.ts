import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { AvisService } from '../avis/avis.service';
import { RendezVous, RendezVousService } from './rendezvous.service';
import { estAnnule, libelleStatutRendezVous } from './statut-rendez-vous';

@Component({
    selector: 'app-mes-rendez-vous',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="mr">
      <header class="mr-tete">
        <div>
          <h1>Mes rendez-vous</h1>
          <p>Retrouvez vos consultations à venir et votre historique.</p>
        </div>
        <a routerLink="/" class="mr-btn mr-btn--pri"><i class="fa fa-magnifying-glass fa-xs"></i> Prendre un rendez-vous</a>
      </header>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge() && !rendezVous().length" class="mr-muted">Chargement de vos rendez-vous…</p>
        <p *ngIf="erreur()" class="mr-err" role="alert">{{ erreur() }}</p>
        <p *ngIf="succes()" class="mr-muted" role="status">{{ succes() }}</p>

        <!-- Aucun rendez-vous du tout -->
        <div *ngIf="!charge() && !erreur() && rendezVous().length === 0" class="mr-vide">
          <div class="mr-vide-ic"><i class="fa fa-calendar-plus"></i></div>
          <h2>Aucun rendez-vous pour le moment</h2>
          <p>Trouvez un praticien près de chez vous et réservez en quelques secondes.</p>
          <a routerLink="/" class="mr-btn mr-btn--pri">Trouver un praticien</a>
        </div>

        <ng-container *ngIf="rendezVous().length">
          <!-- A venir -->
          <section class="mr-sec">
            <h2 class="mr-sec-titre">À venir <span class="mr-compte">{{ aVenir().length }}</span></h2>
            <p *ngIf="aVenir().length === 0" class="mr-sec-vide">
              Aucun rendez-vous à venir. <a routerLink="/">Trouver un praticien</a>
            </p>
            <ul class="mr-liste">
              <li *ngFor="let r of aVenir()" class="mr-carte">
                <div class="mr-date" aria-hidden="true">
                  <span class="mr-date-j">{{ r.debut | date:'EEE' }}</span>
                  <span class="mr-date-n">{{ r.debut | date:'d' }}</span>
                  <span class="mr-date-m">{{ r.debut | date:'MMM' }}</span>
                </div>
                <div class="mr-corps">
                  <span class="mr-quand"><span class="mr-cap">{{ r.debut | date:'EEEE d MMMM' }}</span> à {{ r.debut | date:'HH:mm' }}</span>
                  <a [routerLink]="['/medecins', r.medecinId]" class="mr-doc">{{ noms()[r.medecinId] ?? 'Voir le praticien' }}</a>
                  <span class="mr-statut" [class.mr-statut--ok]="r.statut === 'CONFIRME' || r.statut === 'RESERVE'">{{ libelleStatut(r.statut) }}</span>
                </div>
                <div class="mr-actions">
                  <ng-container *ngIf="aConfirmer() !== r.id">
                    <a [routerLink]="['/medecins', r.medecinId]" class="mr-btn mr-btn--sec">Voir la fiche</a>
                    <button *ngIf="peutAnnuler(r)" type="button" class="mr-btn mr-btn--danger" (click)="aConfirmer.set(r.id)" [disabled]="enCours() !== null">Annuler</button>
                  </ng-container>
                  <div *ngIf="aConfirmer() === r.id" class="mr-confirm" role="group" aria-label="Confirmer l'annulation">
                    <span>Annuler ce rendez-vous ?</span>
                    <button type="button" class="mr-btn mr-btn--danger-plein" (click)="annuler(r)" [disabled]="enCours() !== null">
                      {{ enCours() === r.id ? 'Annulation…' : "Oui, annuler" }}
                    </button>
                    <button type="button" class="mr-btn mr-btn--sec" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">Non, garder</button>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <!-- Historique -->
          <section *ngIf="passes().length" class="mr-sec">
            <h2 class="mr-sec-titre">Passés <span class="mr-compte">{{ passes().length }}</span></h2>
            <ul class="mr-liste">
              <li *ngFor="let r of passes()" class="mr-carte mr-carte--passe">
                <div class="mr-date" aria-hidden="true">
                  <span class="mr-date-j">{{ r.debut | date:'EEE' }}</span>
                  <span class="mr-date-n">{{ r.debut | date:'d' }}</span>
                  <span class="mr-date-m">{{ r.debut | date:'MMM' }}</span>
                </div>
                <div class="mr-corps">
                  <span class="mr-quand"><span class="mr-cap">{{ r.debut | date:'EEEE d MMMM y' }}</span> à {{ r.debut | date:'HH:mm' }}</span>
                  <a [routerLink]="['/medecins', r.medecinId]" class="mr-doc">{{ noms()[r.medecinId] ?? 'Voir le praticien' }}</a>
                  <span class="mr-statut" [class.mr-statut--annule]="estAnnule(r.statut) || r.statut === 'ABSENT'">{{ libelleStatutPasse(r) }}</span>
                </div>
                <div class="mr-actions">
                  <a *ngIf="r.statut === 'HONORE' && !avisDonne(r)" class="mr-btn mr-btn--sec" [routerLink]="['/avis/nouveau', r.id]"><i class="fa fa-star fa-xs"></i> Donner mon avis</a>
                  <span *ngIf="r.statut === 'HONORE' && avisDonne(r)" class="mr-avis-ok"><i class="fa fa-circle-check fa-xs"></i> Avis donné</span>
                  <a [routerLink]="['/medecins', r.medecinId]" class="mr-btn mr-btn--sec">Reprendre rendez-vous</a>
                </div>
              </li>
            </ul>
          </section>
        </ng-container>
      </ng-container>
    </main>
  `,
    styles: [`
    :host { display:block; background:var(--bg); }
    .mr { max-width:880px; margin:0 auto; padding:28px var(--gutter) 56px; display:flex; flex-direction:column; gap:24px; }
    .mr-tete { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .mr-tete h1 { margin:0; font-size:clamp(1.5rem, 3vw, 1.9rem); font-weight:800; letter-spacing:-.02em; line-height:1.15; color:var(--ink); }
    .mr-tete p { margin:4px 0 0; color:var(--text3); font-size:15px; }

    .mr-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:42px; padding:0 16px; border-radius:var(--r12); border:1.5px solid var(--blue); font:inherit; font-size:14px; font-weight:600; text-decoration:none; cursor:pointer; white-space:nowrap; transition:background .15s var(--ease), box-shadow .15s var(--ease); }
    .mr-btn:active:not(:disabled) { transform:scale(.97); }
    .mr-btn:disabled { opacity:.6; cursor:default; }
    .mr-btn--pri { background:var(--blue); color:#fff; }
    .mr-btn--pri:hover { background:var(--blue-d); box-shadow:0 4px 14px rgba(15,117,96,.24); }
    .mr-btn--sec { background:#fff; color:var(--blue); }
    .mr-btn--sec:hover:not(:disabled) { background:var(--blue-l); }
    .mr-btn--danger { background:#fff; color:var(--red); border-color:var(--border); }
    .mr-btn--danger:hover:not(:disabled) { border-color:var(--red); background:var(--red-l); }
    .mr-btn--danger-plein { background:var(--red); color:#fff; border-color:var(--red); }

    .mr-sec { display:flex; flex-direction:column; gap:12px; }
    .mr-sec-titre { margin:0; font-size:1.1rem; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:8px; }
    .mr-compte { min-width:24px; height:24px; padding:0 8px; border-radius:999px; background:var(--blue-l); color:var(--blue); font-size:12px; font-weight:700; display:inline-grid; place-items:center; }
    .mr-sec-vide { margin:0; padding:16px; border-radius:var(--r12); background:#fff; border:1px dashed var(--border); color:var(--text3); font-size:14px; }
    .mr-sec-vide a { color:var(--blue); font-weight:600; }

    .mr-liste { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px; }
    .mr-carte { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:16px; align-items:center; background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1); padding:16px; }
    .mr-carte--passe { box-shadow:none; }
    .mr-carte--passe .mr-date { background:var(--bg2); color:var(--text2); }
    .mr-date { width:64px; padding:8px 0; border-radius:var(--r12); background:var(--blue-l); color:var(--blue); display:flex; flex-direction:column; align-items:center; line-height:1.1; }
    .mr-date-j, .mr-date-m { font-size:12px; font-weight:600; text-transform:capitalize; }
    .mr-date-n { font-size:24px; font-weight:800; letter-spacing:-.02em; }
    .mr-corps { display:flex; flex-direction:column; gap:3px; min-width:0; }
    .mr-quand { font-size:15px; font-weight:700; color:var(--ink); }
    .mr-cap { display:inline-block; }
    .mr-cap::first-letter { text-transform:uppercase; }
    .mr-doc { color:var(--blue); font-weight:600; font-size:14px; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mr-doc:hover { text-decoration:underline; }
    .mr-statut { align-self:flex-start; margin-top:4px; padding:2px 10px; border-radius:999px; background:var(--bg2); color:var(--text2); font-size:12px; font-weight:700; }
    .mr-statut--ok { background:var(--green-l); color:var(--blue); }
    .mr-statut--annule { background:var(--red-l); color:var(--red-d); }
    .mr-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    .mr-confirm { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    .mr-confirm span { font-size:14px; font-weight:600; color:var(--ink); }
    .mr-avis-ok { font-size:13px; font-weight:600; color:var(--green); display:inline-flex; align-items:center; gap:6px; }

    .mr-vide { background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1); padding:40px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .mr-vide-ic { width:64px; height:64px; border-radius:50%; background:var(--blue-l); color:var(--blue); display:grid; place-items:center; font-size:24px; margin-bottom:6px; }
    .mr-vide h2 { margin:0; font-size:1.15rem; color:var(--ink); }
    .mr-vide p { margin:0 0 10px; color:var(--text3); font-size:14px; max-width:40ch; }

    .mr-err { margin:0; color:var(--red); font-size:14px; }
    .mr-muted { margin:0; color:var(--text3); font-size:14px; }

    @media (max-width: 640px) {
      .mr { padding-top:20px; gap:20px; }
      .mr-tete .mr-btn { width:100%; }
      .mr-carte { grid-template-columns:auto minmax(0,1fr); padding:14px; gap:12px; }
      .mr-date { width:56px; }
      .mr-actions, .mr-confirm { grid-column:1 / -1; justify-content:stretch; }
      .mr-actions .mr-btn, .mr-confirm .mr-btn { flex:1; }
      .mr-confirm span { width:100%; }
    }
  `]
})
export class MesRendezVousComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(RendezVousService);
  private annuaire = inject(AnnuaireService);
  private avis = inject(AvisService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  rendezVous = signal<RendezVous[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  /** Identifiants des rendez-vous pour lesquels j'ai deja donne un avis (GET /api/avis/mes). */
  rendezVousNotes = signal<Set<string>>(new Set());
  /** Rendez-vous a venir (non annules, non honores, pas encore passes), du plus proche au plus lointain. */
  aVenir = computed(() => this.rendezVous().filter((r) => this.estAVenir(r)));
  /** Historique : passes, honores ou annules, du plus recent au plus ancien. */
  passes = computed(() => this.rendezVous().filter((r) => !this.estAVenir(r)).reverse());
  /** Rendez-vous dont l'annulation attend la confirmation du patient (confirmation dans la page). */
  aConfirmer = signal<string | null>(null);
  charge = signal(false);
  /** Identifiant du rendez-vous dont l'annulation est en cours. */
  enCours = signal<string | null>(null);
  erreur = signal('');
  /** Confirmation apres l'annulation (comme « Rendez-vous annulé » dans l'appli). */
  succes = signal('');

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
        this.chargerAvis(liste);
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
    this.enCours.set(rdv.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.annuler(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        this.charger();
        this.succes.set('Rendez-vous annulé.');
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? "L'annulation a échoué, veuillez réessayer.");
      },
    });
  }

  private estAVenir(rdv: RendezVous): boolean {
    return !estAnnule(rdv.statut) && rdv.statut !== 'HONORE' && rdv.statut !== 'ABSENT' && Date.parse(rdv.debut) >= Date.now();
  }

  /** Un rendez-vous deja annule, honore ou marque absent (consultation passee) ne s'annule plus. */
  peutAnnuler(rdv: RendezVous): boolean {
    return !estAnnule(rdv.statut) && rdv.statut !== 'HONORE' && rdv.statut !== 'ABSENT';
  }

  /** Utilisable dans le gabarit. */
  readonly estAnnule = estAnnule;

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut);
  }

  /**
   * Historique, vocabulaire patient : « Terminé » pour une consultation effectuee (confirmee passee ou HONORE),
   * « Non honoré » pour ABSENT (libelle neutre). Les agendas medecin / secretaire gardent « Honoré » / « Absent ».
   */
  libelleStatutPasse(rdv: RendezVous): string {
    if (rdv.statut === 'CONFIRME' || rdv.statut === 'RESERVE' || rdv.statut === 'HONORE') return 'Terminé';
    if (rdv.statut === 'ABSENT') return 'Non honoré';
    return libelleStatutRendezVous(rdv.statut);
  }

  /** Vrai si un avis a deja ete depose sur ce rendez-vous (« Avis donné » a la place du bouton). */
  avisDonne(rdv: RendezVous): boolean {
    return this.rendezVousNotes().has(rdv.id);
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des rendez-vous. */
  private chargerNoms(liste: RendezVous[]) {
    const ids = new Set(liste.map((r) => r.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe((m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })));
    }
  }

  /** Lit mes avis (s'il y a au moins un rendez-vous honore) pour ne proposer « Donner mon avis » qu'une fois. */
  private chargerAvis(liste: RendezVous[]) {
    if (!liste.some((r) => r.statut === 'HONORE')) return;
    this.avis.mes().subscribe({
      next: (avis) => this.rendezVousNotes.set(new Set(avis.map((a) => a.rendezVousId))),
      error: () => undefined,
    });
  }
}
