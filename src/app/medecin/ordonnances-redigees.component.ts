import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { AuthService } from '../auth/auth.service';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { estStatutOrdonnance, libelleStatutOrdonnance } from '../ordonnances/statut-ordonnance';
import { BadgeStatutOrdonnanceComponent } from '../ordonnances/badge-statut-ordonnance.component';
import { MedecinService } from './medecin.service';
import { PatientsService, RepertoirePatients, nomPatient } from './patients.service';
import { instantLisible } from '../partage/dates-lisibles';

/** Ordonnances emises par le medecin connecte (GET /api/medecin/ordonnances), avec le nom du patient. */
@Component({
    selector: 'app-ordonnances-redigees',
    imports: [CommonModule, FormsModule, RouterLink, BadgeStatutOrdonnanceComponent, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <h1 style="color:var(--blue);margin:0">{{ l.t('Mes ordonnances rédigées', 'وصفاتي التي حررتها') }}</h1>
        <app-selecteur-langue />
        <a class="bouton" routerLink="/medecin/ordonnance/nouvelle">{{ l.t('Rédiger une ordonnance', 'تحرير وصفة') }}</a>
      </div>

      <p *ngIf="charge()" style="color:var(--text3)">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="erreur()" role="alert" style="color:var(--red)">{{ erreur() }}</p>
      <p *ngIf="succes()" role="status" data-testid="succes-annulation" style="color:var(--vert)">{{ l.t('Ordonnance annulée.', 'تم إلغاء الوصفة.') }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let o of ordonnances()" style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);box-shadow:var(--s1)">
          <a [routerLink]="['/ordonnances', o.id]"
             style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;color:inherit;text-decoration:none">
            <span>
              <strong style="color:var(--ink)"><i class="fa fa-user fa-xs" style="color:var(--blue)"></i> {{ nom(o.patientId) }}</strong><br>
              <span style="color:var(--text3)"><span [attr.dir]="l.ar() ? 'ltr' : null">{{ o.emiseLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM yyyy à HH:mm') }}</span></span>
              <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
                <app-badge-statut-ordonnance [statut]="o.statut" [arabe]="l.ar()" />
                <span *ngIf="est(o.statut, 'ANNULEE') && o.motifAnnulation" style="color:var(--text3);font-size:13px">{{ l.t('Motif :', 'السبب:') }} {{ o.motifAnnulation }}</span>
                <span *ngIf="est(o.statut, 'DELIVREE') && dateLisible(o.delivreeLe)" style="color:var(--text3);font-size:13px">{{ l.t('le', 'في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ o.delivreeLe | date:(l.ar() ? 'dd/MM/yyyy' : 'd MMMM yyyy') }}</span></span>
              </span>
            </span>
            <code style="font-size:1rem;letter-spacing:.1em;color:var(--blue-d);background:var(--blue-l);border-radius:999px;padding:4px 12px">{{ o.codeVerification }}</code>
          </a>
          <div *ngIf="est(o.statut, 'EMISE')" style="padding:0 16px 14px">
            <button *ngIf="aAnnuler() !== o.id" type="button" class="bouton-secondaire" (click)="demanderAnnulation(o)"
                    [disabled]="enCours() !== null" style="color:var(--red)">{{ l.t('Annuler', 'إلغاء') }}</button>
            <div *ngIf="aAnnuler() === o.id" class="confirmation-annulation"
                 style="background:var(--red-l);border-radius:var(--r12);padding:12px;display:grid;gap:8px">
              <strong style="color:var(--red)">{{ l.t('Annuler cette ordonnance ? Le patient en sera informé et elle ne pourra plus être délivrée.', 'إلغاء هذه الوصفة؟ سيتم إعلام المريض ولن يمكن صرفها بعد الآن.') }}</strong>
              <label style="display:grid;gap:4px;color:var(--text2);font-size:14px">{{ l.t('Motif (facultatif)', 'السبب (اختياري)') }}
                <textarea class="champ" rows="2" [(ngModel)]="motif" name="motif-{{ o.id }}" maxlength="500"></textarea>
              </label>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="bouton" (click)="confirmerAnnulation(o)" [disabled]="enCours() !== null">
                  {{ enCours() === o.id ? l.t('Annulation…', 'جارٍ الإلغاء…') : l.t('Oui, annuler', 'نعم، إلغاء') }}
                </button>
                <button type="button" class="bouton-secondaire" (click)="aAnnuler.set(null)" [disabled]="enCours() !== null">{{ l.t('Non', 'لا') }}</button>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <p *ngIf="!charge() && !erreur() && ordonnances().length === 0">{{ l.t('Aucune ordonnance rédigée pour le moment.', 'لا توجد وصفات محرَّرة حاليًا.') }}</p>
    </main>
  `
})
export class OrdonnancesRedigeesComponent implements OnInit {
  l = inject(LangueService);
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private patients = inject(PatientsService);

  ordonnances = signal<Ordonnance[]>([]);
  repertoire = signal<RepertoirePatients>(new Map());
  charge = signal(false);
  erreur = signal('');
  /** Vrai juste apres une annulation reussie : « Ordonnance annulée. », comme l'appli. */
  succes = signal(false);
  /** Ordonnance dont l'annulation attend confirmation (Oui / Non), ou null. */
  aAnnuler = signal<string | null>(null);
  /** Ordonnance en cours d'annulation cote serveur, ou null. */
  enCours = signal<string | null>(null);
  motif = '';

  ngOnInit() {
    this.patients.patientsDuMedecin().subscribe({ next: (r) => this.repertoire.set(r), error: () => undefined });
    this.charge.set(true);
    this.service.ordonnancesRedigees().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.ordonnances.set([...liste].sort((a, b) => Date.parse(b.emiseLe) - Date.parse(a.emiseLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux médecins.', 'هذه الصفحة مخصّصة للأطباء.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos ordonnances.', 'تعذّر تحميل وصفاتك.'));
        }
      },
    });
  }

  nom(patientId: string): string {
    return nomPatient(this.repertoire(), patientId, this.l.ar());
  }

  readonly est = estStatutOrdonnance;

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut);
  }

  demanderAnnulation(o: Ordonnance) {
    this.motif = '';
    this.erreur.set('');
    this.succes.set(false);
    this.aAnnuler.set(o.id);
  }

  confirmerAnnulation(o: Ordonnance) {
    this.enCours.set(o.id);
    this.erreur.set('');
    this.service.annulerOrdonnance(o.id, this.motif.trim()).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.aAnnuler.set(null);
        this.succes.set(true);
        this.ordonnances.update((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        this.erreur.set(e.error?.erreur ?? this.l.t("L'annulation de l'ordonnance a échoué, veuillez réessayer.", 'فشل إلغاء الوصفة، يرجى المحاولة مرة أخرى.'));
      },
    });
  }
}
