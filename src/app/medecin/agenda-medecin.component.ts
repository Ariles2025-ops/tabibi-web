import { Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { DeplacerRendezVousComponent } from '../rendezvous/deplacer-rendez-vous.component';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { estAnnule, libelleStatutRendezVous, libelleStatutRendezVousAr } from '../rendezvous/statut-rendez-vous';
import { TeleconsultationService } from '../teleconsultation/teleconsultation.service';
import { VISIO_ACTIVE } from '../lancement';
import { ActionEnCours, estConfirme, peutAnnulerCabinet, peutHonorer, peutMarquerAbsent, peutProposerTeleconsultation, rendezVousAVenir, rendezVousPasses, styleOnglet } from './agenda-utils';
import { MedecinService } from './medecin.service';
import { PatientsService, RepertoirePatients, nomPatient, telephonePatient } from './patients.service';

/**
 * Agenda du medecin : rendez-vous a venir (aujourd'hui d'abord) ou passes (les plus recents d'abord), par jour,
 * avec le nom du patient. Un rendez-vous commence se marque honore ; un rendez-vous confirme s'annule (apres
 * confirmation dans la page) ou recoit une proposition de teleconsultation ; une ordonnance se redige preremplie.
 */
@Component({
    selector: 'app-agenda-medecin',
    imports: [CommonModule, RouterLink, DeplacerRendezVousComponent, SelecteurLangueComponent],
    template: `
    <main style="max-width:760px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--blue);margin:0">{{ l.t('Agenda', 'المواعيد') }}</h1>
        <app-selecteur-langue />
      </div>

      <div role="tablist" style="display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap">
        <button type="button" role="tab" [attr.aria-selected]="vue() === 'avenir'" (click)="vue.set('avenir')"
                [ngStyle]="ongletStyle(vue() === 'avenir')">{{ l.t('À venir', 'القادمة') }} ({{ nombreAVenir() }})</button>
        <button type="button" role="tab" [attr.aria-selected]="vue() === 'passes'" (click)="vue.set('passes')"
                [ngStyle]="ongletStyle(vue() === 'passes')">{{ l.t('Passés', 'السابقة') }} ({{ nombrePasses() }})</button>
      </div>

      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>
      <p *ngIf="teleconsultationProposee() as r" style="color:var(--blue)">
        {{ l.t('Téléconsultation proposée au patient pour le rendez-vous du ' + dateLongue(r.debut) + '.', 'تم اقتراح استشارة عن بُعد على المريض للموعد في ' + dateLongue(r.debut) + '.') }}
        <a routerLink="/medecin/teleconsultations" style="color:var(--blue)">{{ l.t('Voir mes téléconsultations', 'عرض استشاراتي عن بُعد') }}</a>
      </p>
      <p *ngIf="annule() as r" style="color:var(--blue)">
        {{ l.t('Rendez-vous du ' + dateLongue(r.debut) + ' annulé : le créneau est de nouveau proposé', 'تم إلغاء الموعد في ' + dateLongue(r.debut) + ': الموعد متاح من جديد') }}<ng-container *ngIf="r.source !== 'TELEPHONE'">{{ l.t(' et le patient est prévenu', ' وتم إعلام المريض') }}</ng-container>.
      </p>
      <p *ngIf="deplace()" style="color:var(--blue)">{{ deplace() }}</p>
      <p *ngIf="honore() as r" style="color:var(--blue)">
        {{ l.t('Rendez-vous du ' + dateLongue(r.debut) + ' marqué honoré.', 'تم تسجيل حضور المريض للموعد في ' + dateLongue(r.debut) + '.') }}
      </p>
      <p *ngIf="absent() as r" style="color:var(--blue)">
        {{ l.t('Patient signalé absent au rendez-vous du ' + dateLongue(r.debut) + '.', 'تم تسجيل غياب المريض عن الموعد في ' + dateLongue(r.debut) + '.') }}
      </p>

      <section *ngFor="let j of jours()" style="margin:0 0 20px">
        <h2 style="font-size:.95rem;margin:0 0 8px;color:var(--text2);text-transform:capitalize">{{ j.debut | date:(l.ar() ? 'dd/MM/yyyy' : 'EEEE d MMMM yyyy') }}</h2>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let r of j.elements"
              style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);box-shadow:var(--s1);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong style="color:var(--ink)"><i class="fa fa-clock fa-xs" style="color:var(--blue)"></i> {{ r.debut | date:'HH:mm' }}</strong>
              <span class="badge-statut" [style.background]="r.statut === 'ABSENT' ? 'var(--red-l)' : 'var(--blue-l)'" [style.color]="r.statut === 'ABSENT' ? 'var(--red)' : 'var(--blue-d)'"
                    style="display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:6px">{{ libelleStatut(r.statut) }}</span><br>
              <span style="color:var(--text2)"><i class="fa fa-user fa-xs"></i> {{ r.nomPatient || nom(r.patientId) }}</span>
              <a *ngIf="r.telephonePatient || telephone(r.patientId) as tel" [href]="'tel:' + tel" style="color:var(--text3);margin-left:8px;text-decoration:none">
                <i class="fa fa-phone fa-xs"></i> {{ tel }}
              </a>
            </div>

            <div *ngIf="aConfirmer() === r.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span style="color:var(--text2);font-size:.9rem">{{ l.t('Annuler ce rendez-vous ?', 'إلغاء هذا الموعد؟') }}<ng-container *ngIf="r.source !== 'TELEPHONE'; else prevenirParTelephone"> {{ l.t('Le patient sera prévenu.', 'سيتم إعلام المريض.') }}</ng-container><ng-template #prevenirParTelephone> {{ l.t('Pensez à prévenir le patient par téléphone.', 'يرجى إبلاغ المريض هاتفيًا.') }}</ng-template></span>
              <button type="button" class="bouton" (click)="annuler(r)" [disabled]="enCours() !== null">
                {{ estEnCours(r, 'annuler') ? l.t('Annulation…', 'جارٍ الإلغاء…') : l.t('Oui', 'نعم') }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="enCours() !== null">{{ l.t('Non', 'لا') }}</button>
            </div>

            <div *ngIf="absentAConfirmer() === r.id" class="confirmation-absent" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span style="color:var(--text2);font-size:.9rem">{{ l.t('Signaler le patient absent à ce rendez-vous ?', 'تسجيل غياب المريض عن هذا الموعد؟') }}</span>
              <button type="button" class="bouton" (click)="marquerAbsent(r)" [disabled]="enCours() !== null">
                {{ estEnCours(r, 'absent') ? l.t('Enregistrement…', 'جارٍ التسجيل…') : l.t('Oui', 'نعم') }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="absentAConfirmer.set(null)" [disabled]="enCours() !== null">{{ l.t('Non', 'لا') }}</button>
            </div>

            <div *ngIf="aConfirmer() !== r.id && absentAConfirmer() !== r.id" style="display:flex;gap:8px;flex-wrap:wrap">
              <button *ngIf="peutHonorer(r)" type="button" class="bouton" (click)="honorer(r)" [disabled]="enCours() !== null">
                {{ estEnCours(r, 'honorer') ? l.t('Enregistrement…', 'جارٍ التسجيل…') : l.t('Marquer honoré', 'تسجيل الحضور') }}
              </button>
              <button *ngIf="peutMarquerAbsent(r)" type="button" class="bouton-secondaire" (click)="demanderAbsent(r)" [disabled]="enCours() !== null">
                {{ l.t('Patient absent', 'المريض غائب') }}
              </button>
              <button *ngIf="visio && peutProposer(r)" type="button" class="bouton-secondaire" (click)="proposerTeleconsultation(r)"
                      [disabled]="enCours() !== null">
                {{ estEnCours(r, 'teleconsultation') ? l.t('Envoi…', 'جارٍ الإرسال…') : l.t('Proposer une téléconsultation', 'اقتراح استشارة عن بُعد') }}
              </button>
              <button *ngIf="peutDeplacer(r)" type="button" class="bouton-secondaire deplacer-btn" (click)="aDeplacer.set(r.id)" [disabled]="enCours() !== null">{{ l.t('Déplacer', 'نقل') }}</button>
              <button *ngIf="peutAnnulerCabinet(r)" type="button" (click)="demanderAnnulation(r)" [disabled]="enCours() !== null"
                      style="padding:11px 18px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
                {{ l.t('Annuler', 'إلغاء') }}
              </button>
              <a *ngIf="peutRedigerOrdonnance(r)" class="bouton-secondaire" routerLink="/medecin/ordonnance/nouvelle"
                 [queryParams]="{ patientId: r.patientId, rendezVousId: r.id }">{{ l.t('Rédiger une ordonnance', 'كتابة وصفة') }}</a>
            </div>
            <app-deplacer-rendez-vous *ngIf="aDeplacer() === r.id" [rendezVous]="r" [arabe]="l.ar()" [avertirPatient]="true" [lister]="listerCreneaux" [deplacer]="deplacerFn"
              (deplace)="apresDeplacement($event)" (annule)="aDeplacer.set(null)" />
          </li>
        </ul>
      </section>

      <p *ngIf="!charge() && !erreur() && rendezVous().length === 0">
        {{ l.t('Aucun rendez-vous pour le moment.', 'لا توجد مواعيد حاليًا.') }}
        <a routerLink="/medecin/disponibilites" style="color:var(--blue)">{{ l.t('Ouvrir des créneaux', 'فتح مواعيد') }}</a>
      </p>
      <p *ngIf="!charge() && rendezVous().length > 0 && jours().length === 0" style="color:var(--text3)">
        {{ vue() === 'avenir' ? l.t('Aucun rendez-vous à venir.', 'لا توجد مواعيد قادمة.') : l.t('Aucun rendez-vous passé.', 'لا توجد مواعيد سابقة.') }}
        <a *ngIf="vue() === 'avenir'" routerLink="/medecin/disponibilites" style="color:var(--blue)">{{ l.t('Ouvrir des créneaux', 'فتح مواعيد') }}</a>
      </p>
    </main>
  `
})
export class AgendaMedecinComponent implements OnInit {
  visio = VISIO_ACTIVE;
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private patients = inject(PatientsService);
  private teleconsultations = inject(TeleconsultationService);
  private locale = inject(LOCALE_ID);
  l = inject(LangueService);

  rendezVous = signal<RendezVous[]>([]);
  repertoire = signal<RepertoirePatients>(new Map());
  /** Instant de reference (dernier chargement) pour separer a venir et passes. */
  maintenant = signal(Date.now());
  vue = signal<'avenir' | 'passes'>('avenir');
  private aVenir = computed(() => rendezVousAVenir(this.rendezVous(), this.maintenant()));
  private passes = computed(() => rendezVousPasses(this.rendezVous(), this.maintenant()));
  jours = computed(() => (this.vue() === 'avenir' ? this.aVenir() : this.passes()));
  nombreAVenir = computed(() => this.aVenir().reduce((n, j) => n + j.elements.length, 0));
  nombrePasses = computed(() => this.passes().reduce((n, j) => n + j.elements.length, 0));
  charge = signal(false);
  /** Action en cours : seul le bouton clique affiche « … ». */
  enCours = signal<ActionEnCours | null>(null);
  /** Rendez-vous dont l'annulation attend la confirmation (Oui / Non). */
  aConfirmer = signal<string | null>(null);
  teleconsultationProposee = signal<RendezVous | null>(null);
  annule = signal<RendezVous | null>(null);
  honore = signal<RendezVous | null>(null);
  /** Rendez-vous dont le signalement « patient absent » attend la confirmation (Oui / Non). */
  absentAConfirmer = signal<string | null>(null);
  absent = signal<RendezVous | null>(null);
  erreur = signal('');
  /** Rendez-vous dont le panneau « Déplacer » est ouvert, et message apres deplacement. */
  aDeplacer = signal<string | null>(null);
  deplace = signal('');

  peutDeplacer(r: RendezVous): boolean {
    return estConfirme(r) && Date.parse(r.debut) > Date.now();
  }

  listerCreneaux = (): Observable<Creneau[]> => this.service.creneaux();

  deplacerFn = (rdv: RendezVous, creneauId: string) => this.service.deplacerRendezVous(rdv.id, creneauId);

  apresDeplacement(creneau: Creneau) {
    // Le patient n'est prévenu que pour un rendez-vous pris sur la plateforme, pas par téléphone.
    const rdv = this.rendezVous().find((r) => r.id === this.aDeplacer());
    this.aDeplacer.set(null);
    const prevenu = rdv?.source !== 'TELEPHONE';
    const date = this.dateLongue(creneau.debut);
    this.deplace.set(
      this.l.t(`Rendez-vous déplacé au ${date}${prevenu ? ' : le patient est prévenu.' : '.'}`, `تم نقل الموعد إلى ${date}${prevenu ? ': تم إعلام المريض.' : '.'}`),
    );
    this.charger();
  }

  ngOnInit() {
    this.charger();
    this.patients.patientsDuMedecin().subscribe({ next: (r) => this.repertoire.set(r), error: () => undefined });
  }

  /** Recharge l'agenda ; `motif` est un message d'erreur a conserver a l'ecran (rendez-vous modifie ailleurs). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.agenda().subscribe({
      next: (liste) => {
        this.maintenant.set(Date.now());
        this.rendezVous.set(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux médecins.', 'هذه الصفحة مخصصة للأطباء.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("Impossible de charger l'agenda.", 'تعذّر تحميل المواعيد.'));
        }
      },
    });
  }

  /** Date et heure d'un rendez-vous : jour en lettres en francais, forme numerique en arabe (la locale de l'application est le francais). */
  dateLongue(iso: string): string {
    return this.l.ar() ? formatDate(iso, 'dd/MM/yyyy HH:mm', this.locale) : formatDate(iso, 'EEEE d MMMM à HH:mm', this.locale);
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId);
  }

  telephone(patientId: string): string {
    return telephonePatient(this.repertoire(), patientId);
  }

  /** CONFIRME ou RESERVE : actions proposees (voir agenda-utils). */
  estConfirme = estConfirme;

  peutAnnulerCabinet(r: RendezVous): boolean {
    return peutAnnulerCabinet(r, Date.now());
  }

  peutHonorer(r: RendezVous): boolean {
    return peutHonorer(r, Date.now());
  }

  peutMarquerAbsent(r: RendezVous): boolean {
    return peutMarquerAbsent(r, Date.now());
  }

  peutProposer(r: RendezVous): boolean {
    return peutProposerTeleconsultation(r, Date.now());
  }

  estEnCours(r: RendezVous, action: string): boolean {
    const e = this.enCours();
    return e !== null && e.id === r.id && e.action === action;
  }

  ongletStyle(actif: boolean): Record<string, string> {
    return styleOnglet(actif);
  }

  honorer(rdv: RendezVous) {
    this.demarrer(rdv, 'honorer');
    this.service.honorer(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.honore.set(rdv);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.charger(e.error?.erreur ?? this.l.t('Ce rendez-vous ne peut pas encore être marqué honoré.', 'لا يمكن تسجيل حضور المريض لهذا الموعد بعد.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('La mise à jour du rendez-vous a échoué, veuillez réessayer.', 'فشل تحديث الموعد، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  demanderAnnulation(rdv: RendezVous) {
    this.absentAConfirmer.set(null);
    this.aConfirmer.set(rdv.id);
  }

  demanderAbsent(rdv: RendezVous) {
    this.aConfirmer.set(null);
    this.absentAConfirmer.set(rdv.id);
  }

  /** Signale le patient absent (apres « Oui ») ; 409 si le rendez-vous n'est plus confirme : motif affiche et agenda recharge. */
  marquerAbsent(rdv: RendezVous) {
    this.demarrer(rdv, 'absent');
    this.service.marquerAbsent(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.absentAConfirmer.set(null);
        this.absent.set(rdv);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.absentAConfirmer.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 409) {
          this.charger(e.error?.erreur ?? this.l.t('Ce rendez-vous ne peut pas être marqué absent.', 'لا يمكن تسجيل غياب المريض عن هذا الموعد.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('La mise à jour du rendez-vous a échoué, veuillez réessayer.', 'فشل تحديث الموعد، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /**
   * Annule un rendez-vous confirme (apres « Oui ») : le creneau est remis a disposition et le patient prevenu
   * par l'API (409 s'il n'est plus confirme : motif affiche et agenda recharge).
   */
  annuler(rdv: RendezVous) {
    this.demarrer(rdv, 'annuler');
    this.service.annulerRendezVous(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        this.annule.set(rdv);
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.aConfirmer.set(null);
        if (e.status === 409) {
          this.charger(e.error?.erreur ?? this.l.t("Ce rendez-vous n'est plus confirmé.", 'لم يعد هذا الموعد مؤكدًا.'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("L'annulation a échoué, veuillez réessayer.", 'فشل الإلغاء، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** Planifie une teleconsultation sur le rendez-vous (409 si non confirme, passe ou deja planifiee : motif affiche). */
  proposerTeleconsultation(rdv: RendezVous) {
    this.demarrer(rdv, 'teleconsultation');
    this.teleconsultations.planifier(rdv.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.teleconsultationProposee.set(rdv);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.erreur.set(e.error?.erreur ?? this.l.t('Une téléconsultation est déjà proposée sur ce rendez-vous.', 'تم اقتراح استشارة عن بُعد على هذا الموعد من قبل.'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('La proposition de téléconsultation a échoué, veuillez réessayer.', 'فشل اقتراح الاستشارة عن بُعد، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** Ordonnance possible sauf rendez-vous annule (ANNULE ou ANNULEE), patient absent ou rendez-vous pris par telephone (sans compte patient). */
  peutRedigerOrdonnance(r: { statut: string; source?: string | null }): boolean {
    return !estAnnule(r.statut) && r.statut !== 'ABSENT' && r.source !== 'TELEPHONE';
  }

  libelleStatut(statut: string): string {
    return this.l.ar() ? libelleStatutRendezVousAr(statut) : libelleStatutRendezVous(statut);
  }

  private demarrer(rdv: RendezVous, action: string) {
    this.enCours.set({ id: rdv.id, action });
    this.erreur.set('');
    this.teleconsultationProposee.set(null);
    this.annule.set(null);
    this.honore.set(null);
    this.absent.set(null);
    this.deplace.set('');
  }
}
