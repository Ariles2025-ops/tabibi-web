import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { LangueService } from '../partage/langue.service';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES } from '../secretaire/secretaire.service';
import { JOURS_SEMAINE, messageSemaineType, ResultatSemaineType, SEMAINES_MAX, SemaineType } from './semaine-type';

/**
 * Formulaire « Semaine type » : jours a cocher, plage horaire, duree, date de depart et nombre de semaines ; l'API
 * cree les creneaux et ignore ceux qui chevauchent un creneau existant. Un 404 (route absente) masque l'ecran
 * sans message d'erreur.
 */
@Component({
  selector: 'app-semaine-type',
  imports: [CommonModule, FormsModule],
  template: `
    <form *ngIf="api.semaineType()" (ngSubmit)="envoyer()" #f="ngForm" style="display:grid;gap:12px;max-width:420px"
          [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <p style="margin:0;color:var(--text3);font-size:.9rem">
        {{ l.t('Cochez les jours de consultation : les créneaux sont créés chaque semaine sur la période choisie. Les horaires déjà passés et les créneaux déjà ouverts à ce moment sont ignorés.',
               'اختر أيام الاستشارة: تُنشأ المواعيد كل أسبوع خلال المدة المحددة. تُتجاهل الأوقات التي مضت والمواعيد المفتوحة أصلًا في الوقت نفسه.') }}
      </p>
      <fieldset style="border:1px solid var(--border);border-radius:var(--r12);padding:8px 12px;margin:0">
        <legend style="color:var(--text3);font-size:.9rem">{{ l.t('Jours', 'الأيام') }}</legend>
        <label *ngFor="let j of jours" style="display:inline-flex;gap:6px;align-items:center;margin:4px 12px 4px 0;color:var(--ink)">
          <input type="checkbox" [checked]="coche(j.code)" (change)="basculer(j.code)" [name]="'jour-' + j.code"> {{ l.t(j.fr, j.ar) }}
        </label>
      </fieldset>
      <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Début', 'البداية') }}
          <input class="champ" type="time" [(ngModel)]="debut" name="debut" required style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Fin', 'النهاية') }}
          <input class="champ" type="time" [(ngModel)]="fin" name="fin" required style="color:var(--ink);font-size:1rem">
        </label>
      </div>
      <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
        {{ l.t('Durée de chaque créneau (minutes)', 'مدة كل موعد (بالدقائق)') }}
        <input class="champ" type="number" [(ngModel)]="duree" name="duree" required [min]="dureeMin" [max]="dureeMax" step="5"
               style="color:var(--ink);font-size:1rem">
      </label>
      <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('À partir du', 'ابتداءً من') }}
          <input class="champ" type="date" [(ngModel)]="aPartirDu" name="aPartirDu" required [min]="minDate" style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Nombre de semaines (1 à ' + semainesMax + ')', 'عدد الأسابيع (من 1 إلى ' + semainesMax + ')') }}
          <input class="champ" type="number" [(ngModel)]="nombreSemaines" name="nombreSemaines" required min="1" [max]="semainesMax"
                 style="color:var(--ink);font-size:1rem">
        </label>
      </div>
      <div>
        <button type="submit" class="bouton" [disabled]="f.invalid || envoi()">
          {{ envoi() ? l.t('Création…', 'جارٍ الإنشاء…') : l.t('Créer la semaine type', 'إنشاء الأسبوع النموذجي') }}
        </button>
      </div>
      <p *ngIf="resultat() as r" role="status" style="color:var(--blue);margin:0">
        {{ message(r) }}
      </p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:0">{{ erreur() }}</p>
    </form>
  `,
})
export class SemaineTypeComponent {
  private auth = inject(AuthService);
  api = inject(ApiDisponibleService);
  l = inject(LangueService);

  /** Appel de l'API pour le medecin ou le cabinet concerne. */
  appel = input.required<(corps: SemaineType) => Observable<ResultatSemaineType>>();
  /** Message affiche sur un 403. */
  message403 = input("Vous n'avez pas accès à cet agenda.");
  /** Emis apres des creneaux crees (pour recharger la liste). */
  @Output() cree = new EventEmitter<ResultatSemaineType>();

  jours = JOURS_SEMAINE;
  dureeMin = DUREE_MIN_MINUTES;
  dureeMax = DUREE_MAX_MINUTES;
  semainesMax = SEMAINES_MAX;
  minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  choisis = signal<string[]>([]);
  debut = '09:00';
  fin = '12:30';
  duree = 20;
  aPartirDu = '';
  nombreSemaines = 4;

  envoi = signal(false);
  resultat = signal<ResultatSemaineType | null>(null);
  erreur = signal('');

  message(r: ResultatSemaineType): string {
    return messageSemaineType(r, this.l.ar());
  }

  coche(code: string): boolean {
    return this.choisis().includes(code);
  }

  basculer(code: string) {
    this.choisis.update((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  }

  envoyer() {
    this.resultat.set(null);
    this.erreur.set('');
    const duree = Number(this.duree);
    const semaines = Number(this.nombreSemaines);
    const jours = this.jours.map((j) => j.code).filter((c) => this.coche(c));
    if (jours.length === 0) return this.erreur.set(this.l.t('Cochez au moins un jour.', 'اختر يومًا واحدًا على الأقل.'));
    if (!this.debut || !this.fin || this.fin <= this.debut) {
      return this.erreur.set(this.l.t("L'heure de fin doit être après l'heure de début.", 'يجب أن تكون النهاية بعد البداية.'));
    }
    if (!Number.isInteger(duree) || duree < DUREE_MIN_MINUTES || duree > DUREE_MAX_MINUTES) {
      return this.erreur.set(this.l.t(`Indiquez une durée entre ${DUREE_MIN_MINUTES} et ${DUREE_MAX_MINUTES} minutes.`,
        `أدخل مدة بين ${DUREE_MIN_MINUTES} و${DUREE_MAX_MINUTES} دقيقة.`));
    }
    // Comme l'appli (erreurSemaineType) : une plage plus courte que la durée d'un créneau ne créerait rien.
    if (minutes(this.fin) - minutes(this.debut) < duree) {
      return this.erreur.set(this.l.t('La plage horaire est trop courte pour la durée choisie.', 'الفترة الزمنية أقصر من المدة المختارة.'));
    }
    if (!this.aPartirDu) return this.erreur.set(this.l.t('Indiquez la date de départ.', 'أدخل تاريخ البداية.'));
    if (!Number.isInteger(semaines) || semaines < 1 || semaines > SEMAINES_MAX) {
      return this.erreur.set(this.l.t(`Le nombre de semaines doit être compris entre 1 et ${SEMAINES_MAX}.`,
        `عدد الأسابيع يجب أن يكون بين 1 و${SEMAINES_MAX}.`));
    }
    this.envoi.set(true);
    this.appel()({ jours, debut: this.debut, fin: this.fin, dureeMinutes: duree, aPartirDu: this.aPartirDu, nombreSemaines: semaines }).subscribe({
      next: (r) => {
        this.envoi.set(false);
        this.resultat.set(r);
        this.cree.emit(r);
      },
      error: (e: HttpErrorResponse) => {
        this.envoi.set(false);
        if (e.status === 404) this.api.semaineType.set(false); // route absente : l'ecran disparait, sans erreur
        else if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 403) this.erreur.set(this.message403());
        else this.erreur.set(e.error?.erreur ?? this.l.t('La création des créneaux a échoué, veuillez réessayer.', 'فشل إنشاء المواعيد، حاول مجددًا.'));
      },
    });
  }
}

/** « 09:30 » -> 570 minutes depuis minuit. */
function minutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + (m || 0);
}
