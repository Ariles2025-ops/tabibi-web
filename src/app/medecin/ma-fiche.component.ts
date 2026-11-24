import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import {
  ADRESSE_MAX, FicheInfos, HORAIRES_MAX, LANGUES_FICHE, PRESENTATION_MAX, telephoneAlgerienValide,
} from '../fiche-medecin/fiche-infos';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { MedecinService } from './medecin.service';

/**
 * « Ma fiche » (role MEDECIN) : adresse, telephone du cabinet, horaires, presentation et langues de la fiche
 * publique (GET / PUT /api/medecin/fiche). Le nom, la specialite et la wilaya passent par l'administration.
 * Tant que l'API repond 404 sans corps, la page n'affiche rien et renvoie vers l'agenda.
 */
@Component({
  selector: 'app-ma-fiche',
  imports: [CommonModule, FormsModule, SelecteurLangueComponent],
  template: `
    <main *ngIf="visible()" style="max-width:640px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--blue);margin:0 0 8px">{{ l.t('Ma fiche', 'صفحتي') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t("Ces informations s'affichent sur votre fiche publique. Votre nom, votre spécialité et votre wilaya sont modifiés par l'équipe Ndawik.",
               'تظهر هذه المعلومات في صفحتك العامة. يتم تعديل الاسم والتخصص والولاية من طرف فريق نداويك.') }}
      </p>
      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <div *ngIf="erreurChargement()" role="alert" style="display:grid;gap:12px;justify-items:start">
        <p style="color:var(--red);margin:0">{{ l.t("Impossible de charger votre fiche pour le moment. Vérifiez votre connexion puis réessayez.",
          'تعذّر تحميل صفحتك حاليًا. تحقّق من اتصالك ثم حاول مجددًا.') }}</p>
        <button type="button" class="bouton" (click)="charger()">{{ l.t('Réessayer', 'إعادة المحاولة') }}</button>
      </div>
      <form *ngIf="!charge() && !erreurChargement()" (ngSubmit)="enregistrer()" style="display:grid;gap:14px;background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:20px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Adresse', 'العنوان') }}
          <input class="champ" [(ngModel)]="adresse" name="adresse" [maxlength]="adresseMax" style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Téléphone du cabinet', 'هاتف العيادة') }}
          <input class="champ" type="tel" dir="ltr" [(ngModel)]="telephone" name="telephone" placeholder="0XX XX XX XX" style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Horaires', 'أوقات العمل') }}
          <input class="champ" [(ngModel)]="horaires" name="horaires" [maxlength]="horairesMax"
                 [placeholder]="l.t('Dim–Jeu 9h–16h', 'الأحد–الخميس 9:00–16:00')" style="color:var(--ink);font-size:1rem">
        </label>
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Présentation', 'تقديم') }} ({{ presentation.length }}/{{ presentationMax }})
          <textarea class="champ" rows="5" [(ngModel)]="presentation" name="presentation" [maxlength]="presentationMax" style="color:var(--ink);font-size:1rem"></textarea>
        </label>
        <fieldset style="border:1px solid var(--border);border-radius:var(--r12);padding:8px 12px;margin:0">
          <legend style="color:var(--text3);font-size:.9rem">{{ l.t('Langues parlées', 'اللغات المتحدَّث بها') }}</legend>
          <label *ngFor="let x of langues" style="display:inline-flex;gap:6px;align-items:center;margin:4px 14px 4px 0;color:var(--ink)">
            <input type="checkbox" [checked]="choisies().includes(x.code)" (change)="basculer(x.code)" [name]="'langue-' + x.code"> {{ l.t(x.fr, x.ar) }}
          </label>
        </fieldset>
        <div>
          <button type="submit" class="bouton" [disabled]="envoi()">
            {{ envoi() ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Enregistrer', 'حفظ') }}
          </button>
        </div>
        <p *ngIf="succes()" role="status" style="color:var(--blue);margin:0">{{ l.t('Fiche enregistrée.', 'تم حفظ الصفحة.') }}</p>
        <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:0">{{ erreur() }}</p>
      </form>
    </main>
  `,
})
export class MaFicheComponent implements OnInit {
  private service = inject(MedecinService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private api = inject(ApiDisponibleService);
  l = inject(LangueService);

  langues = LANGUES_FICHE;
  adresseMax = ADRESSE_MAX;
  horairesMax = HORAIRES_MAX;
  presentationMax = PRESENTATION_MAX;

  /** Faux tant que la route de l'API n'a pas repondu : rien n'est affiche. */
  visible = signal(false);
  charge = signal(true);
  erreurChargement = signal(false);
  envoi = signal(false);
  succes = signal(false);
  erreur = signal('');
  choisies = signal<string[]>([]);
  adresse = '';
  telephone = '';
  horaires = '';
  presentation = '';

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.erreurChargement.set(false);
    this.charge.set(true);
    this.service.maFiche().subscribe({
      next: (f) => {
        this.api.ficheMedecin.set(true);
        this.remplir(f);
        this.charge.set(false);
        this.visible.set(true);
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 404 && !e.error) {
          // Route absente (API pas encore deployee) : l'ecran reste cache.
          this.api.ficheMedecin.set(false);
          void this.router.navigateByUrl('/medecin/agenda');
        } else {
          // 500, reseau coupe, « medecin introuvable »... : message + Reessayer, menu intact.
          this.charge.set(false);
          this.erreurChargement.set(true);
          this.visible.set(true);
        }
      },
    });
  }

  basculer(code: string) {
    this.choisies.update((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  }

  enregistrer() {
    this.succes.set(false);
    this.erreur.set('');
    const tel = this.telephone.trim();
    if (tel && !telephoneAlgerienValide(tel)) {
      this.erreur.set(this.l.t('Numéro invalide (ex. 021 12 34 56, 0550 12 34 56 ou +213 550 12 34 56).',
        'رقم غير صحيح (مثال: 021 12 34 56 أو 0550 12 34 56 أو ‎+213 550 12 34 56).'));
      return;
    }
    this.envoi.set(true);
    this.service.enregistrerFiche({
      adresse: this.adresse.trim(),
      telephoneCabinet: tel,
      horaires: this.horaires.trim(),
      presentation: this.presentation.trim(),
      langues: this.langues.map((x) => x.code).filter((c) => this.choisies().includes(c)),
    }).subscribe({
      next: (f) => {
        this.envoi.set(false);
        this.remplir(f);
        this.succes.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.envoi.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 403) this.erreur.set(this.l.t('Seul un compte médecin peut modifier sa fiche.', 'يمكن للطبيب فقط تعديل صفحته.'));
        else this.erreur.set(e.error?.erreur ?? this.l.t("L'enregistrement a échoué, veuillez réessayer.", 'فشل الحفظ، حاول مجددًا.'));
      },
    });
  }

  private remplir(f: FicheInfos | null) {
    this.adresse = f?.adresse ?? '';
    this.telephone = f?.telephoneCabinet ?? '';
    this.horaires = f?.horaires ?? '';
    this.presentation = f?.presentation ?? '';
    this.choisies.set(f?.langues ?? []);
  }
}
