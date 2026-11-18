import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { ProfilService } from '../moi/profil.service';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { libelleStatutOrdonnance, libelleStatutOrdonnanceAr } from './statut-ordonnance';
import { BadgeStatutOrdonnanceComponent } from './badge-statut-ordonnance.component';

@Component({
    selector: 'app-ordonnance-detail',
    imports: [CommonModule, RouterLink, BadgeStatutOrdonnanceComponent, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div class="sans-impression" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <p style="margin:0">
          <a *ngIf="!estMedecin()" routerLink="/mes-ordonnances" style="color:var(--vert)">{{ l.t('Retour à mes ordonnances', 'العودة إلى وصفاتي الطبية') }}</a>
          <a *ngIf="estMedecin()" routerLink="/medecin/ordonnances" style="color:var(--vert)">{{ l.t('Retour à mes ordonnances rédigées', 'العودة إلى الوصفات التي حرّرتها') }}</a>
        </p>
        <app-selecteur-langue />
      </div>

      <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <article *ngIf="ordonnance() as o">
        <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <h1 style="color:var(--vert);margin:0 0 4px">{{ l.t('Ordonnance', 'الوصفة الطبية') }}</h1>
            <p style="color:var(--text3);margin:0">
              {{ l.t('Émise le', 'صدرت في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ o.emiseLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM yyyy à HH:mm') }}</span> · <app-badge-statut-ordonnance [statut]="o.statut" [arabe]="l.ar()" />
            </p>
            <p *ngIf="o.statut === 'ANNULEE'" style="color:var(--red);margin:4px 0 0">{{ l.t('Annulée par le médecin', 'ألغاها الطبيب') }}<ng-container *ngIf="o.motifAnnulation"> : {{ o.motifAnnulation }}</ng-container></p>
            <p *ngIf="o.statut === 'DELIVREE'" style="color:var(--text2);margin:4px 0 0">{{ l.t('Délivrée en pharmacie', 'صُرفت في الصيدلية') }}<ng-container *ngIf="o.delivreeLe">{{ l.t(' le ', ' في ') }}<span [attr.dir]="l.ar() ? 'ltr' : null">{{ o.delivreeLe | date:(l.ar() ? 'dd/MM/yyyy' : 'd MMMM yyyy') }}</span></ng-container></p>
            <p style="color:var(--text3);margin:4px 0 0">
              {{ l.t('Praticien', 'الممارس') }} : {{ medecin()?.nomComplet ?? l.t('Votre médecin', 'طبيبك') }}
              <ng-container *ngIf="nomPatient()"><br>{{ l.t('Patient', 'المريض') }} : {{ nomPatient() }}</ng-container>
            </p>
          </div>
          <button type="button" class="bouton sans-impression" (click)="imprimer()">{{ l.t('Imprimer', 'طباعة') }}</button>
        </header>

        <p *ngIf="!o.lignes?.length" class="ordonnance-sans-medicament" style="margin:24px 0;color:var(--text3)">{{ l.t('Aucun médicament sur cette ordonnance.', 'لا يوجد أي دواء في هذه الوصفة.') }}</p>
        <table *ngIf="o.lignes?.length" style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="color:var(--text3)" [style.text-align]="l.ar() ? 'right' : 'left'">
              <th style="padding:8px;border-bottom:2px solid var(--border)">{{ l.t('Médicament', 'الدواء') }}</th>
              <th style="padding:8px;border-bottom:2px solid var(--border)">{{ l.t('Posologie', 'الجرعة') }}</th>
              <th style="padding:8px;border-bottom:2px solid var(--border)">{{ l.t('Durée', 'المدة') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of o.lignes">
              <td style="padding:8px;border-bottom:1px solid var(--border)"><strong>{{ l.medicament }}</strong></td>
              <td style="padding:8px;border-bottom:1px solid var(--border)">{{ l.posologie }}</td>
              <td style="padding:8px;border-bottom:1px solid var(--border)">{{ l.duree }}</td>
            </tr>
          </tbody>
        </table>

        <section style="border:2px dashed var(--vert);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0 0 4px;color:var(--text3)">{{ l.t('Code de vérification', 'رمز التحقق') }}</p>
          <p dir="ltr" style="margin:0;font-size:2.2rem;font-weight:700;letter-spacing:.15em;font-family:ui-monospace,monospace;color:var(--vert)">
            {{ o.codeVerification }}
          </p>
          <p class="sans-impression" style="margin:8px 0 0">
            <button type="button" class="bouton-copier bouton sans-impression" [disabled]="!o.codeVerification" (click)="copierCode(o.codeVerification)">{{ l.t('Copier le code', 'نسخ الرمز') }}</button>
          </p>
          <p *ngIf="codeCopie()" class="code-copie sans-impression" role="status" style="margin:8px 0 0;color:var(--vert)">{{ l.t('Code copié', 'تم نسخ الرمز') }}</p>
          <p *ngIf="aPresenter(o.statut)" class="a-presenter" style="margin:8px 0 0;color:var(--text3);font-size:.9rem">
            {{ l.t('À présenter en pharmacie ; vérifiable sans compte via', 'يُقدَّم في الصيدلية؛ ويمكن التحقق منه دون حساب عبر') }}
            <a routerLink="/verifier" [queryParams]="{ code: o.codeVerification }" style="color:var(--vert)">{{ l.t('Vérifier une ordonnance', 'التحقق من وصفة') }}</a>.
          </p>
          <p *ngIf="!aPresenter(o.statut)" style="margin:8px 0 0;color:var(--text3);font-size:.9rem">
            {{ l.t('Authenticité vérifiable sur Ndawik, page', 'يمكن التحقق من صحتها على نداويك، صفحة') }}
            <a routerLink="/verifier" [queryParams]="{ code: o.codeVerification }" style="color:var(--vert)">{{ l.t('Vérifier une ordonnance', 'التحقق من وصفة') }}</a>.
          </p>
        </section>
      </article>
    </main>
  `
})
export class OrdonnanceDetailComponent implements OnInit {
  l = inject(LangueService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private annuaire = inject(AnnuaireService);
  private roleService = inject(RoleService);
  private profils = inject(ProfilService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Lien de retour : liste du patient ou liste des ordonnances redigees par le medecin. */
  estMedecin = this.roleService.estMedecin;
  ordonnance = signal<Ordonnance | null>(null);
  /** Praticien emetteur, lu dans l'annuaire pour afficher son nom. */
  medecin = signal<Medecin | null>(null);
  /** Nom du patient, lu dans MON profil quand je suis ce patient ; jamais d'identifiant brut a l'impression. */
  nomPatient = signal<string | null>(null);
  charge = signal(false);
  erreur = signal('');
  codeCopie = signal(false);

  async ngOnInit() {
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? ''));
  }

  imprimer() {
    window.print();
  }

  /** Vrai tant que l'ordonnance peut encore etre presentee en pharmacie (ni annulee ni delivree), comme l'appli. */
  aPresenter(statut: string): boolean {
    return !['ANNULEE', 'DELIVREE'].includes((statut ?? '').trim().toUpperCase());
  }

  /** Copie le code de verification (comme « Copier le code » de l'appli) puis confirme « Code copié ». */
  async copierCode(code: string) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.codeCopie.set(true);
    } catch {
      this.codeCopie.set(false);
    }
  }

  libelleStatut(statut: string): string {
    return this.l.ar() ? libelleStatutOrdonnanceAr(statut) : libelleStatutOrdonnance(statut);
  }

  private charger(id: string) {
    this.ordonnance.set(null);
    this.medecin.set(null);
    this.nomPatient.set(null);
    this.erreur.set('');
    this.charge.set(true);
    this.service.parId(id).subscribe({
      next: (o) => {
        this.ordonnance.set(o);
        this.charge.set(false);
        this.chargerMedecin(o.medecinId);
        this.chargerNomPatient(o.patientId);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t("Vous n'avez pas accès à cette ordonnance.", 'ليس لديك صلاحية الاطلاع على هذه الوصفة.'));
        } else if (e.status === 404) {
          this.erreur.set(this.l.t('Ordonnance introuvable.', 'الوصفة غير موجودة.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("Impossible de charger l'ordonnance.", 'تعذّر تحميل الوصفة.'));
        }
      },
    });
  }

  /**
   * Nom du patient : GET /api/moi/profil (nomComplet), retenu seulement si ce profil est celui du patient de
   * l'ordonnance (meme sujet Keycloak) ; profil absent ou autre lecteur (medecin) : la ligne est omise.
   */
  private chargerNomPatient(patientId: string) {
    this.profils.monProfil().subscribe({
      next: (p) => this.nomPatient.set(p.utilisateurId === patientId && p.nomComplet?.trim() ? p.nomComplet.trim() : null),
      error: () => this.nomPatient.set(null),
    });
  }

  /** Nom du praticien (annuaire public) ; a defaut, « Votre médecin » (jamais l'identifiant brut). */
  private chargerMedecin(medecinId: string) {
    this.annuaire.medecin(medecinId).subscribe({
      next: (m) => this.medecin.set(m),
      error: () => this.medecin.set(null),
    });
  }
}
