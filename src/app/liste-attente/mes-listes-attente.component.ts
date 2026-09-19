import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { InscriptionAttente, ListeAttenteService } from './liste-attente.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';

/**
 * Mes listes d'attente (role PATIENT) : inscriptions du patient (GET /api/liste-attente/mes), les plus anciennes
 * d'abord, avec le nom du praticien lu dans l'annuaire et le retrait (POST /api/liste-attente/{id}/retirer).
 */
@Component({
  selector: 'app-mes-listes-attente',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'listeAttente.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'listeAttente.intro' | t }}</p>

      <p *ngIf="connecte() === false">{{ 'commun.redirectionConnexion' | t }}</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let i of inscriptions()"
              style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <a [routerLink]="['/medecins', i.medecinId]" style="color:var(--vert);font-weight:600">{{ noms()[i.medecinId] ?? ('commun.voirPraticien' | t) }}</a><br>
              <span style="color:#566b64">{{ 'listeAttente.inscritLe' | t:{ date: (i.inscritLe | dateLocale:'dateHeure') } }}</span>
            </div>
            <button type="button" (click)="retirer(i)" [disabled]="enCours() !== null"
                    style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
              {{ (enCours() === i.id ? 'commun.retrait' : 'listeAttente.meRetirer') | t }}
            </button>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && inscriptions().length === 0">
          {{ 'listeAttente.aucune' | t }}
          <a routerLink="/" style="color:var(--vert)">{{ 'commun.trouverPraticien' | t }}</a>
        </p>
      </ng-container>
    </main>
  `,
})
export class MesListesAttenteComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(ListeAttenteService);
  private annuaire = inject(AnnuaireService);
  private i18n = inject(TraductionService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  inscriptions = signal<InscriptionAttente[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  /** Identifiant de l'inscription dont le retrait est en cours. */
  enCours = signal<string | null>(null);
  erreur = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('seo.mesListesAttente');
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
        this.inscriptions.set([...liste].sort((a, b) => Date.parse(a.inscritLe) - Date.parse(b.inscritLe)));
        this.chargerNoms(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reservePatients'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('listeAttente.erreurChargement'));
        }
      },
    });
  }

  retirer(inscription: InscriptionAttente) {
    this.enCours.set(inscription.id);
    this.erreur.set('');
    this.service.retirer(inscription.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.inscriptions.update((liste) => liste.filter((i) => i.id !== inscription.id));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 404) {
          // Deja retiree (autre onglet) : la liste est rechargee.
          this.charger();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('listeAttente.retraitEchec'));
        }
      },
    });
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des inscriptions ; un echec laisse le lien generique. */
  private chargerNoms(liste: InscriptionAttente[]) {
    const ids = new Set(liste.map((i) => i.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }
}
