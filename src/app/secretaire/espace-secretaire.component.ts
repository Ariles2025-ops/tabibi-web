import { Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { DeplacerRendezVousComponent } from '../rendezvous/deplacer-rendez-vous.component';
import { AnnuaireService, Creneau } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { ActionEnCours, estConfirme, peutAnnulerCabinet, peutHonorer, peutMarquerAbsent, rendezVousAVenir, rendezVousPasses, styleOnglet } from '../medecin/agenda-utils';
import { GestionCreneauxComponent, SourceCreneaux } from '../medecin/gestion-creneaux.component';
import { PatientsService, RepertoirePatients, nomPatient, telephonePatient } from '../medecin/patients.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { estAbsent, libelleStatutRendezVous, libelleStatutRendezVousAr } from '../rendezvous/statut-rendez-vous';
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
    imports: [CommonModule, FormsModule, GestionCreneauxComponent, DeplacerRendezVousComponent, SelecteurLangueComponent],
    template: `
    <main style="max-width:760px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 8px">
        <h1 style="color:var(--blue);margin:0">{{ l.t('Espace secrétaire', 'فضاء السكرتارية') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Choisissez le cabinet pour lequel vous intervenez : vous consultez son agenda, ouvrez des créneaux et marquez les rendez-vous honorés ou annulés. Le patient ayant un compte est prévenu de chaque annulation ; pour un rendez-vous pris par téléphone (📞), prévenez-le vous-même.',
           'اختاري العيادة التي تعملين لديها: يمكنك الاطلاع على مواعيدها وفتح مواعيد جديدة وتسجيل المواعيد المنجَزة أو الملغاة. يتم إعلام المريض صاحب الحساب بكل إلغاء؛ أما الموعد المحجوز عبر الهاتف (📞) فأعلميه بنفسك.') }}
      </p>

      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <label *ngIf="rattachements().length > 0" style="display:grid;gap:4px;color:var(--text3);font-size:.9rem;max-width:360px;margin:0 0 24px">
        {{ l.t('Médecin', 'الطبيب') }}
        <select class="champ" [ngModel]="medecinId()" (ngModelChange)="choisir($event)" name="medecinId" style="color:var(--ink);font-size:1rem">
          <option value="">{{ l.t('Choisir un médecin', 'اختيار طبيب') }}</option>
          <option *ngFor="let r of rattachements()" [value]="r.medecinId">{{ nomMedecin(r.medecinId) }}</option>
        </select>
      </label>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">
        {{ l.t("Aucun médecin ne vous a encore rattachée à son cabinet. Communiquez-lui l'adresse e-mail de votre compte Ndawik.", 'لم يربطك أي طبيب بعيادته بعد. أعطيه عنوان البريد الإلكتروني لحسابك في نداويك.') }}
      </p>

      <ng-container *ngIf="medecinId()">
        <h2 style="font-size:1.1rem;margin:0 0 12px;color:var(--ink)">{{ l.t('Agenda', 'المواعيد') }}</h2>
        <div role="tablist" style="display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap">
          <button type="button" role="tab" [attr.aria-selected]="vue() === 'avenir'" (click)="vue.set('avenir')"
                  [ngStyle]="ongletStyle(vue() === 'avenir')">{{ l.t('À venir', 'القادمة') }} ({{ nombreAVenir() }})</button>
          <button type="button" role="tab" [attr.aria-selected]="vue() === 'passes'" (click)="vue.set('passes')"
                  [ngStyle]="ongletStyle(vue() === 'passes')">{{ l.t('Passés', 'السابقة') }} ({{ nombrePasses() }})</button>
        </div>
        <p *ngIf="chargeAgenda()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreurAgenda()" role="alert" style="color:var(--red)">{{ erreurAgenda() }}</p>
        <p *ngIf="succes()" style="color:var(--blue)">{{ succes() }}</p>

        <section *ngFor="let j of jours()" style="margin:0 0 20px">
          <h3 style="font-size:.95rem;margin:0 0 8px;color:var(--text2);text-transform:capitalize">{{ j.debut | date:(l.ar() ? 'dd/MM/yyyy' : 'EEEE d MMMM yyyy') }}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
            <li *ngFor="let r of j.elements" class="rendez-vous"
                style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <strong style="color:var(--ink)">{{ r.debut | date:'HH:mm' }}</strong>
                <span class="badge-statut" [style.background]="estAbsent(r.statut) ? 'var(--red-l)' : 'var(--blue-l)'" [style.color]="estAbsent(r.statut) ? 'var(--red)' : 'var(--blue-d)'"
                      style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;margin-inline-start:6px">{{ libelleStatut(r.statut) }}</span><br>
                <span style="color:var(--text2)">{{ r.nomPatient || nom(r.patientId) }}</span>
                <span *ngIf="r.source === 'TELEPHONE'" style="margin-inline-start:6px;color:var(--text3);font-size:.8rem">📞</span>
                <a *ngIf="r.telephonePatient || telephone(r.patientId) as tel" [href]="'tel:' + tel" style="color:var(--text3);margin-inline-start:8px;text-decoration:none" dir="ltr">{{ tel }}</a>
              </div>
              <div *ngIf="estConfirme(r) && aConfirmer() === r.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span style="color:var(--text2);font-size:.9rem">{{ l.t('Annuler ce rendez-vous ?', 'إلغاء هذا الموعد؟') }}<ng-container *ngIf="r.source !== 'TELEPHONE'; else prevenirParTelephone"> {{ l.t('Le patient sera prévenu.', 'سيتم إعلام المريض.') }}</ng-container><ng-template #prevenirParTelephone> {{ l.t('Pensez à prévenir le patient par téléphone.', 'يرجى إبلاغ المريض هاتفيًا.') }}</ng-template></span>
                <button type="button" class="bouton" (click)="annuler(r)" [disabled]="enCours() !== null">
                  {{ estEnCours(r, 'annuler') ? l.t('Annulation…', 'جارٍ الإلغاء…') : l.t('Oui', 'نعم') }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">{{ l.t('Non', 'لا') }}</button>
              </div>
              <div *ngIf="estConfirme(r) && absentAConfirmer() === r.id" class="confirmation-absent" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span style="color:var(--text2);font-size:.9rem">{{ l.t('Signaler le patient absent à ce rendez-vous ?', 'تسجيل غياب المريض عن هذا الموعد؟') }}</span>
                <button type="button" class="bouton" (click)="marquerAbsent(r)" [disabled]="enCours() !== null">
                  {{ estEnCours(r, 'absent') ? l.t('Enregistrement…', 'جارٍ التسجيل…') : l.t('Oui', 'نعم') }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="absentAConfirmer.set(null)" [disabled]="enCours() !== null">{{ l.t('Non', 'لا') }}</button>
              </div>
              <div *ngIf="estConfirme(r) && aConfirmer() !== r.id && absentAConfirmer() !== r.id" style="display:flex;gap:8px;flex-wrap:wrap">
                <button *ngIf="peutHonorer(r)" type="button" class="bouton" (click)="honorer(r)" [disabled]="enCours() !== null">
                  {{ estEnCours(r, 'honorer') ? l.t('Enregistrement…', 'جارٍ التسجيل…') : l.t('Marquer honoré', 'تسجيل الحضور') }}
                </button>
                <button *ngIf="peutMarquerAbsent(r)" type="button" class="bouton-secondaire" (click)="aConfirmer.set(null); absentAConfirmer.set(r.id)"
                        [disabled]="enCours() !== null">
                  {{ l.t('Patient absent', 'المريض غائب') }}
                </button>
                <button *ngIf="peutDeplacer(r)" type="button" class="bouton-secondaire deplacer-btn" (click)="aDeplacer.set(r.id)" [disabled]="enCours() !== null">{{ l.t('Déplacer', 'نقل') }}</button>
                <button *ngIf="peutAnnulerCabinet(r)" type="button" (click)="absentAConfirmer.set(null); aConfirmer.set(r.id)" [disabled]="enCours() !== null"
                        style="padding:11px 18px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
                  {{ l.t('Annuler', 'إلغاء') }}
                </button>
              </div>
              <app-deplacer-rendez-vous *ngIf="aDeplacer() === r.id" [rendezVous]="r" [arabe]="l.ar()" [avertirPatient]="true" [lister]="listerCreneaux" [deplacer]="deplacerFn"
                (deplace)="apresDeplacement($event)" (annule)="aDeplacer.set(null)" />
            </li>
          </ul>
        </section>
        <p *ngIf="!chargeAgenda() && !erreurAgenda() && jours().length === 0" style="color:var(--text3)">
          {{ vue() === 'avenir' ? l.t('Aucun rendez-vous à venir dans cet agenda.', 'لا توجد مواعيد قادمة في هذا الجدول.') : l.t('Aucun rendez-vous passé dans cet agenda.', 'لا توجد مواعيد سابقة في هذا الجدول.') }}
        </p>

        <h2 style="font-size:1.1rem;margin:28px 0 12px;color:var(--ink)">{{ l.t('Créneaux', 'المواعيد المتاحة') }}</h2>
        <app-gestion-creneaux [source]="sourceCreneaux()" [message403]="l.t('Ce cabinet ne vous est pas rattaché.', 'هذه العيادة غير مرتبطة بحسابك.')" (rdvPris)="chargerAgenda()" />
      </ng-container>
    </main>
  `
})
export class EspaceSecretaireComponent implements OnInit {
  private auth = inject(AuthService);
  l = inject(LangueService);
  private service = inject(SecretaireService);
  private annuaire = inject(AnnuaireService);
  private patients = inject(PatientsService);
  private locale = inject(LOCALE_ID);
  /** Vrai si l'on arrive de l'acceptation d'une invitation (etat de navigation) : la page le confirme, comme l'appli. */
  private invitationAcceptee = inject(Router).getCurrentNavigation()?.extras.state?.['invitationAcceptee'] === true;

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
  /** Rendez-vous dont le panneau « Déplacer » est ouvert. */
  aDeplacer = signal<string | null>(null);
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
    this.charge.set(true);
    this.service.mesMedecins().subscribe({
      next: (liste) => {
        this.rattachements.set([...liste].sort((a, b) => Date.parse(a.creeLe) - Date.parse(b.creeLe)));
        this.chargerNoms(liste);
        this.charge.set(false);
        // Un seul cabinet : il est choisi d'office.
        if (liste.length === 1) this.choisir(liste[0].medecinId);
        if (this.invitationAcceptee) {
          this.succes.set(this.l.t('Invitation acceptée : votre espace secrétaire est ouvert.', 'تم قبول الدعوة: تم فتح فضاء السكرتارية.'));
        }
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux secrétaires.', 'هذه الصفحة مخصّصة للسكرتارية.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos cabinets.', 'تعذّر تحميل عياداتك.'));
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
    this.aDeplacer.set(null);
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
    return this.noms()[medecinId] ?? `${this.l.t('Médecin', 'الطبيب')} ${abregerIdentifiant(medecinId)}`;
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId, this.l.ar());
  }

  telephone(patientId: string): string {
    return telephonePatient(this.repertoire(), patientId);
  }

  /** CONFIRME ou RESERVE : actions proposees (voir agenda-utils). */
  estConfirme = estConfirme;
  estAbsent = estAbsent;

  peutAnnulerCabinet(r: RendezVous): boolean {
    return peutAnnulerCabinet(r, Date.now());
  }

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
          this.erreurAgenda.set(this.l.t('Ce cabinet ne vous est pas rattaché.', 'هذه العيادة غير مرتبطة بحسابك.'));
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? this.l.t("Impossible de charger l'agenda.", 'تعذّر تحميل المواعيد.'));
        }
      },
    });
  }

  honorer(rdv: RendezVous) {
    this.agir(rdv, 'honorer', this.service.honorer(rdv.id), this.l.t(`Rendez-vous du ${this.formaterDate(rdv.debut)} marqué honoré.`, `تم تسجيل حضور المريض للموعد في ${this.formaterDate(rdv.debut)}.`));
  }

  /** Annulation apres « Oui » : le creneau est remis a disposition et le patient prevenu. */
  annuler(rdv: RendezVous) {
    this.agir(rdv, 'annuler', this.service.annuler(rdv.id), this.l.t(`Rendez-vous du ${this.formaterDate(rdv.debut)} annulé : ${rdv.source === 'TELEPHONE' ? 'le créneau est de nouveau proposé.' : 'le patient est prévenu.'}`, `تم إلغاء الموعد في ${this.formaterDate(rdv.debut)}: ${rdv.source === 'TELEPHONE' ? 'الموعد متاح من جديد.' : 'تم إعلام المريض.'}`));
  }

  /** Patient absent, apres « Oui » (POST /api/secretaire/rendezvous/{id}/absent). */
  marquerAbsent(rdv: RendezVous) {
    this.agir(rdv, 'absent', this.service.marquerAbsent(rdv.id), this.l.t(`Patient signalé absent au rendez-vous du ${this.formaterDate(rdv.debut)}.`, `تم تسجيل غياب المريض عن الموعد في ${this.formaterDate(rdv.debut)}.`));
  }

  peutDeplacer(r: RendezVous): boolean {
    return estConfirme(r) && Date.parse(r.debut) > Date.now();
  }

  listerCreneaux = (): Observable<Creneau[]> => this.service.creneaux(this.medecinId());

  deplacerFn = (rdv: RendezVous, creneauId: string) => this.service.deplacer(rdv.id, creneauId);

  apresDeplacement(creneau: Creneau) {
    this.aDeplacer.set(null);
    this.erreurAgenda.set('');
    this.succes.set(this.l.t(`Rendez-vous déplacé au ${this.formaterDate(creneau.debut)}.`, `تم نقل الموعد إلى ${this.formaterDate(creneau.debut)}.`));
    this.chargerAgenda();
  }

  libelleStatut(statut: string): string {
    return this.l.ar() ? libelleStatutRendezVousAr(statut) : libelleStatutRendezVous(statut);
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
          this.chargerAgenda(e.error?.erreur ?? this.l.t("Ce rendez-vous n'est plus confirmé.", 'لم يعد هذا الموعد مؤكدًا.'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurAgenda.set(this.l.t('Ce cabinet ne vous est pas rattaché.', 'هذه العيادة غير مرتبطة بحسابك.'));
        } else {
          this.erreurAgenda.set(e.error?.erreur ?? this.l.t('La mise à jour du rendez-vous a échoué, veuillez réessayer.', 'فشل تحديث الموعد، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  private formaterDate(iso: string): string {
    return this.l.ar() ? formatDate(iso, 'dd/MM/yyyy HH:mm', this.locale, '+0100') : formatDate(iso, 'EEEE d MMMM à HH:mm', this.locale, '+0100');
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
