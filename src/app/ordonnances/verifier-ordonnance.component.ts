import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OrdonnanceService, Verification } from './ordonnance.service';
import { DOCUMENT } from '@angular/common';
import { libelleStatutOrdonnance, libelleStatutOrdonnanceAr } from './statut-ordonnance';
import { poserLangueDocument } from '../seo/page-seo';
import { instantLisible } from '../partage/dates-lisibles';

/** Page publique : un pharmacien saisit le code imprime sur l'ordonnance pour en verifier l'authenticite. */
@Component({
    selector: 'app-verifier-ordonnance',
    imports: [CommonModule, FormsModule],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : null">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ t('Vérifier une ordonnance', 'التحقق من وصفة طبية') }}</h1>
      <p style="color:var(--text3);margin:0 0 20px">{{ t("Saisissez le code de vérification imprimé sur l'ordonnance.", 'أدخل رمز التحقق المطبوع على الوصفة الطبية.') }}</p>

      <form (ngSubmit)="verifier()" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px">
        <input class="champ" [(ngModel)]="code" name="code" [placeholder]="t('Code de vérification', 'رمز التحقق')" autocomplete="off"
               style="flex:1;min-width:200px;letter-spacing:.1em">
        <button type="submit" class="bouton" [disabled]="charge() || !code.trim()">
          {{ charge() ? t('Vérification…', 'جارٍ التحقق…') : t('Vérifier', 'تحقق') }}
        </button>
      </form>

      <ng-container *ngIf="resultat() as r">
        <ng-container [ngSwitch]="r.statut">
          <p *ngSwitchCase="'DELIVREE'" class="verif-delivree" style="color:var(--red);font-weight:600">
            <ng-container *ngIf="!ar">Déjà délivrée<ng-container *ngIf="dateLisible(r.delivreeLe)"> le {{ r.delivreeLe | date:'d MMMM yyyy' }}</ng-container> : cette ordonnance ne peut pas être délivrée une nouvelle fois.</ng-container>
            <ng-container *ngIf="ar">سبق صرفها<ng-container *ngIf="dateLisible(r.delivreeLe)"> في <span dir="ltr">{{ r.delivreeLe | date:'dd/MM/yyyy' }}</span></ng-container> : لا تصرفها مرة أخرى.</ng-container>
          </p>
          <p *ngSwitchCase="'ANNULEE'" class="verif-annulee" style="color:var(--red);font-weight:600">
            {{ t('Annulée : cette ordonnance a été annulée par le médecin et ne doit pas être délivrée.', 'ألغاها الطبيب: لا تصرفها.') }}
          </p>
          <p *ngSwitchCase="'EXPIREE'" class="verif-expiree" style="color:var(--red);font-weight:600">
            {{ t("Expirée : cette ordonnance n'est plus valable et ne doit pas être délivrée.", 'منتهية الصلاحية: الوصفة لم تعد صالحة، لا تصرفها.') }}
          </p>
          <ng-container *ngSwitchDefault>
            <p *ngIf="r.valide" style="color:var(--vert);font-weight:600">
              <ng-container *ngIf="!ar">Ordonnance authentique<ng-container *ngIf="dateLisible(r.emiseLe)">, émise le {{ r.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }}</ng-container><ng-container *ngIf="r.statut"> ({{ libelleStatut(r.statut) }})</ng-container>.</ng-container>
              <ng-container *ngIf="ar">وصفة أصلية<ng-container *ngIf="dateLisible(r.emiseLe)">، صدرت بتاريخ <span dir="ltr">{{ r.emiseLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container><ng-container *ngIf="r.statut"> ({{ libelleStatut(r.statut) }})</ng-container>.</ng-container>
            </p>
            <p *ngIf="!r.valide" class="verif-inconnu" style="color:#b3261e;font-weight:600">{{ t('Code inconnu : aucune ordonnance ne correspond à ce code.', 'رمز غير معروف: لا توجد أي وصفة تطابق هذا الرمز.') }}</p>
          </ng-container>
        </ng-container>
      </ng-container>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
    </main>
  `
})
export class VerifierOrdonnanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(OrdonnanceService);
  /** Version arabe (/ar/verifier) : langue donnee par la route. */
  readonly ar = this.route.snapshot.data['langue'] === 'ar';
  t(fr: string, ar: string): string { return this.ar ? ar : fr; }
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;

  private document = inject(DOCUMENT);

  code = '';
  charge = signal(false);
  resultat = signal<Verification | null>(null);
  erreur = signal('');

  constructor() {
    if (this.ar) poserLangueDocument(this.document, true);
  }

  /** Un lien /verifier?code=... (depuis le detail d'une ordonnance) lance la verification directement. */
  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const code = params.get('code');
      if (code) {
        this.code = code;
        this.verifier();
      }
    });
  }

  verifier() {
    const code = this.code.trim();
    if (!code) return;
    this.charge.set(true);
    this.resultat.set(null);
    this.erreur.set('');
    this.service.verifier(code).subscribe({
      next: (r) => {
        this.resultat.set(r);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Code absent : l'API peut repondre 404 plutot que { valide: false }.
          this.resultat.set({ valide: false, emiseLe: null, statut: null });
        } else {
          this.erreur.set(e.error?.erreur ?? this.t('La vérification a échoué, veuillez réessayer.', 'فشل التحقق، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  libelleStatut(statut: string | null): string {
    return this.ar ? libelleStatutOrdonnanceAr(statut) : libelleStatutOrdonnance(statut);
  }
}
