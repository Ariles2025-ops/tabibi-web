import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, Reponse, formaterPrix, libelleStatutBesoin } from './dawini.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/**
 * Reponses des pharmacies a l'une de mes demandes (GET /api/dawini/besoins/{id}/reponses, les plus anciennes
 * d'abord) : pharmacie, disponibilite, prix en dinars, commentaire, date ; « Clôturer la demande » tant qu'elle est
 * ouverte (POST .../cloturer). La demande elle-meme est retrouvee dans mes demandes (pas de lecture unitaire cote API).
 */
@Component({
  selector: 'app-reponses-demande',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/dawini" style="color:var(--vert)">{{ 'demande.retour' | t }}</a></p>
      <h1 style="color:var(--vert);margin:0 0 8px">{{ besoin()?.medicament ?? ('demande.titreDefaut' | t) }}</h1>

      <p *ngIf="connecte() === false">{{ 'commun.redirectionConnexion' | t }}</p>

      <ng-container *ngIf="connecte()">
        <ng-container *ngIf="besoin() as b">
          <p style="color:#566b64;margin:0 0 16px">
            {{ libelleStatut(b.statut) }} · {{ 'dawini.wilayaLigne' | t:{ code: b.wilayaCode } }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
            · {{ 'dawini.publieeLe' | t:{ date: (b.publieLe | dateLocale:'courtHeure') } }}<ng-container *ngIf="b.clotureLe as cloture"> · {{ 'demande.clotureeLe' | t:{ date: (cloture | dateLocale:'courtHeure') } }}</ng-container>
            <ng-container *ngIf="b.precision"><br>{{ b.precision }}</ng-container>
          </p>
          <p *ngIf="b.statut === 'OUVERT'" style="margin:0 0 16px">
            <button type="button" class="bouton-secondaire" (click)="cloturer()" [disabled]="enCours()">
              {{ (enCours() ? 'demande.cloture' : 'demande.cloturer') | t }}
            </button>
          </p>
        </ng-container>

        <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
        <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>

        <h2 style="font-size:1.1rem;margin:0 0 12px">{{ 'demande.reponsesPharmacies' | t }}</h2>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let r of reponses()" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
            <strong>{{ r.nomPharmacie }}</strong>
            <span [style.color]="r.disponible ? 'var(--vert)' : '#b3261e'"> · {{ (r.disponible ? 'demande.disponible' : 'demande.indisponible') | t }}</span>
            <span *ngIf="r.prixDa !== null" style="color:#566b64"> · {{ prix(r.prixDa) }}</span>
            <span style="color:#566b64"> · {{ r.repondueLe | dateLocale:'courtHeure' }}</span>
            <p *ngIf="r.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ r.commentaire }}</p>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && reponses().length === 0">{{ 'demande.aucuneReponse' | t }}</p>
      </ng-container>
    </main>
  `,
})
export class ReponsesDemandeComponent implements OnInit {
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(DawiniService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles du service. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  private besoinId = '';
  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** La demande, retrouvee dans mes demandes ; null tant qu'elle est inconnue. */
  besoin = signal<Besoin | null>(null);
  reponses = signal<Reponse[]>([]);
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('seo.reponsesPharmacies');
    this.besoinId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.chargerBesoin();
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.reponses(this.besoinId).subscribe({
      next: (liste) => {
        // Les plus anciennes d'abord.
        this.reponses.set([...liste].sort((a, b) => Date.parse(a.repondueLe) - Date.parse(b.repondueLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('demande.nAppartientPas'));
        } else if (e.status === 404) {
          this.erreur.set(this.i18n.t('demande.introuvable'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('demande.erreurChargement'));
        }
      },
    });
  }

  /** Cloture : les pharmacies ne voient plus la demande ; 409 (deja cloturee) affiche le motif et recharge la demande. */
  cloturer() {
    this.enCours.set(true);
    this.succes.set('');
    this.erreur.set('');
    this.service.cloturer(this.besoinId).subscribe({
      next: (b) => {
        this.enCours.set(false);
        this.besoin.set(b);
        this.succes.set(this.i18n.t('demande.cloturee'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('demande.dejaCloturee'));
          this.chargerBesoin();
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('demande.clotureEchec'));
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutBesoin(statut, this.traduire);
  }

  prix(prixDa: number | null): string {
    return formaterPrix(prixDa, this.traduire);
  }

  /** Retrouve la demande dans mes demandes (statut, bouton de cloture) ; a defaut, seules les reponses s'affichent. */
  private chargerBesoin() {
    this.service.mesBesoins().subscribe({
      next: (liste) => this.besoin.set(liste.find((b) => b.id === this.besoinId) ?? null),
      error: () => undefined,
    });
  }
}
