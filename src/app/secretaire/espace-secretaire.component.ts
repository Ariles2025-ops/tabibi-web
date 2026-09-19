import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { libelleStatutRendezVous } from '../rendezvous/statut-rendez-vous';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES, Rattachement, SecretaireService } from './secretaire.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { Traducteur } from '../i18n/traducteur';
import { TraductionService } from '../i18n/traduction.service';

/** Creneau que la secretaire vient d'ouvrir (message de confirmation). */
interface CreneauOuvert {
  debut: string;
  dureeMinutes: number;
}

/**
 * Espace secretaire (role SECRETAIRE) : choix du medecin parmi mes rattachements (GET /api/secretaire/medecins),
 * puis son agenda (GET /api/secretaire/medecins/{id}/rendezvous) avec « Marquer honore » et « Annuler »
 * (POST /api/secretaire/rendezvous/{id}/honorer | annuler) et l'ouverture d'un creneau
 * (POST /api/secretaire/medecins/{id}/creneaux { debut, dureeMinutes }).
 */
@Component({
  selector: 'app-espace-secretaire',
  standalone: true,
  imports: [CommonModule, FormsModule, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'espaceSecretaire.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'espaceSecretaire.intro' | t }}</p>

      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <label *ngIf="rattachements().length > 0" style="display:grid;gap:4px;color:#566b64;font-size:.9rem;max-width:360px;margin:0 0 24px">
        {{ 'espaceSecretaire.medecin' | t }}
        <select class="champ" [ngModel]="medecinId()" (ngModelChange)="choisir($event)" name="medecinId" style="color:#10241F;font-size:1rem">
          <option value="">{{ 'espaceSecretaire.choisirMedecin' | t }}</option>
          <option *ngFor="let r of rattachements()" [value]="r.medecinId">{{ nomMedecin(r.medecinId) }}</option>
        </select>
      </label>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">
        {{ 'espaceSecretaire.aucunRattachement' | t }}
      </p>

      <ng-container *ngIf="medecinId()">
        <section style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;margin:0 0 24px;background:#f8faf9">
          <h2 style="font-size:1.1rem;margin:0 0 12px">{{ 'espaceSecretaire.ouvrirCreneau' | t }}</h2>
          <form (ngSubmit)="ouvrir()" #f="ngForm" style="display:grid;gap:12px;max-width:360px">
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              {{ 'disponibilites.dateHeure' | t }}
              <input class="champ" type="datetime-local" [(ngModel)]="debut" name="debut" required [min]="minDebut"
                     style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              {{ 'disponibilites.duree' | t:{ min: dureeMin, max: dureeMax } }}
              <input class="champ" type="number" [(ngModel)]="dureeMinutes" name="dureeMinutes" required [min]="dureeMin" [max]="dureeMax" step="5"
                     style="color:#10241F;font-size:1rem">
            </label>
            <div>
              <button type="submit" class="bouton" [disabled]="f.invalid || ouvertureEnCours()">
                {{ (ouvertureEnCours() ? 'disponibilites.ouverture' : 'disponibilites.ouvrir') | t }}
              </button>
            </div>
          </form>
          <p *ngIf="creneauOuvert() as c" style="color:var(--vert);margin:12px 0 0">
            {{ 'disponibilites.creneauOuvert' | t:{ date: (c.debut | dateLocale:'jourHeure'), duree: c.dureeMinutes } }}
          </p>
          <p *ngIf="erreurCreneau()" style="color:#b3261e;margin:12px 0 0">{{ erreurCreneau() }}</p>
        </section>

        <h2 style="font-size:1.1rem;margin:0 0 12px">{{ 'agenda.titre' | t }}</h2>
        <p *ngIf="chargeAgenda()">{{ 'commun.chargement' | t }}</p>
        <p *ngIf="erreurAgenda()" style="color:#b3261e">{{ erreurAgenda() }}</p>
        <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let r of rendezVous()"
              style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ r.debut | dateLocale:'jourHeure' }}</strong>
              <span style="color:#566b64"> · {{ libelleStatut(r.statut) }}</span><br>
              <span style="color:#566b64">{{ 'commun.patient' | t:{ id: abreger(r.patientId) } }}</span>
            </div>
            <div *ngIf="r.statut === 'CONFIRME'" style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="bouton" (click)="honorer(r)" [disabled]="enCours() !== null">
                {{ (enCours() === r.id ? 'commun.enregistrement' : 'agenda.marquerHonore') | t }}
              </button>
              <button type="button" (click)="annuler(r)" [disabled]="enCours() !== null"
                      style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
                {{ (enCours() === r.id ? 'commun.annulation' : 'commun.annuler') | t }}
              </button>
            </div>
          </li>
        </ul>
        <p *ngIf="!chargeAgenda() && !erreurAgenda() && rendezVous().length === 0">{{ 'espaceSecretaire.aucunRendezVous' | t }}</p>
      </ng-container>
    </main>
  `,
})
export class EspaceSecretaireComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(SecretaireService);
  private annuaire = inject(AnnuaireService);
  private i18n = inject(TraductionService);
  /** Traducteur de la langue courante, passe aux fonctions de libelles de statut. */
  private traduire: Traducteur = (cle, params) => this.i18n.t(cle, params);

  rattachements = signal<Rattachement[]>([]);
  /** Nom complet des medecins (annuaire), par identifiant ; a defaut, un identifiant abrege est affiche. */
  noms = signal<Partial<Record<string, string>>>({});
  /** Medecin choisi ; chaine vide tant qu'aucun ne l'est. */
  medecinId = signal('');
  rendezVous = signal<RendezVous[]>([]);
  charge = signal(false);
  chargeAgenda = signal(false);
  /** Identifiant du rendez-vous en cours de mise a jour. */
  enCours = signal<string | null>(null);
  ouvertureEnCours = signal(false);
  creneauOuvert = signal<CreneauOuvert | null>(null);
  succes = signal('');
  erreur = signal('');
  erreurAgenda = signal('');
  erreurCreneau = signal('');

  /** Valeur du champ datetime-local : heure locale sans fuseau (« 2026-09-21T09:30 »). */
  debut = '';
  dureeMinutes = 30;
  dureeMin = DUREE_MIN_MINUTES;
  dureeMax = DUREE_MAX_MINUTES;
  /** Borne basse du selecteur : maintenant, au format attendu par datetime-local. */
  minDebut = formatDate(new Date(), "yyyy-MM-dd'T'HH:mm", this.i18n.locale());

  ngOnInit() {
    this.seo.definirPrivee('seo.espaceSecretaire');
    this.charge.set(true);
    this.service.mesMedecins().subscribe({
      next: (liste) => {
        this.rattachements.set([...liste].sort((a, b) => Date.parse(a.creeLe) - Date.parse(b.creeLe)));
        this.chargerNoms(liste);
        this.charge.set(false);
        // Un seul cabinet : il est choisi d'office.
        if (liste.length === 1) this.choisir(liste[0].medecinId);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveSecretaires'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('espaceSecretaire.erreurChargement'));
        }
      },
    });
  }

  /** Choix du medecin : l'agenda est recharge, les messages effaces. */
  choisir(medecinId: string) {
    this.medecinId.set(medecinId);
    this.rendezVous.set([]);
    this.succes.set('');
    this.erreurAgenda.set('');
    this.erreurCreneau.set('');
    this.creneauOuvert.set(null);
    if (medecinId) this.chargerAgenda();
  }

  nomMedecin(medecinId: string): string {
    return this.noms()[medecinId] ?? this.i18n.t('commun.medecinAbrege', { id: abregerIdentifiant(medecinId) });
  }

  /** Recharge l'agenda du medecin choisi ; `motif` est un message d'erreur a conserver (rendez-vous modifie ailleurs). */
  chargerAgenda(motif = '') {
    const medecinId = this.medecinId();
    this.chargeAgenda.set(true);
    this.erreurAgenda.set(motif);
    this.service.agenda(medecinId).subscribe({
      next: (liste) => {
        if (this.medecinId() !== medecinId) return; // le medecin a change entre-temps
        this.rendezVous.set([...liste].sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)));
        this.chargeAgenda.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargeAgenda.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurAgenda.set(this.i18n.t('espaceSecretaire.cabinetNonRattache'));
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? this.i18n.t('agenda.erreurChargement'));
        }
      },
    });
  }

  honorer(rdv: RendezVous) {
    this.agir(rdv, this.service.honorer(rdv.id), this.i18n.t('espaceSecretaire.honore', { date: this.formaterDate(rdv.debut) }));
  }

  annuler(rdv: RendezVous) {
    if (!confirm(this.i18n.t('agenda.confirmerAnnulation'))) return;
    this.agir(rdv, this.service.annuler(rdv.id), this.i18n.t('espaceSecretaire.annule', { date: this.formaterDate(rdv.debut) }));
  }

  /** Ouvre un creneau dans l'agenda du medecin choisi (heure locale convertie en ISO 8601 UTC, duree 5..120). */
  ouvrir() {
    const debut = new Date(this.debut);
    const dureeMinutes = Number(this.dureeMinutes);
    this.creneauOuvert.set(null);
    this.erreurCreneau.set('');
    if (!this.debut || Number.isNaN(debut.getTime())) {
      this.erreurCreneau.set(this.i18n.t('disponibilites.dateInvalide'));
      return;
    }
    if (debut.getTime() <= Date.now()) {
      this.erreurCreneau.set(this.i18n.t('disponibilites.futur'));
      return;
    }
    if (!Number.isInteger(dureeMinutes) || dureeMinutes < DUREE_MIN_MINUTES || dureeMinutes > DUREE_MAX_MINUTES) {
      this.erreurCreneau.set(this.i18n.t('disponibilites.dureeInvalide', { min: DUREE_MIN_MINUTES, max: DUREE_MAX_MINUTES }));
      return;
    }
    const debutIso = debut.toISOString();
    this.ouvertureEnCours.set(true);
    this.service.ouvrirCreneau(this.medecinId(), debutIso, dureeMinutes).subscribe({
      next: () => {
        this.ouvertureEnCours.set(false);
        this.creneauOuvert.set({ debut: debutIso, dureeMinutes });
      },
      error: (e: HttpErrorResponse) => {
        this.ouvertureEnCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurCreneau.set(this.i18n.t('espaceSecretaire.cabinetNonRattache'));
        } else if (e.status === 400) {
          this.erreurCreneau.set(e.error?.erreur ?? this.i18n.t('espaceSecretaire.creneauInvalide'));
        } else {
          this.erreurCreneau.set(e.error?.erreur ?? this.i18n.t('disponibilites.ouvertureEchec'));
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut, this.traduire);
  }

  abreger(id: string): string {
    return abregerIdentifiant(id);
  }

  /** Applique une action sur un rendez-vous puis recharge l'agenda ; 409 (plus confirme) affiche le motif et recharge. */
  private agir(rdv: RendezVous, appel: ReturnType<SecretaireService['honorer']>, message: string) {
    this.enCours.set(rdv.id);
    this.succes.set('');
    this.erreurAgenda.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set(message);
        this.chargerAgenda();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409 || e.status === 404) {
          this.chargerAgenda(e.error?.erreur ?? this.i18n.t('agenda.plusConfirme'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurAgenda.set(this.i18n.t('espaceSecretaire.cabinetNonRattache'));
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? this.i18n.t('agenda.majEchec'));
        }
      },
    });
  }

  private formaterDate(iso: string): string {
    return formatDate(iso, this.i18n.t('format.jourHeure'), this.i18n.locale());
  }

  /** Recupere (une seule fois par medecin) le nom des praticiens rattaches ; un echec laisse l'identifiant abrege. */
  private chargerNoms(liste: Rattachement[]) {
    const ids = new Set(liste.map((r) => r.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }
}
