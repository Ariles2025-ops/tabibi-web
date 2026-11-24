import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { Rattachement } from '../secretaire/secretaire.service';
import { instantLisible, trierParDateAncienneDabord } from '../partage/dates-lisibles';

/** Forme minimale d'une adresse e-mail (le serveur verifie qu'un compte l'utilise). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
import { MedecinService } from './medecin.service';

/**
 * Secretaires du cabinet (role MEDECIN) : rattachements en cours (GET /api/medecin/secretaires), ajout par
 * l'adresse e-mail du compte Ndawik de la secretaire (POST /api/medecin/secretaires { email }) et retrait
 * confirme dans la page (POST /api/medecin/secretaires/{id}/retirer). Une secretaire rattachee agit sur l'agenda depuis l'espace secretaire.
 */
@Component({
    selector: 'app-secretaires',
    imports: [CommonModule, FormsModule, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--blue);margin:0 0 8px">{{ l.t('Mes secrétaires', 'سكرتيراتي') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t("Une secrétaire rattachée à votre cabinet consulte votre agenda, ouvre des créneaux et marque vos rendez-vous honorés ou annulés depuis son espace. Vous l'invitez ; elle n'a accès à rien tant qu'elle n'a pas accepté.", 'السكرتيرة المرتبطة بعيادتك تطّلع على مواعيدك وتفتح المواعيد المتاحة وتسجّل المواعيد التي تمّت أو أُلغيت من فضائها. أنت من يدعوها ولا يمكنها الوصول إلى شيء قبل أن تقبل.') }}
      </p>

      <form (ngSubmit)="rattacher()" style="display:grid;gap:12px;margin:0 0 28px;background:#fff;border:1px solid var(--border);border-radius:var(--r16);box-shadow:var(--s1);padding:20px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Adresse e-mail du compte Ndawik de votre secrétaire', 'البريد الإلكتروني لحساب سكرتيرتك على نداويك') }}
          <input class="champ" type="email" dir="ltr" [(ngModel)]="email" name="email" required autocomplete="off"
                 [attr.placeholder]="l.t('Ex. secretaire@exemple.dz', 'مثال: secretaire@exemple.dz')" style="color:var(--ink);font-size:1rem">
        </label>
        <p style="margin:0;color:var(--text3);font-size:.9rem">
          {{ l.t('La secrétaire doit avoir créé son compte Ndawik. Elle reçoit une invitation à accepter depuis ses notifications.', 'يجب أن تكون السكرتيرة قد أنشأت حسابها على نداويك. ستتلقى دعوة لقبولها.') }}
        </p>
        <p *ngIf="succes()" style="color:var(--blue);margin:0">{{ succes() }}</p>
        <p *ngIf="erreurFormulaire()" role="alert" style="color:var(--red);margin:0">{{ erreurFormulaire() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? l.t('Envoi…', 'جارٍ الإرسال…') : l.t('Inviter cette secrétaire', 'دعوة هذه السكرتيرة') }}</button>
        </div>
      </form>

      <h2 style="font-size:1.1rem;margin:0 0 12px;color:var(--ink)">{{ l.t('Secrétaires rattachées', 'السكرتيرات المرتبطات') }}</h2>
      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let r of rattachements()"
            style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong style="color:var(--ink)">{{ nom(r) }}</strong>
            <span *ngIf="r.secretaireNom && r.secretaireEmail" dir="ltr" style="color:var(--text3)"> · {{ r.secretaireEmail }}</span><br>
            <span *ngIf="r.accepte !== false && dateLisible(r.creeLe)" class="date-rattachement" style="color:var(--text3);font-size:.9rem">{{ l.t('Rattachée le', 'انضمت في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ r.creeLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'd MMMM yyyy à HH:mm') }}</span></span>
            <span *ngIf="r.accepte === false" style="color:#8a5a00;font-size:.9rem">
              <strong style="background:#fff5d6;border-radius:999px;padding:2px 8px">{{ l.t('En attente', 'قيد الانتظار') }}</strong>
              <ng-container *ngIf="dateLisible(r.creeLe); else sansDate">{{ l.t('Invitée le', 'دُعيت في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ r.creeLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'd MMMM yyyy à HH:mm') }}</span>{{ l.t(', pas encore acceptée', '، ولم تقبل بعد') }}</ng-container>
              <ng-template #sansDate>{{ l.t('Pas encore acceptée', 'لم تُقبل بعد') }}</ng-template>
            </span>
          </div>
          <div *ngIf="aConfirmer() === r.id" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:var(--text2);font-size:.9rem">{{ r.accepte === false ? l.t('Annuler cette invitation ?', 'إلغاء هذه الدعوة؟') : l.t('Retirer cette secrétaire ?', 'إزالة هذه السكرتيرة؟') }}</span>
            <button type="button" class="bouton" (click)="retirer(r)" [disabled]="retraitEnCours() !== null">
              {{ retraitEnCours() === r.id ? (r.accepte === false ? l.t('Annulation…', 'جارٍ الإلغاء…') : l.t('Retrait…', 'جارٍ الإزالة…')) : l.t('Oui', 'نعم') }}
            </button>
            <button type="button" class="bouton-secondaire" (click)="aConfirmer.set(null)" [disabled]="retraitEnCours() !== null">{{ l.t('Non', 'لا') }}</button>
          </div>
          <button *ngIf="aConfirmer() !== r.id" type="button" (click)="aConfirmer.set(r.id)" [disabled]="retraitEnCours() !== null"
                  style="padding:11px 18px;background:#fff;color:var(--red);border:1.5px solid var(--red-l);border-radius:999px;font:inherit;font-weight:700;cursor:pointer">
            {{ r.accepte === false ? l.t("Annuler l'invitation", 'إلغاء الدعوة') : l.t('Retirer', 'إزالة') }}
          </button>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && rattachements().length === 0">{{ l.t('Aucune secrétaire rattachée pour le moment.', 'لا توجد سكرتيرة مرتبطة حاليًا.') }}</p>
    </main>
  `
})
export class SecretairesComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private service = inject(MedecinService);

  email = '';
  /** Rattachement dont le retrait attend la confirmation (Oui / Non). */
  aConfirmer = signal<string | null>(null);
  rattachements = signal<Rattachement[]>([]);
  charge = signal(false);
  enCours = signal(false);
  /** Identifiant du rattachement dont le retrait est en cours. */
  retraitEnCours = signal<string | null>(null);
  succes = signal('');
  /** Erreur du formulaire de rattachement (distincte de celle de la liste). */
  erreurFormulaire = signal('');
  erreur = signal('');

  /** Vrai si la date est lisible (sinon elle n'est pas affichee, comme dans l'appli). */
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.secretaires().subscribe({
      next: (liste) => {
        this.rattachements.set(trierParDateAncienneDabord(liste, (r) => r.creeLe));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux médecins.', 'هذه الصفحة مخصّصة للأطباء.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos secrétaires.', 'تعذّر تحميل سكرتيراتك.'));
        }
      },
    });
  }

  rattacher() {
    const email = this.email.trim().toLowerCase();
    this.succes.set('');
    if (!EMAIL.test(email)) {
      this.erreurFormulaire.set(this.l.t("Indiquez l'adresse e-mail du compte Ndawik de votre secrétaire.", 'أدخل البريد الإلكتروني لحساب سكرتيرتك على نداويك.'));
      return;
    }
    this.erreurFormulaire.set('');
    this.enCours.set(true);
    this.service.rattacherSecretaire(email).subscribe({
      next: () => {
        this.enCours.set(false);
        this.email = '';
        this.succes.set(this.l.t("Invitation envoyée : votre secrétaire aura accès à votre agenda dès qu'elle l'aura acceptée.", 'تم إرسال الدعوة: ستصل سكرتيرتك إلى مواعيدك بمجرد قبولها.'));
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 409) {
          this.erreurFormulaire.set(e.error?.erreur ?? this.l.t('Cette secrétaire est déjà rattachée à votre cabinet.', 'هذه السكرتيرة مرتبطة بعيادتك بالفعل.'));
          this.charger();
        } else if (e.status === 400) {
          this.erreurFormulaire.set(e.error?.erreur ?? this.l.t("Aucun compte Ndawik n'utilise cette adresse e-mail.", 'لا يوجد حساب على نداويك بهذا البريد الإلكتروني.'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurFormulaire.set(this.l.t('Seul un compte médecin peut inviter une secrétaire.', 'يمكن لحساب طبيب فقط دعوة سكرتيرة.'));
        } else {
          this.erreurFormulaire.set(e.error?.erreur ?? this.l.t('Le rattachement a échoué, veuillez réessayer.', 'فشل الربط، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  retirer(rattachement: Rattachement) {
    this.retraitEnCours.set(rattachement.id);
    this.erreur.set('');
    this.succes.set('');
    this.service.retirerSecretaire(rattachement.id).subscribe({
      next: () => {
        this.retraitEnCours.set(null);
        this.aConfirmer.set(null);
        this.succes.set(rattachement.accepte === false ? this.l.t('Invitation annulée.', 'تم إلغاء الدعوة.') : this.l.t('Secrétaire retirée : elle est prévenue.', 'تمت إزالة السكرتيرة وتم إعلامها.'));
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.retraitEnCours.set(null);
        this.aConfirmer.set(null);
        if (e.status === 404) {
          // Deja retiree : la liste est rechargee.
          this.charger();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Le retrait a échoué, veuillez réessayer.', 'فشلت الإزالة، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** Nom de la secretaire, a defaut son e-mail, a defaut un identifiant abrege. */
  nom(r: Rattachement): string {
    return r.secretaireNom?.trim() || r.secretaireEmail?.trim() || `${this.l.t('Secrétaire', 'سكرتيرة')} ${abregerIdentifiant(r.secretaireId)}`;
  }
}
