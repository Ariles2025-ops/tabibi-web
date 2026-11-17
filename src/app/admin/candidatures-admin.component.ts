import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminService, Candidature, libelleStatutCandidature } from './admin.service';

/** Filtre par statut de la liste ; '' = toutes. */
const STATUTS_FILTRE = [
  { valeur: 'EN_ATTENTE', libelle: 'En attente' },
  { valeur: 'VALIDEE', libelle: 'Validées' },
  { valeur: 'REFUSEE', libelle: 'Refusées' },
  { valeur: '', libelle: 'Toutes' },
];

/**
 * Examen des candidatures de medecins par l'administrateur (GET /api/admin/candidatures?statut=) : validation
 * (publication dans l'annuaire) ou refus motive ; le medecin est prevenu par l'API.
 */
@Component({
    selector: 'app-candidatures-admin',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">Candidatures</h1>
        <label style="display:flex;align-items:center;gap:8px;color:var(--text3);font-size:.9rem">
          Statut
          <select class="champ" [ngModel]="statut()" (ngModelChange)="filtrer($event)" name="statut" style="color:var(--tbi-ink);font-size:1rem">
            <option *ngFor="let s of statuts" [value]="s.valeur">{{ s.libelle }}</option>
          </select>
        </label>
      </div>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let c of candidatures()" style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:16px 18px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ c.nomComplet }}</strong>
              <span style="color:var(--text3)"> · {{ libelleStatut(c.statut) }}</span>
              <span *ngIf="c.ficheReclamee" style="color:var(--vert)"> · Réclame la fiche :
                <a [routerLink]="['/medecins', c.ficheReclamee]" style="color:var(--vert)">{{ c.ficheReclameeNom || 'fiche existante' }}</a></span><br>
              <span *ngIf="c.compteEmail" class="compte-email" style="color:var(--text2)"><i class="fa fa-envelope fa-xs" aria-hidden="true"></i> {{ c.compteEmail }}<br></span>
              <span style="color:var(--text3)">
                {{ c.specialiteFr || c.specialiteSlug }} · {{ c.ville || 'Ville non précisée' }} ({{ c.wilayaFr || c.wilayaCode }})
                · N° d'ordre {{ c.numeroOrdre }}<ng-container *ngIf="c.telephone"> · {{ c.telephone }}</ng-container>
              </span><br>
              <span style="color:var(--text3);font-size:.9rem">
                Déposée le {{ c.deposeeLe | date:'d MMMM yyyy à HH:mm' }}<ng-container *ngIf="c.traiteeLe"> · traitée le {{ c.traiteeLe | date:'d MMMM yyyy à HH:mm' }}</ng-container>
              </span>
              <p *ngIf="c.motifRefus" style="margin:6px 0 0;color:#b3261e">Motif du refus : {{ c.motifRefus }}</p>
              <p *ngIf="(c.doublonsNumeroOrdre ?? 0) > 0" class="alerte-doublon" role="alert"
                 style="margin:6px 0 0;color:var(--red);background:var(--red-l);border-radius:var(--r12);padding:6px 10px;font-weight:600">
                <i class="fa fa-triangle-exclamation" aria-hidden="true"></i>
                N° d'ordre déjà utilisé par {{ c.doublonsNumeroOrdre }} autre(s) candidature(s)
              </p>
            </div>
            <button *ngIf="c.statut === 'EN_ATTENTE'" type="button" class="bouton" (click)="valider(c)"
                    [disabled]="enCours() !== null || aConfirmer()?.id === c.id">Valider</button>
          </div>

          <form *ngIf="c.statut === 'EN_ATTENTE'" (ngSubmit)="refuser(c)"
                style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0 0">
            <input class="champ" [(ngModel)]="motifs[c.id]" [name]="'motif-' + c.id" placeholder="Motif du refus (obligatoire)"
                   required style="flex:1;min-width:220px;color:var(--tbi-ink);font-size:1rem">
            <button type="submit" [disabled]="enCours() !== null || !motifRenseigne(c) || aConfirmer()?.id === c.id"
                    style="padding:11px 18px;background:#fff;color:#b3261e;border:1.5px solid #f0c9c6;border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
              Refuser
            </button>
          </form>

          <div *ngIf="aConfirmer() as conf">
            <div *ngIf="conf.id === c.id" class="confirmation-candidature"
                 [style.background]="conf.action === 'valider' ? 'var(--green-l)' : 'var(--red-l)'"
                 style="margin:12px 0 0;border-radius:var(--r12);padding:12px 14px;display:grid;gap:8px">
              <strong [style.color]="conf.action === 'valider' ? 'var(--green)' : 'var(--red)'">
                {{ conf.action === 'valider' ? 'Valider cette candidature ? Le praticien sera publié sur Ndawik.' : 'Refuser cette candidature ? Le praticien recevra le motif.' }}
              </strong>
              <dl style="margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 12px;color:var(--ink);font-size:.95rem">
                <dt style="color:var(--text3)">Nom</dt><dd style="margin:0">{{ c.nomComplet }}</dd>
                <dt style="color:var(--text3)">Spécialité</dt><dd style="margin:0">{{ c.specialiteFr || c.specialiteSlug }}</dd>
                <dt style="color:var(--text3)">Wilaya</dt><dd style="margin:0">{{ c.wilayaFr || c.wilayaCode }}</dd>
                <dt style="color:var(--text3)">N° d'ordre</dt><dd style="margin:0">{{ c.numeroOrdre }}</dd>
                <dt style="color:var(--text3)">E-mail</dt><dd style="margin:0">{{ c.compteEmail || 'Non renseigné' }}</dd>
                <ng-container *ngIf="conf.action === 'refuser'">
                  <dt style="color:var(--text3)">Motif</dt><dd style="margin:0">{{ motifs[c.id] }}</dd>
                </ng-container>
              </dl>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="bouton" (click)="confirmer(c)" [disabled]="enCours() !== null">
                  {{ enCours() === c.id ? 'Enregistrement…' : (conf.action === 'valider' ? 'Oui, valider' : 'Oui, refuser') }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">Non</button>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && candidatures().length === 0">Aucune candidature pour ce filtre.</p>

      <p style="margin:24px 0 0"><a routerLink="/admin" style="color:var(--vert)">Retour au tableau de bord</a></p>
    </main>
  `
})
export class CandidaturesAdminComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(AdminService);

  statuts = STATUTS_FILTRE;
  /** Statut filtre ('' = toutes) ; les candidatures en attente d'abord. */
  statut = signal('EN_ATTENTE');
  candidatures = signal<Candidature[]>([]);
  /** Motif de refus saisi, par identifiant de candidature. */
  motifs: Record<string, string> = {};
  charge = signal(false);
  /** Decision en attente de confirmation (Oui / Non), ou null. */
  aConfirmer = signal<{ id: string; action: 'valider' | 'refuser' } | null>(null);
  /** Identifiant de la candidature en cours de traitement. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.charger();
  }

  filtrer(statut: string) {
    this.statut.set(statut);
    this.succes.set('');
    this.charger();
  }

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (candidature deja traitee ailleurs). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.candidatures(this.statut() || undefined).subscribe({
      next: (liste) => {
        this.candidatures.set(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set("Cette page est réservée à l'administrateur.");
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger les candidatures.');
        }
      },
    });
  }

  /** « Valider » : ouvre le panneau de confirmation recapitulatif. */
  valider(c: Candidature) {
    this.succes.set('');
    this.erreur.set('');
    this.aConfirmer.set({ id: c.id, action: 'valider' });
  }

  /** « Refuser » : exige le motif puis ouvre le panneau de confirmation recapitulatif. */
  refuser(c: Candidature) {
    const motif = (this.motifs[c.id] ?? '').trim();
    if (!motif) {
      this.erreur.set('Indiquez le motif du refus.');
      return;
    }
    this.succes.set('');
    this.erreur.set('');
    this.aConfirmer.set({ id: c.id, action: 'refuser' });
  }

  /** « Oui » du panneau de confirmation : envoie la decision. */
  confirmer(c: Candidature) {
    const conf = this.aConfirmer();
    if (!conf || conf.id !== c.id) return;
    if (conf.action === 'valider') {
      this.traiter(c, this.service.valider(c.id), `Candidature de ${c.nomComplet} validée : le praticien figure désormais sur Ndawik.`);
    } else {
      const motif = (this.motifs[c.id] ?? '').trim();
      this.traiter(c, this.service.refuser(c.id, motif), `Candidature de ${c.nomComplet} refusée ; le praticien est prévenu du motif.`);
    }
  }

  motifRenseigne(c: Candidature): boolean {
    return (this.motifs[c.id] ?? '').trim().length > 0;
  }

  libelleStatut(statut: string): string {
    return libelleStatutCandidature(statut);
  }

  /** Applique une decision puis recharge la liste ; 409 / 404 (deja traitee, disparue) affichent le motif et rechargent. */
  private traiter(c: Candidature, appel: ReturnType<AdminService['valider']>, message: string) {
    this.enCours.set(c.id);
    this.succes.set('');
    this.erreur.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        delete this.motifs[c.id];
        this.succes.set(message);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409 || e.status === 404) {
          this.charger(e.error?.erreur ?? 'Cette candidature a déjà été traitée.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Le traitement de la candidature a échoué, veuillez réessayer.');
        }
      },
    });
  }
}
