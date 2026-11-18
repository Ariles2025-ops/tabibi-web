import { Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { ActionEnCours, estConfirme, peutHonorer, peutMarquerAbsent, rendezVousAVenir, rendezVousPasses, styleOnglet } from '../medecin/agenda-utils';
import { GestionCreneauxComponent, SourceCreneaux } from '../medecin/gestion-creneaux.component';
import { PatientsService, RepertoirePatients, nomPatient, telephonePatient } from '../medecin/patients.service';
import { LangueService } from '../partage/langue.service';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { libelleStatutRendezVous } from '../rendezvous/statut-rendez-vous';
import { Rattachement, SecretaireService } from './secretaire.service';

/**
 * Espace secretaire (role SECRETAIRE) : choix du medecin parmi mes rattachements (GET /api/secretaire/medecins),
 * puis son agenda (GET /api/secretaire/medecins/{id}/rendezvous) a venir ou passe, par jour, avec le nom des
 * patients, « Marquer honoré » ou « Patient absent » (rendez-vous commence) et « Annuler » confirme dans la page
 * (POST /api/secretaire/rendezvous/{id}/honorer | annuler), et la gestion des creneaux du medecin (ouverture,
 * liste a venir, suppression des creneaux libres).
 */
@Component({
    selector: 'app-espace-secretaire',
    imports: [CommonModule, FormsModule, GestionCreneauxComponent],
    template: `
    <main style="max-width:760px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--blue);margin:0 0 8px">Espace secrétaire</h1>
      <p style="color:var(--text3);margin:0 0 20px">
        Choisissez le cabinet pour lequel vous intervenez : vous consultez son agenda, ouvrez des créneaux et marquez
        les rendez-vous honorés ou annulés. Le patient ayant un compte est prévenu de chaque annulation ; pour un rendez-vous pris par téléphone (📞), prévenez-le vous-même.
      </p>

      <p *ngIf="charge()" style="color:var(--text3)">Chargement…</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <label *ngIf="rattachements().length > 0" style="display:grid;gap:4px;color:var(--text3);font-size:.9rem;max-width:360px;margin:0 0 24px">
        Médecin
        <select class="champ" [ngModel]="medecinId()" (ngModelChange)="choisir($event)" name="medecinId" style="color:var(--ink);font-size:1rem">
          <option value="">Choisir un médecin</option>
          <option *ngFor="let r of rattachements()" [value]="r.medecinId">{{ nomMedecin(r.medecinId) }}</option>
        </select>
      </label>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">
        Aucun médecin ne vous a encore rattachée à son cabinet. Communiquez-lui l'adresse e-mail de votre compte Ndawik.
      </p>

      <ng-container *ngIf="medecinId()">
        <h2 style="font-size:1.1rem;margin:0 0 12px;color:var(--ink)">Agenda</h2>
        <div role="tablist" style="display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap">
          <button type="button" role="tab" [attr.aria-selected]="vue() === 'avenir'" (click)="vue.set('avenir')"
                  [ngStyle]="ongletStyle(vue() === 'avenir')">À venir ({{ nombreAVenir() }})</button>
          <button type="button" role="tab" [attr.aria-selected]="vue() === 'passes'" (click)="vue.set('passes')"
                  [ngStyle]="ongletStyle(vue() === 'passes')">Passés ({{ nombrePasses() }})</button>
        </div>
        <p *ngIf="chargeAgenda()" style="color:var(--text3)">Chargement…</p>
        <p *ngIf="erreurAgenda()" role="alert" style="color:var(--red)">{{ erreurAgenda() }}</p>
        <p *ngIf="succes()" style="color:var(--blue)">{{ succes() }}</p>

        <section *ngFor="let j of jours()" style="margin:0 0 20px">
          <h3 style="font-size:.95rem;margin:0 0 8px;color:var(--text2);text-transform:capitalize">{{ j.debut | date:'EEEE d MMMM yyyy' }}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
            <li *ngFor="let r of j.elements" class="rendez-vous"
                style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <strong style="color:var(--ink)">{{ r.debut | date:'HH:mm' }}</strong>
                <span class="badge-statut" [style.background]="r.statut === 'ABSENT' ? 'var(--red-l)' : 'var(--blue-l)'" [style.color]="r.statut === 'ABSENT' ? 'var(--red)' : 'var(--blue-d)'"
                      style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:6px">{{ libelleStatut(r.statut) }}</span><br>
                <span style="color:var(--text2)">{{ r.nomPatient || nom(r.patientId) }}</span>
                <span *ngIf="r.source === 'TELEPHONE'" style="margin-left:6px;color:var(--text3);font-size:.8rem">📞</span>
                <a *ngIf="r.telephonePatient || telephone(r.patientId) as tel" [href]="'tel:' + tel" style="color:var(--text3);margin-left:8px;text-decoration:none">{{ tel }}</a>
              </div>
              <div *ngIf="estConfirme(r) && aConfirmer() === r.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span style="color:var(--text2);font-size:.9rem">Annuler ce rendez-vous ?<ng-container *ngIf="r.source !== 'TELEPHONE'; else prevenirParTelephone"> Le patient sera prévenu.</ng-container><ng-template #prevenirParTelephone> Pensez à prévenir le patient par téléphone.</ng-template></span>
                <button type="button" class="bouton" (click)="annuler(r)" [disabled]="enCours() !== null">
                  {{ estEnCours(r, 'annuler') ? 'Annulation…' : 'Oui' }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">Non</button>
              </div>
              <div *ngIf="estConfirme(r) && absentAConfirmer() === r.id" class="confirmation-absent" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span style="color:var(--text2);font-size:.9rem">Signaler le patient absent à ce rendez-vous ?</span>
                <button type="button" class="bouton" (click)="marquerAbsent(r)" [disabled]="enCours() !== null">
                  {{ estEnCours(r, 'absent') ? 'Enregistrement…' : 'Oui' }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="absentAConfirmer.set(null)" [disabled]="enCours() !== null">Non</button>
              </div>
              <div *ngIf="estConfirme(r) && aConfirmer() !== r.id && absentAConfirmer() !== r.id" style="display:flex;gap:8px;flex-wrap:wrap">
                <button *ngIf="peutHonorer(r)" type="button" class="bouton" (click)="honorer(r)" [disabled]="enCours() !== null">
                  {{ estEnCours(r, 'honorer') ? 'Enregistrement…' : 'Marquer honoré' }}
                </button>
                <button *ngIf="peutMarquerAbsent(r)" type="button" class="bouton-secondaire" (click)="aConfirmer.set(null); absentAConfirmer.set(r.id)"
                        [disabled]="enCours() !== null">
                  Patient absent
                </button>
                <button type="button" (click)="absentAConfirmer.set(null); aConfirmer.set(r.id)" [disabled]="enCours() !== null"
                        style="padding:11px 18px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
                  Annuler
                </button>
              </div>
            </li>
          </ul>
        </section>
        <p *ngIf="!chargeAgenda() && !erreurAgenda() && jours().length === 0" style="color:var(--text3)">
          {{ vue() === 'avenir' ? 'Aucun rendez-vous à venir dans cet agenda.' : 'Aucun rendez-vous passé dans cet agenda.' }}
        </p>

        <h2 style="font-size:1.1rem;margin:28px 0 12px;color:var(--ink)">Créneaux</h2>
        <app-gestion-creneaux [source]="sourceCreneaux()" message403="Ce cabinet ne vous est pas rattaché." (rdvPris)="chargerAgenda()" />
      </ng-container>
    </main>
  `
})
export class EspaceSecretaireComponent implements OnInit {
  private auth = inject(AuthService);
  private langue = inject(LangueService);
  private service = inject(SecretaireService);
  private annuaire = inject(AnnuaireService);
  private patients = inject(PatientsService);
  private locale = inject(LOCALE_ID);

  rattachements = signal<Rattachement[]>([]);
  /** Nom complet des medecins (annuaire), par identifiant ; a defaut, un identifiant abrege est affiche. */
  noms = signal<Partial<Record<string, string>>>({});
  /** Medecin choisi ; chaine vide tant qu'aucun ne l'est. */
  medecinId = signal('');
  rendezVous = signal<RendezVous[]>([]);
  repertoire = signal<RepertoirePatients>(new Map());
  maintenant = signal(Date.now());
  vue = signal<'avenir' | 'passes'>('avenir');
  private aVenir = computed(() => rendezVousAVenir(this.rendezVous(), this.maintenant()));
  private passes = computed(() => rendezVousPasses(this.rendezVous(), this.maintenant()));
  jours = computed(() => (this.vue() === 'avenir' ? this.aVenir() : this.passes()));
  nombreAVenir = computed(() => this.aVenir().reduce((n, j) => n + j.elements.length, 0));
  nombrePasses = computed(() => this.passes().reduce((n, j) => n + j.elements.length, 0));
  charge = signal(false);
  chargeAgenda = signal(false);
  /** Action en cours : seul le bouton clique affiche « … ». */
  enCours = signal<ActionEnCours | null>(null);
  /** Rendez-vous dont l'annulation attend la confirmation (Oui / Non). */
  aConfirmer = signal<string | null>(null);
  /** Rendez-vous dont le signalement « patient absent » attend la confirmation (Oui / Non). */
  absentAConfirmer = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');
  erreurAgenda = signal('');

  /** Creneaux du medecin choisi, via les routes secretaire. */
  sourceCreneaux = computed<SourceCreneaux>(() => {
    const medecinId = this.medecinId();
    return {
      lister: () => this.service.creneaux(medecinId),
      ouvrir: (debut, duree) => this.service.ouvrirCreneau(medecinId, debut, duree),
      supprimer: (id) => this.service.supprimerCreneau(medecinId, id),
      semaineType: (corps) => this.service.semaineType(medecinId, corps),
      rdvTelephone: (corps) => this.service.prendreRdvTelephone(medecinId, corps),
    };
  });

  ngOnInit() {
    // Page non traduite : pas de page mi-arabe mi-francaise, meme si l'arabe a ete choisi ailleurs.
    this.langue.forcerFrancais();
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

  /** Choix du medecin : l'agenda et ses patients sont recharges, les messages effaces. */
  choisir(medecinId: string) {
    this.medecinId.set(medecinId);
    this.rendezVous.set([]);
    this.repertoire.set(new Map());
    this.succes.set('');
    this.erreurAgenda.set('');
    this.aConfirmer.set(null);
    this.absentAConfirmer.set(null);
    if (!medecinId) return;
    this.chargerAgenda();
    this.patients.patientsDuCabinet(medecinId).subscribe({
      next: (r) => {
        if (this.medecinId() === medecinId) this.repertoire.set(r);
      },
      error: () => undefined,
    });
  }

  nomMedecin(medecinId: string): string {
    return this.noms()[medecinId] ?? `Médecin ${abregerIdentifiant(medecinId)}`;
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId);
  }

  telephone(patientId: string): string {
    return telephonePatient(this.repertoire(), patientId);
  }

  /** CONFIRME ou RESERVE : actions proposees (voir agenda-utils). */
  estConfirme = estConfirme;

  peutHonorer(r: RendezVous): boolean {
    return peutHonorer(r, Date.now());
  }

  peutMarquerAbsent(r: RendezVous): boolean {
    return peutMarquerAbsent(r, Date.now());
  }

  estEnCours(r: RendezVous, action: string): boolean {
    const e = this.enCours();
    return e !== null && e.id === r.id && e.action === action;
  }

  ongletStyle(actif: boolean): Record<string, string> {
    return styleOnglet(actif);
  }

  /** Recharge l'agenda du medecin choisi ; `motif` est un message d'erreur a conserver (rendez-vous modifie ailleurs). */
  chargerAgenda(motif = '') {
    const medecinId = this.medecinId();
    this.chargeAgenda.set(true);
    this.erreurAgenda.set(motif);
    this.service.agenda(medecinId).subscribe({
      next: (liste) => {
        if (this.medecinId() !== medecinId) return; // le medecin a change entre-temps
        this.maintenant.set(Date.now());
        this.rendezVous.set(liste);
        this.chargeAgenda.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargeAgenda.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurAgenda.set('Ce cabinet ne vous est pas rattaché.');
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? "Impossible de charger l'agenda.");
        }
      },
    });
  }

  honorer(rdv: RendezVous) {
    this.agir(rdv, 'honorer', this.service.honorer(rdv.id), `Rendez-vous du ${this.formaterDate(rdv.debut)} marqué honoré.`);
  }

  /** Annulation apres « Oui » : le creneau est remis a disposition et le patient prevenu. */
  annuler(rdv: RendezVous) {
    this.agir(rdv, 'annuler', this.service.annuler(rdv.id), `Rendez-vous du ${this.formaterDate(rdv.debut)} annulé : ${rdv.source === 'TELEPHONE' ? 'le créneau est de nouveau proposé.' : 'le patient est prévenu.'}`);
  }

  /** Patient absent, apres « Oui » (POST /api/secretaire/rendezvous/{id}/absent). */
  marquerAbsent(rdv: RendezVous) {
    this.agir(rdv, 'absent', this.service.marquerAbsent(rdv.id), `Patient signalé absent au rendez-vous du ${this.formaterDate(rdv.debut)}.`);
  }

  libelleStatut(statut: string): string {
    return libelleStatutRendezVous(statut);
  }

  /** Applique une action sur un rendez-vous puis recharge l'agenda ; 409 (pas encore commence, plus confirme) affiche le motif et recharge. */
  private agir(rdv: RendezVous, action: string, appel: ReturnType<SecretaireService['honorer']>, message: string) {
    this.enCours.set({ id: rdv.id, action });
    this.succes.set('');
    this.erreurAgenda.set('');
    appel.subscribe({
      next: () => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        this.absentAConfirmer.set(null);
        this.succes.set(message);
        this.chargerAgenda();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        this.absentAConfirmer.set(null);
        if (e.status === 409 || e.status === 404) {
          this.chargerAgenda(e.error?.erreur ?? "Ce rendez-vous n'est plus confirmé.");
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurAgenda.set('Ce cabinet ne vous est pas rattaché.');
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? 'La mise à jour du rendez-vous a échoué, veuillez réessayer.');
        }
      },
    });
  }

  private formaterDate(iso: string): string {
    return formatDate(iso, 'EEEE d MMMM à HH:mm', this.locale, '+0100');
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
