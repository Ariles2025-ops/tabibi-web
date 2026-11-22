import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { LangueService } from '../partage/langue.service';
import { libelleMedecin } from '../messagerie/messagerie.service';
import { instantLisible, trierParDateRecenteDabord } from '../partage/dates-lisibles';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { libelleStatutTeleconsultation, libelleStatutTeleconsultationAr } from './statut-teleconsultation';
import { Teleconsultation, TeleconsultationService, salleAccessible } from './teleconsultation.service';

/** La salle s'ouvre 15 min avant le rendez-vous et reste accessible 2 h apres son debut. */
const AVANCE_MS = 15 * 60 * 1000;
const RETARD_MS = 2 * 60 * 60 * 1000;

/**
 * Teleconsultations du patient connecte (GET /api/teleconsultations/mes). Le lien de la salle video n'est
 * remis qu'apres un consentement explicite (POST /api/teleconsultations/{id}/consentir) : tant qu'il manque,
 * un encart explique le recours a un service tiers (Jitsi Meet) et propose de consentir.
 */
@Component({
    selector: 'app-mes-teleconsultations',
    imports: [CommonModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--vert);margin:0">{{ l.t('Mes téléconsultations', 'استشاراتي عن بُعد') }}</h1>
        <app-selecteur-langue />
      </div>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
        <p *ngIf="succes()" class="consentement-enregistre" role="status" style="color:var(--vert);font-weight:600">{{ succes() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let t of teleconsultations()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <strong *ngIf="dateLisible(datesRendezVous()[t.rendezVousId]) && datesRendezVous()[t.rendezVousId] as debut">{{ l.t('Rendez-vous le', 'الموعد في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ debut | date:formatDate() }}</span></strong>
                <strong *ngIf="!dateLisible(datesRendezVous()[t.rendezVousId]) && dateLisible(t.creeLe)">{{ l.t('Téléconsultation proposée le', 'استشارة عن بُعد اقتُرحت في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ t.creeLe | date:formatDate() }}</span></strong>
                <strong *ngIf="!dateLisible(datesRendezVous()[t.rendezVousId]) && !dateLisible(t.creeLe)">{{ l.t('Téléconsultation · date inconnue', 'استشارة عن بُعد · تاريخ غير معروف') }}</strong>
                <br>
                <a [routerLink]="['/medecins', t.medecinId]" style="color:var(--vert)">{{ noms()[t.medecinId] ?? libelleMedecin(t.medecinId, l.ar()) }}</a>
                <span style="color:var(--text3)"> · {{ libelleStatut(t.statut) }}</span>
                <span *ngIf="dateLisible(t.consentementPatientLe)" style="color:var(--text3)"> · {{ l.t('consentement donné le', 'تمت الموافقة في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ t.consentementPatientLe | date:formatDate() }}</span></span>
              </div>
              <ng-container *ngIf="salleAccessible(t)">
                <a *ngIf="fenetre(t) === 'ouverte'" class="bouton" [href]="t.lienSalle" target="_blank" rel="noopener">
                  {{ l.t('Rejoindre la téléconsultation', 'الانضمام إلى الاستشارة عن بُعد') }}
                </a>
                <span *ngIf="fenetre(t) !== 'ouverte'" style="display:grid;gap:4px;justify-items:end">
                  <button type="button" class="bouton" disabled>{{ l.t('Rejoindre la téléconsultation', 'الانضمام إلى الاستشارة عن بُعد') }}</button>
                  <small style="color:var(--text3)">{{ fenetre(t) === 'avant' ? l.t('Disponible 15 min avant le rendez-vous', 'متاحة قبل الموعد بـ 15 دقيقة') : l.t('Le créneau de ce rendez-vous est passé', 'انتهى وقت هذا الموعد') }}</small>
                </span>
              </ng-container>
            </div>

            <p *ngIf="texteEtat(t) as etat" class="texte-etat" style="margin:12px 0 0;color:var(--text2)">{{ etat }}</p>

            <section *ngIf="consentementAttendu(t)"
                     style="margin:12px 0 0;padding:12px;border:1px solid var(--vert);border-radius:8px;background:#f3faf7">
              <p style="margin:0 0 10px">
                {{ texteConsentement() }}
              </p>
              <button type="button" class="bouton" (click)="consentir(t)" [disabled]="enCours() !== null">
                {{ enCours() === t.id ? l.t('Enregistrement…', 'جارٍ التسجيل…') : l.t('Je donne mon consentement', 'أوافق') }}
              </button>
            </section>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && teleconsultations().length === 0">
          {{ l.t('Aucune téléconsultation pour le moment. Votre praticien peut vous en proposer une sur un rendez-vous confirmé.', 'لا توجد استشارات عن بُعد حاليًا. يمكن لممارسك أن يقترح عليك واحدة على موعد مؤكَّد.') }}
        </p>
      </ng-container>
    </main>
  `
})
export class MesTeleconsultationsComponent implements OnInit {
  readonly libelleMedecin = libelleMedecin;
  l = inject(LangueService);
  private auth = inject(AuthService);
  private service = inject(TeleconsultationService);
  private rendezVousService = inject(RendezVousService);
  private annuaire = inject(AnnuaireService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  teleconsultations = signal<Teleconsultation[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  /** Date de debut des rendez-vous du patient, par identifiant de rendez-vous. */
  datesRendezVous = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  /** Identifiant de la teleconsultation dont le consentement est en cours d'envoi. */
  enCours = signal<string | null>(null);
  erreur = signal('');
  /** Confirmation apres le consentement (« Consentement enregistré », comme l'appli). */
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

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (etat depasse apres un 409). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.mes().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.teleconsultations.set(trierParDateRecenteDabord(liste, (t) => t.creeLe));
        this.chargerNoms(liste);
        this.chargerDatesRendezVous(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux patients.', 'هذه الصفحة مخصّصة للمرضى.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos téléconsultations.', 'تعذّر تحميل استشاراتك عن بُعد.'));
        }
      },
    });
  }

  /** Consentement explicite : la vue renvoyee porte le lien de salle et remplace la ligne. */
  consentir(t: Teleconsultation) {
    this.enCours.set(t.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.consentir(t.id).subscribe({
      next: (consentie) => {
        this.enCours.set(null);
        this.teleconsultations.update((liste) => liste.map((x) => (x.id === consentie.id ? consentie : x)));
        this.succes.set(this.l.t('Consentement enregistré', 'تم تسجيل موافقتك'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.charger(e.error?.erreur ?? this.l.t("Cette téléconsultation n'accepte plus de consentement.", 'لم تعد هذه الاستشارة عن بُعد تقبل الموافقة.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("L'enregistrement du consentement a échoué, veuillez réessayer.", 'فشل تسجيل الموافقة، يُرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** L'encart de consentement est propose tant que le patient n'a pas consenti et que la session n'est pas close. */
  consentementAttendu(t: Teleconsultation): boolean {
    return t.consentementPatientLe === null && (t.statut === 'PLANIFIEE' || t.statut === 'EN_COURS');
  }

  salleAccessible(t: Teleconsultation): boolean {
    return salleAccessible(t);
  }

  /**
   * Texte d'etat quand aucune action n'est possible, comme l'appli : session terminee, annulee, ou lien de salle
   * pas encore remis. Vide si l'on attend le consentement ou si la salle est accessible.
   */
  texteEtat(t: Teleconsultation): string {
    if (this.consentementAttendu(t) || salleAccessible(t)) return '';
    if (t.statut === 'TERMINEE') return this.l.t('Cette téléconsultation est terminée.', 'انتهت هذه الاستشارة عن بُعد.');
    if (t.statut === 'ANNULEE') return this.l.t('Cette téléconsultation a été annulée.', 'تم إلغاء هذه الاستشارة عن بُعد.');
    return this.l.t('Le lien de la salle sera disponible prochainement.', 'سيكون رابط الغرفة متاحًا قريبًا.');
  }

  libelleStatut(statut: string): string {
    return this.l.ar() ? libelleStatutTeleconsultationAr(statut) : libelleStatutTeleconsultation(statut);
  }

  /** Date de l'API presente et lisible (sinon « date inconnue », comme dans l'appli). */
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;

  /** Format de date : chiffres latins jj/mm/aaaa en arabe (comme les autres ecrans), texte long en francais. */
  formatDate(): string {
    return this.l.ar() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM y à HH:mm';
  }

  /** Meme texte que l'appli (consentement explicite avant la remise du lien de salle). */
  texteConsentement(): string {
    return this.l.t(
      "En rejoignant cette téléconsultation, vous acceptez qu'elle se déroule en vidéo via un service tiers (Jitsi Meet). Aucun enregistrement n'est réalisé par Ndawik.",
      'بانضمامك إلى هذه الاستشارة عن بُعد، فإنك توافق على إجرائها بالفيديو عبر خدمة خارجية (Jitsi Meet). لا يقوم نداويك بأي تسجيل.',
    );
  }

  /**
   * Fenetre pour rejoindre la salle : de 15 min avant le debut du rendez-vous a 2 h apres. Une seance deja
   * demarree par le medecin (EN_COURS) ou dont la date est inconnue reste ouverte.
   */
  fenetre(t: Teleconsultation, maintenant = Date.now()): 'avant' | 'ouverte' | 'apres' {
    const debut = this.datesRendezVous()[t.rendezVousId];
    if (t.statut === 'EN_COURS' || !debut) return 'ouverte';
    const heure = Date.parse(debut);
    if (Number.isNaN(heure)) return 'ouverte';
    if (maintenant < heure - AVANCE_MS) return 'avant';
    if (maintenant > heure + RETARD_MS) return 'apres';
    return 'ouverte';
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des teleconsultations. */
  private chargerNoms(liste: Teleconsultation[]) {
    const ids = new Set(liste.map((t) => t.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }

  /** Date du rendez-vous lie, lue dans mes rendez-vous ; a defaut, la date de proposition reste affichee. */
  private chargerDatesRendezVous(liste: Teleconsultation[]) {
    if (liste.length === 0) return;
    this.rendezVousService.mes().subscribe({
      next: (rendezVous) => {
        const dates: Partial<Record<string, string>> = {};
        for (const r of rendezVous) dates[r.id] = r.debut;
        this.datesRendezVous.set(dates);
      },
      error: () => undefined,
    });
  }
}
