import { Component, LOCALE_ID, OnInit, inject, signal } from '@angular/core';
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
  imports: [CommonModule, FormsModule],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Espace secrétaire</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Choisissez le cabinet pour lequel vous intervenez : vous consultez son agenda, ouvrez des créneaux et marquez
        les rendez-vous honorés ou annulés. Le patient est prévenu de chaque annulation.
      </p>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <label *ngIf="rattachements().length > 0" style="display:grid;gap:4px;color:#566b64;font-size:.9rem;max-width:360px;margin:0 0 24px">
        Médecin
        <select class="champ" [ngModel]="medecinId()" (ngModelChange)="choisir($event)" name="medecinId" style="color:#10241F;font-size:1rem">
          <option value="">Choisir un médecin</option>
          <option *ngFor="let r of rattachements()" [value]="r.medecinId">{{ nomMedecin(r.medecinId) }}</option>
        </select>
      </label>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">
        Aucun médecin ne vous a encore rattachée à son cabinet. Communiquez-lui l'identifiant de votre compte (visible
        dans Mon compte).
      </p>

      <ng-container *ngIf="medecinId()">
        <section style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;margin:0 0 24px;background:#f8faf9">
          <h2 style="font-size:1.1rem;margin:0 0 12px">Ouvrir un créneau</h2>
          <form (ngSubmit)="ouvrir()" #f="ngForm" style="display:grid;gap:12px;max-width:360px">
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Date et heure
              <input class="champ" type="datetime-local" [(ngModel)]="debut" name="debut" required [min]="minDebut"
                     style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Durée (minutes, de {{ dureeMin }} à {{ dureeMax }})
              <input class="champ" type="number" [(ngModel)]="dureeMinutes" name="dureeMinutes" required [min]="dureeMin" [max]="dureeMax" step="5"
                     style="color:#10241F;font-size:1rem">
            </label>
            <div>
              <button type="submit" class="bouton" [disabled]="f.invalid || ouvertureEnCours()">
                {{ ouvertureEnCours() ? 'Ouverture…' : 'Ouvrir le créneau' }}
              </button>
            </div>
          </form>
          <p *ngIf="creneauOuvert() as c" style="color:var(--vert);margin:12px 0 0">
            Créneau ouvert le {{ c.debut | date:'EEEE d MMMM à HH:mm' }} ({{ c.dureeMinutes }} min).
          </p>
          <p *ngIf="erreurCreneau()" style="color:#b3261e;margin:12px 0 0">{{ erreurCreneau() }}</p>
        </section>

        <h2 style="font-size:1.1rem;margin:0 0 12px">Agenda</h2>
        <p *ngIf="chargeAgenda()">Chargement…</p>
        <p *ngIf="erreurAgenda()" style="color:#b3261e">{{ erreurAgenda() }}</p>
        <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let r of rendezVous()"
              style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>{{ r.debut | date:'EEEE d MMMM à HH:mm' }}</strong>
              <span style="color:#566b64"> · {{ libelleStatut(r.statut) }}</span><br>
              <span style="color:#566b64">Patient {{ abreger(r.patientId) }}</span>
            </div>
            <div *ngIf="r.statut === 'CONFIRME'" style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="bouton" (click)="honorer(r)" [disabled]="enCours() !== null">
                {{ enCours() === r.id ? 'Enregistrement…' : 'Marquer honoré' }}
              </button>
              <button type="button" (click)="annuler(r)" [disabled]="enCours() !== null"
                      style="padding:10px 16px;background:#fff;color:#b3261e;border:1px solid #b3261e;border-radius:8px;font:inherit;cursor:pointer">
                {{ enCours() === r.id ? 'Annulation…' : 'Annuler' }}
              </button>
            </div>
          </li>
        </ul>
        <p *ngIf="!chargeAgenda() && !erreurAgenda() && rendezVous().length === 0">Aucun rendez-vous dans cet agenda pour le moment.</p>
      </ng-container>
    </main>
  `,
})
export class EspaceSecretaireComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(SecretaireService);
  private annuaire = inject(AnnuaireService);
  private locale = inject(LOCALE_ID);

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
  minDebut = formatDate(new Date(), "yyyy-MM-dd'T'HH:mm", this.locale);

  ngOnInit() {
    this.seo.definirPrivee('Espace secrétaire');
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
          this.erreur.set('Cette page est réservée aux secrétaires.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos cabinets.');
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
    return this.noms()[medecinId] ?? `Médecin ${abregerIdentifiant(medecinId)}`;
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
          this.erreurAgenda.set("Ce cabinet ne vous est pas rattaché.");
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? "Impossible de charger l'agenda.");
        }
      },
    });
  }

  honorer(rdv: RendezVous) {
    this.agir(rdv, this.service.honorer(rdv.id), `Rendez-vous du ${this.formaterDate(rdv.debut)} marqué honoré.`);
  }

  annuler(rdv: RendezVous) {
    if (!confirm('Annuler ce rendez-vous ? Le patient sera prévenu et le créneau de nouveau proposé.')) return;
    this.agir(rdv, this.service.annuler(rdv.id), `Rendez-vous du ${this.formaterDate(rdv.debut)} annulé : le patient est prévenu.`);
  }

  /** Ouvre un creneau dans l'agenda du medecin choisi (heure locale convertie en ISO 8601 UTC, duree 5..120). */
  ouvrir() {
    const debut = new Date(this.debut);
    const dureeMinutes = Number(this.dureeMinutes);
    this.creneauOuvert.set(null);
    this.erreurCreneau.set('');
    if (!this.debut || Number.isNaN(debut.getTime())) {
      this.erreurCreneau.set('Indiquez une date et une heure valides.');
      return;
    }
    if (debut.getTime() <= Date.now()) {
      this.erreurCreneau.set('Le créneau doit commencer dans le futur.');
      return;
    }
    if (!Number.isInteger(dureeMinutes) || dureeMinutes < DUREE_MIN_MINUTES || dureeMinutes > DUREE_MAX_MINUTES) {
      this.erreurCreneau.set(`Indiquez une durée entre ${DUREE_MIN_MINUTES} et ${DUREE_MAX_MINUTES} minutes.`);
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
          this.erreurCreneau.set("Ce cabinet ne vous est pas rattaché.");
        } else if (e.status === 400) {
          this.erreurCreneau.set(e.error?.erreur ?? 'Le créneau est invalide.');
        } else {
          this.erreurCreneau.set(e.error?.erreur ?? "L'ouverture du créneau a échoué, veuillez réessayer.");
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut);
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
          this.chargerAgenda(e.error?.erreur ?? "Ce rendez-vous n'est plus confirmé.");
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurAgenda.set("Ce cabinet ne vous est pas rattaché.");
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? 'La mise à jour du rendez-vous a échoué, veuillez réessayer.');
        }
      },
    });
  }

  private formaterDate(iso: string): string {
    return formatDate(iso, 'EEEE d MMMM à HH:mm', this.locale);
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
