import { Component, EventEmitter, OnChanges, Output, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Creneau } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES } from '../secretaire/secretaire.service';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { LangueService } from '../partage/langue.service';
import { RdvTelephoneComponent } from './rdv-telephone.component';
import { JOURS_SEMAINE, RdvTelephone, ResultatSemaineType, SemaineType } from './semaine-type';
import { SemaineTypeComponent } from './semaine-type.component';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { grouperParJour, instantAlger, valeurDateHeureLocale, styleOnglet } from './agenda-utils';

/** Acces aux creneaux d'un agenda : celui du medecin connecte ou celui d'un cabinet rattache (secretaire). */
export interface SourceCreneaux {
  lister(): Observable<Creneau[]>;
  ouvrir(debutIso: string, dureeMinutes: number): Observable<Creneau>;
  supprimer(creneauId: string): Observable<void>;
  /** Semaine type (facultatif : absent = fonction non proposee). */
  semaineType?(corps: SemaineType): Observable<ResultatSemaineType>;
  /** Rendez-vous pris au telephone (secretaire uniquement). */
  rdvTelephone?(corps: RdvTelephone): Observable<RendezVous>;
}

/** Creneau que l'on vient d'ouvrir (message de confirmation). */
interface CreneauOuvert {
  debut: string;
  dureeMinutes: number;
}

/** Nombre maximal de creneaux ouverts d'un coup par une serie. */
const SERIE_MAX = 48;

/**
 * Ouverture de creneaux (un seul, ou une serie consecutive sur une plage horaire) et liste des creneaux a venir,
 * par jour, avec suppression des creneaux libres apres confirmation dans la page. Partage entre la page
 * « Disponibilites » du medecin et l'espace secretaire.
 */
@Component({
    selector: 'app-gestion-creneaux',
    imports: [CommonModule, FormsModule, RouterLink, SemaineTypeComponent, RdvTelephoneComponent],
    template: `
    <div [attr.dir]="langue.ar() ? 'rtl' : null" [attr.lang]="langue.ar() ? 'ar' : null">
    <section style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:20px;margin:0 0 24px">
      <div role="tablist" style="display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap">
        <button type="button" role="tab" [attr.aria-selected]="mode() === 'unique'" (click)="changerMode('unique')"
                [ngStyle]="ongletStyle(mode() === 'unique')">{{ langue.t('Un créneau', 'موعد واحد') }}</button>
        <button type="button" role="tab" [attr.aria-selected]="mode() === 'serie'" (click)="changerMode('serie')"
                [ngStyle]="ongletStyle(mode() === 'serie')">{{ langue.t('Une série', 'سلسلة مواعيد') }}</button>
        <button *ngIf="source().semaineType && api.semaineType()" type="button" role="tab" [attr.aria-selected]="mode() === 'semaine'"
                (click)="changerMode('semaine')" [ngStyle]="ongletStyle(mode() === 'semaine')" [attr.lang]="langue.ar() ? 'ar' : null">
          {{ langue.t('Semaine type', 'الأسبوع النموذجي') }}
        </button>
      </div>

      <form *ngIf="mode() === 'unique'" (ngSubmit)="ouvrir()" #f="ngForm" style="display:grid;gap:12px;max-width:380px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ langue.t('Date et heure', 'التاريخ والوقت') }}
          <input class="champ" type="datetime-local" [(ngModel)]="debut" name="debut" required [min]="minDebut"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ langue.t('Durée (minutes, de ' + dureeMin + ' à ' + dureeMax + ')', 'المدة (بالدقائق، من ' + dureeMin + ' إلى ' + dureeMax + ')') }}
          <input class="champ" type="number" [(ngModel)]="dureeMinutes" name="dureeMinutes" required [min]="dureeMin" [max]="dureeMax" step="5"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || ouverture()">
            {{ ouverture() ? langue.t('Ouverture…', 'جارٍ الفتح…') : langue.t('Ouvrir le créneau', 'فتح الموعد') }}
          </button>
        </div>
      </form>

      <form *ngIf="mode() === 'serie'" (ngSubmit)="ouvrirSerie()" #fs="ngForm" style="display:grid;gap:12px;max-width:380px">
        <p style="margin:0;color:var(--text3);font-size:.9rem">
          {{ langue.t("Des créneaux consécutifs sont ouverts de l'heure de début jusqu'à l'heure de fin.", "تُفتح مواعيد متتالية من وقت البداية حتى وقت النهاية.") }}
        </p>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ langue.t('Date', 'التاريخ') }}
          <input class="champ" type="date" [(ngModel)]="serieDate" name="serieDate" required [min]="minDate"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ langue.t('De', 'من') }}
            <input class="champ" type="time" [(ngModel)]="serieDebut" name="serieDebut" required style="color:var(--ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ langue.t('À', 'إلى') }}
            <input class="champ" type="time" [(ngModel)]="serieFin" name="serieFin" required style="color:var(--ink);font-size:1rem">
          </label>
        </div>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ langue.t('Durée de chaque créneau (minutes, de ' + dureeMin + ' à ' + dureeMax + ')', 'مدة كل موعد (بالدقائق، من ' + dureeMin + ' إلى ' + dureeMax + ')') }}
          <input class="champ" type="number" [(ngModel)]="serieDuree" name="serieDuree" required [min]="dureeMin" [max]="dureeMax" step="5"
                 style="color:var(--ink);font-size:1rem">
        </label>
        <div>
          <button type="submit" class="bouton" [disabled]="fs.invalid || ouverture()">
            {{ ouverture() ? langue.t('Ouverture…', 'جارٍ الفتح…') : langue.t('Ouvrir la série', 'فتح السلسلة') }}
          </button>
        </div>
      </form>

      <app-semaine-type *ngIf="mode() === 'semaine' && source().semaineType as appel" [appel]="appel" [message403]="message403()"
                        (cree)="charger()" />

      <p *ngIf="succes() as c" style="color:var(--blue);margin:12px 0 0">
        <ng-container *ngIf="!langue.ar()">Créneau ouvert le {{ c.debut | date:'EEEE d MMMM à HH:mm':'+0100' }} ({{ c.dureeMinutes }} min).</ng-container>
        <ng-container *ngIf="langue.ar()">تم فتح موعد بتاريخ <span dir="ltr">{{ c.debut | date:'dd/MM/yyyy HH:mm':'+0100' }}</span> ({{ c.dureeMinutes }} دقيقة).</ng-container>
        <a *ngIf="lienAgenda() as lien" [routerLink]="lien" style="color:var(--blue)">{{ langue.t("Voir l'agenda", 'عرض الأجندة') }}</a>
      </p>
      <p *ngIf="succesSerie()" style="color:var(--blue);margin:12px 0 0">{{ succesSerie() }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:12px 0 0">{{ erreur() }}</p>
    </section>

    <h2 style="font-size:1.1rem;margin:0 0 12px;color:var(--ink)">{{ langue.t('Créneaux à venir', 'المواعيد المتاحة القادمة') }}</h2>
    <p *ngIf="charge()" style="color:var(--text3)">{{ langue.t('Chargement…', 'جارٍ التحميل…') }}</p>
    <p *ngIf="erreurListe()" role="alert" style="color:var(--red)">{{ erreurListe() }}</p>
    <p *ngIf="!charge() && !erreurListe() && creneaux().length === 0" style="color:var(--text3)">{{ langue.t('Aucun créneau à venir.', 'لا توجد مواعيد متاحة قادمة.') }}</p>

    <div *ngFor="let j of jours()" style="margin:0 0 16px">
      <h3 style="font-size:.95rem;margin:0 0 8px;color:var(--text2);text-transform:capitalize">{{ j.debut | date:(langue.ar() ? 'dd/MM/yyyy' : 'EEEE d MMMM'):'+0100' }}</h3>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
        <li *ngFor="let c of j.elements" class="creneau"
            style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span>
            <strong style="color:var(--ink)">{{ c.debut | date:'HH:mm':'+0100' }}</strong>
            <span style="color:var(--text3)"> · {{ c.dureeMinutes }} min</span>
            <span *ngIf="c.disponible" style="display:inline-block;margin-left:8px;background:var(--blue-l);color:var(--blue-d);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600">{{ langue.t('Libre', 'متاح') }}</span>
            <span *ngIf="!c.disponible" style="display:inline-block;margin-left:8px;background:var(--red-l);color:var(--red);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600">{{ langue.t('Réservé', 'محجوز') }}</span>
          </span>
          <ng-container *ngIf="c.disponible">
            <span *ngIf="aConfirmer() === c.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span style="color:var(--text2);font-size:.9rem">{{ langue.t('Supprimer ce créneau ?', 'حذف هذا الموعد المتاح؟') }}</span>
              <button type="button" class="bouton" (click)="supprimer(c)" [disabled]="suppression() !== null">
                {{ suppression() === c.id ? langue.t('Suppression…', 'جارٍ الحذف…') : langue.t('Oui', 'نعم') }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="suppression() !== null">{{ langue.t('Non', 'لا') }}</button>
            </span>
            <button *ngIf="aConfirmer() !== c.id" type="button" (click)="aConfirmer.set(c.id)" [disabled]="suppression() !== null"
                    style="padding:8px 14px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
              {{ langue.t('Supprimer', 'حذف') }}
            </button>
            <button *ngIf="source().rdvTelephone && api.rdvTelephone() && rdvPour() !== c.id" type="button" class="bouton-secondaire rdv-telephone-bouton"
                    (click)="rdvPour.set(c.id)" [attr.lang]="langue.ar() ? 'ar' : null" style="padding:8px 14px">
              {{ langue.t('RDV pris au téléphone', 'موعد عبر الهاتف') }}
            </button>
          </ng-container>
          <app-rdv-telephone *ngIf="c.disponible && rdvPour() === c.id && source().rdvTelephone as appelRdv" [creneauId]="c.id" [appel]="appelRdv"
                             [message403]="message403()" (annule)="rdvPour.set(null)" (fait)="rdvEnregistre()" (disparu)="creneauDisparu($event)" />
        </li>
      </ul>
    </div>
    </div>
  `
})
export class GestionCreneauxComponent implements OnChanges {
  private auth = inject(AuthService);
  api = inject(ApiDisponibleService);
  langue = inject(LangueService);
  /** Emis apres un rendez-vous pris au telephone (la page recharge l'agenda). */
  @Output() rdvPris = new EventEmitter<void>();

  source = input.required<SourceCreneaux>();
  /** Message affiche sur un 403. */
  message403 = input("Vous n'avez pas accès à cet agenda.");
  /** Lien « Voir l'agenda » apres ouverture d'un creneau (aucun si null). */
  lienAgenda = input<string | null>(null);

  mode = signal<'unique' | 'serie' | 'semaine'>('unique');
  /** L'onglet « Semaine type » disparait (404) : on revient a « Un creneau » au lieu d'un panneau vide. */
  private readonly retourSiSemaineAbsente = effect(() => {
    if (this.mode() === 'semaine' && (!this.source().semaineType || !this.api.semaineType())) this.mode.set('unique');
  }, { allowSignalWrites: true });
  /** Creneau libre dont le formulaire « RDV pris au telephone » est ouvert. */
  rdvPour = signal<string | null>(null);
  creneaux = signal<Creneau[]>([]);
  jours = computed(() => grouperParJour(this.creneaux()));
  charge = signal(false);
  ouverture = signal(false);
  /** Creneau dont la suppression est demandee (confirmation Oui / Non), puis en cours. */
  aConfirmer = signal<string | null>(null);
  suppression = signal<string | null>(null);
  succes = signal<CreneauOuvert | null>(null);
  succesSerie = signal('');
  erreur = signal('');
  erreurListe = signal('');

  dureeMin = DUREE_MIN_MINUTES;
  dureeMax = DUREE_MAX_MINUTES;
  /** Bornes basses des selecteurs : maintenant, aux formats datetime-local et date. */
  minDebut = valeurDateHeureLocale(new Date());
  minDate = this.minDebut.slice(0, 10);

  /** Valeur du champ datetime-local : heure locale sans fuseau (« 2026-09-21T09:30 »). */
  debut = '';
  dureeMinutes = 30;
  serieDate = '';
  serieDebut = '09:00';
  serieFin = '12:00';
  serieDuree = 30;

  ngOnChanges() {
    this.succes.set(null);
    this.succesSerie.set('');
    this.erreur.set('');
    this.aConfirmer.set(null);
    this.charger();
  }

  rdvEnregistre() {
    this.rdvPour.set(null);
    this.charger();
    this.rdvPris.emit();
  }

  /** Le creneau a disparu pendant la saisie : message de l'API, formulaire ferme, liste relue. */
  creneauDisparu(message: string) {
    this.rdvPour.set(null);
    this.charger();
    this.erreur.set(message);
  }

  changerMode(mode: 'unique' | 'serie' | 'semaine') {
    this.mode.set(mode);
    this.erreur.set('');
  }

  ongletStyle(actif: boolean): Record<string, string> {
    return styleOnglet(actif);
  }

  charger() {
    const source = this.source();
    this.charge.set(true);
    this.erreurListe.set('');
    source.lister().subscribe({
      next: (liste) => {
        if (source !== this.source()) return;
        const maintenant = Date.now();
        this.creneaux.set(
          liste
            .filter((c) => Date.parse(c.debut) + c.dureeMinutes * 60_000 > maintenant)
            .sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
        );
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 403) this.erreurListe.set(this.message403());
        else this.erreurListe.set(e.error?.erreur ?? this.langue.t('Impossible de charger les créneaux.', 'تعذّر تحميل المواعيد المتاحة.'));
      },
    });
  }

  ouvrir() {
    // Heure saisie interpretee en heure d'Algerie (UTC+1), quel que soit le fuseau du navigateur.
    const [jour, heure] = this.debut.split('T');
    const debut = new Date(instantAlger(jour, heure ?? ''));
    const dureeMinutes = Number(this.dureeMinutes);
    this.reinitialiserMessages();
    if (!this.debut || Number.isNaN(debut.getTime())) {
      this.erreur.set(this.langue.t('Indiquez une date et une heure valides.', 'أدخل تاريخًا ووقتًا صحيحين.'));
      return;
    }
    if (debut.getTime() <= Date.now()) {
      this.erreur.set(this.langue.t('Le créneau doit commencer dans le futur.', 'يجب أن يبدأ الموعد في المستقبل.'));
      return;
    }
    if (!this.dureeValide(dureeMinutes)) return;
    const debutIso = debut.toISOString();
    this.ouverture.set(true);
    this.source().ouvrir(debutIso, dureeMinutes).subscribe({
      next: () => {
        this.ouverture.set(false);
        this.succes.set({ debut: debutIso, dureeMinutes });
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.ouverture.set(false);
        this.traiterErreurOuverture(e);
      },
    });
  }

  /** Serie : creneaux consecutifs de `serieDebut` a `serieFin` ; un chevauchement (400) est ignore, les autres erreurs arretent la serie. */
  ouvrirSerie() {
    this.reinitialiserMessages();
    const duree = Number(this.serieDuree);
    if (!this.dureeValide(duree)) return;
    const debut = new Date(instantAlger(this.serieDate, this.serieDebut));
    const fin = new Date(instantAlger(this.serieDate, this.serieFin));
    if (!this.serieDate || Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
      this.erreur.set(this.langue.t('Indiquez une date et des heures valides.', 'أدخل تاريخًا وأوقاتًا صحيحة.'));
      return;
    }
    if (fin.getTime() <= debut.getTime()) {
      this.erreur.set(this.langue.t("L'heure de fin doit être après l'heure de début.", 'يجب أن يكون وقت النهاية بعد وقت البداية.'));
      return;
    }
    const maintenant = Date.now();
    const debuts: Date[] = [];
    for (let t = debut.getTime(); t + duree * 60_000 <= fin.getTime(); t += duree * 60_000) {
      if (t > maintenant) debuts.push(new Date(t));
    }
    if (debuts.length === 0) {
      this.erreur.set(this.langue.t('Aucun créneau à venir dans cette plage horaire.', 'لا يوجد موعد قادم في هذه الفترة.'));
      return;
    }
    if (debuts.length > SERIE_MAX) {
      this.erreur.set(this.langue.t(`Une série est limitée à ${SERIE_MAX} créneaux : réduisez la plage horaire.`, `السلسلة محدودة بـ ${SERIE_MAX} موعدًا: قلّص الفترة الزمنية.`));
      return;
    }
    this.ouverture.set(true);
    if (debuts.length > 1 && this.source().semaineType && this.api.semaineType()) {
      this.ouvrirEnLot(debuts, duree);
      return;
    }
    this.ouvrirSuivant(debuts, 0, duree);
  }

  /**
   * Ouvre toute la serie en un seul appel (route « semaine type » sur une seule date) : l'API n'alerte alors
   * qu'une fois les patients en liste d'attente, au lieu d'une alerte par creneau. Route absente (404) :
   * retour a l'ouverture creneau par creneau.
   */
  private ouvrirEnLot(debuts: Date[], duree: number) {
    const jour = JOURS_SEMAINE[new Date(`${this.serieDate}T00:00:00Z`).getUTCDay()].code;
    const corps: SemaineType = {
      jours: [jour],
      debut: valeurDateHeureLocale(debuts[0]).slice(11),
      fin: this.serieFin,
      dureeMinutes: duree,
      aPartirDu: this.serieDate,
      nombreSemaines: 1,
    };
    this.source().semaineType!(corps).subscribe({
      next: (r) => this.terminerSerie(r.crees, r.ignores),
      error: (e: HttpErrorResponse) => {
        if (e.status === 404) {
          this.api.semaineType.set(false);
          this.ouvrirSuivant(debuts, 0, duree);
          return;
        }
        this.ouverture.set(false);
        this.traiterErreurOuverture(e);
      },
    });
  }

  supprimer(c: Creneau) {
    this.suppression.set(c.id);
    this.erreurListe.set('');
    this.succesSerie.set('');
    this.source().supprimer(c.id).subscribe({
      next: () => {
        this.suppression.set(null);
        this.aConfirmer.set(null);
        this.charger();
        this.succesSerie.set(this.langue.t('Créneau supprimé.', 'تم حذف الموعد المتاح.'));
      },
      error: (e: HttpErrorResponse) => {
        this.suppression.set(null);
        this.aConfirmer.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
          return;
        }
        const message =
          e.error?.erreur ??
          (e.status === 409
            ? this.langue.t("Ce créneau est réservé : annulez d'abord le rendez-vous.", 'هذا الموعد محجوز: ألغِ الحجز أولًا.')
            : e.status === 403
              ? this.message403()
              : this.langue.t('La suppression du créneau a échoué, veuillez réessayer.', 'فشل حذف الموعد، حاول مجددًا.'));
        this.charger();
        this.erreurListe.set(message);
      },
    });
  }

  private ouvrirSuivant(debuts: Date[], index: number, duree: number, ignores = 0) {
    if (index >= debuts.length) {
      this.terminerSerie(debuts.length - ignores, ignores);
      return;
    }
    this.source().ouvrir(debuts[index].toISOString(), duree).subscribe({
      next: () => this.ouvrirSuivant(debuts, index + 1, duree, ignores),
      error: (e: HttpErrorResponse) => {
        // 400 « chevauche » = creneau existant : on l'ignore et on passe au suivant.
        // Tout autre 400 (ex. plus de 6 mois a l'avance) arrete la serie avec son message.
        if (e.status === 400 && /chevauch/i.test(String(e.error?.erreur ?? ''))) {
          this.ouvrirSuivant(debuts, index + 1, duree, ignores + 1);
          return;
        }
        this.ouverture.set(false);
        const ouverts = index - ignores;
        if (ouverts > 0) {
          this.succesSerie.set(this.resumeSerie(ouverts, ignores, true));
        }
        if (index > 0) this.charger();
        const heure = valeurDateHeureLocale(debuts[index]).slice(11);
        this.traiterErreurOuverture(e, this.langue.t(`Arrêt au créneau de ${heure} : `, `توقّف عند موعد ${heure}: `));
      },
    });
  }

  private terminerSerie(ouverts: number, ignores: number) {
    this.ouverture.set(false);
    if (ouverts === 0) {
      this.erreur.set(
        this.langue.ar()
          ? `لم يُفتح أي موعد: تم تجاهل ${ignores} (محجوزة مسبقًا).`
          : `Aucun créneau ouvert : ${ignores} ignoré${ignores > 1 ? 's' : ''} (déjà pris).`,
      );
    } else {
      this.succesSerie.set(this.resumeSerie(ouverts, ignores, false));
    }
    this.charger();
  }

  private resumeSerie(ouverts: number, ignores: number, arret: boolean): string {
    if (this.langue.ar()) {
      const ign = ignores > 0 ? `، وتم تجاهل ${ignores} (محجوزة مسبقًا)` : '';
      return `تم فتح ${ouverts} موعد${ign}${arret ? ' قبل التوقف' : ''}.`;
    }
    const base = `${ouverts} créneau${ouverts > 1 ? 'x' : ''} ouvert${ouverts > 1 ? 's' : ''}`;
    const ign = ignores > 0 ? `, ${ignores} ignoré${ignores > 1 ? 's' : ''} (déjà pris)` : '';
    return `${base}${ign}${arret ? " avant l'arrêt" : ''}.`;
  }

  private dureeValide(duree: number): boolean {
    if (!Number.isInteger(duree) || duree < DUREE_MIN_MINUTES || duree > DUREE_MAX_MINUTES) {
      this.erreur.set(this.langue.t(`Indiquez une durée entre ${DUREE_MIN_MINUTES} et ${DUREE_MAX_MINUTES} minutes.`, `أدخل مدة بين ${DUREE_MIN_MINUTES} و${DUREE_MAX_MINUTES} دقيقة.`));
      return false;
    }
    return true;
  }

  private reinitialiserMessages() {
    this.succes.set(null);
    this.succesSerie.set('');
    this.erreur.set('');
  }

  private traiterErreurOuverture(e: HttpErrorResponse, prefixe = '') {
    if (e.status === 401) {
      this.auth.seConnecter();
    } else if (e.status === 403) {
      this.erreur.set(prefixe + this.message403());
    } else if (e.status === 409) {
      this.erreur.set(prefixe + (e.error?.erreur ?? this.langue.t('Un créneau existe déjà sur cet horaire.', 'يوجد موعد في هذا الوقت بالفعل.')));
    } else if (e.status === 400) {
      this.erreur.set(prefixe + (e.error?.erreur ?? this.langue.t('Le créneau est invalide.', 'الموعد غير صالح.')));
    } else {
      this.erreur.set(prefixe + (e.error?.erreur ?? this.langue.t("L'ouverture du créneau a échoué, veuillez réessayer.", 'فشل فتح الموعد، حاول مجددًا.')));
    }
  }
}
