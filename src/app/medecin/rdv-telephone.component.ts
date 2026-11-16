import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { telephoneAlgerienValide } from '../fiche-medecin/fiche-infos';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { LangueService } from '../partage/langue.service';
import { RdvTelephone } from './semaine-type';

/**
 * « RDV pris au téléphone » : nom, telephone et motif d'un patient qui a appele le cabinet, pour reserver un
 * creneau libre a sa place. Aucun message n'est envoye ; un 404 (route absente) masque le formulaire sans erreur.
 */
@Component({
  selector: 'app-rdv-telephone',
  imports: [CommonModule, FormsModule],
  template: `
    <form *ngIf="api.rdvTelephone()" (ngSubmit)="envoyer()" #f="ngForm" class="rdv-telephone"
          style="display:grid;gap:10px;width:100%;margin-top:10px;max-width:420px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
        {{ l.t('Nom du patient', 'اسم المريض') }}
        <input class="champ" [(ngModel)]="nom" name="nom" required maxlength="120" style="color:var(--ink);font-size:1rem">
      </label>
      <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
        {{ l.t('Téléphone', 'الهاتف') }}
        <input class="champ" type="tel" dir="ltr" [(ngModel)]="telephone" name="telephone" required placeholder="0550 12 34 56"
               style="color:var(--ink);font-size:1rem">
      </label>
      <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
        {{ l.t('Motif (facultatif)', 'سبب الزيارة (اختياري)') }}
        <input class="champ" [(ngModel)]="motif" name="motif" maxlength="200" style="color:var(--ink);font-size:1rem">
      </label>
      <p style="margin:0;color:var(--text3);font-size:.8rem">
        {{ l.t('Aucun message n’est envoyé au patient.', 'لا تُرسل أي رسالة إلى المريض.') }}
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="submit" class="bouton" [disabled]="f.invalid || envoi()">
          {{ envoi() ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Enregistrer le rendez-vous', 'تسجيل الموعد') }}
        </button>
        <button type="button" class="bouton-secondaire" (click)="annule.emit()" [disabled]="envoi()">{{ l.t('Annuler', 'إلغاء') }}</button>
      </div>
      <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:0">{{ erreur() }}</p>
    </form>
  `,
})
export class RdvTelephoneComponent {
  private auth = inject(AuthService);
  api = inject(ApiDisponibleService);
  l = inject(LangueService);

  creneauId = input.required<string>();
  appel = input.required<(corps: RdvTelephone) => Observable<RendezVous>>();
  message403 = input('Ce cabinet ne vous est pas rattaché.');
  @Output() fait = new EventEmitter<RendezVous>();
  @Output() annule = new EventEmitter<void>();

  nom = '';
  telephone = '';
  motif = '';
  envoi = signal(false);
  erreur = signal('');

  envoyer() {
    this.erreur.set('');
    const nom = this.nom.trim();
    if (!nom) return this.erreur.set(this.l.t('Indiquez le nom du patient.', 'أدخل اسم المريض.'));
    if (!telephoneAlgerienValide(this.telephone)) {
      return this.erreur.set(this.l.t('Indiquez un numéro algérien valide (ex. 0550 12 34 56).', 'أدخل رقمًا جزائريًا صحيحًا (مثال: 0550 12 34 56).'));
    }
    const motif = this.motif.trim();
    this.envoi.set(true);
    this.appel()({
      creneauId: this.creneauId(),
      nomPatient: nom,
      telephonePatient: this.telephone.trim(),
      ...(motif ? { motif } : {}),
    }).subscribe({
      next: (r) => {
        this.envoi.set(false);
        this.fait.emit(r);
      },
      error: (e: HttpErrorResponse) => {
        this.envoi.set(false);
        if (e.status === 404) this.api.rdvTelephone.set(false); // route absente : le bouton disparait, sans erreur
        else if (e.status === 401) this.auth.seConnecter();
        else if (e.status === 403) this.erreur.set(this.message403());
        else if (e.status === 409) this.erreur.set(e.error?.erreur ?? this.l.t('Ce créneau vient d’être pris.', 'تم حجز هذا الموعد للتو.'));
        else this.erreur.set(e.error?.erreur ?? this.l.t("L'enregistrement a échoué, veuillez réessayer.", 'فشل التسجيل، حاول مجددًا.'));
      },
    });
  }
}
