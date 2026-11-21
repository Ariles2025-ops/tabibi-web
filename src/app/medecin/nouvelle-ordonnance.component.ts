import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { LigneOrdonnance, OrdonnanceService } from '../ordonnances/ordonnance.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { MedecinService } from './medecin.service';
import { PatientResume, PatientsService } from './patients.service';

/** Ligne en cours de saisie ; `cle` reste stable a l'ajout/suppression de lignes (noms de champs uniques). */
interface LigneSaisie extends LigneOrdonnance {
  cle: number;
}

/**
 * Redaction d'une ordonnance par le medecin : choix du patient parmi les siens (GET /api/medecin/patients) puis,
 * facultativement, d'un de ses rendez-vous ; preremplie depuis l'agenda (?patientId=&rendezVousId=). Seul le
 * medicament est obligatoire sur chaque ligne.
 */
@Component({
    selector: 'app-nouvelle-ordonnance',
    imports: [CommonModule, FormsModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px">
        <a routerLink="/medecin/agenda" style="color:var(--blue)">{{ l.t("Retour à l'agenda", 'العودة إلى الأجندة') }}</a>
        <app-selecteur-langue />
      </div>
      <h1 style="color:var(--blue);margin:0 0 16px">{{ l.t('Nouvelle ordonnance', 'وصفة جديدة') }}</h1>

      <form (ngSubmit)="emettre()" #f="ngForm" style="display:grid;gap:16px">
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Patient', 'المريض') }}
            <select class="champ" [ngModel]="patientId()" (ngModelChange)="choisirPatient($event)" name="patientId" required
                    style="color:var(--ink);font-size:1rem">
              <option value="">{{ chargePatients() ? l.t('Chargement…', 'جارٍ التحميل…') : l.t('Choisir un patient', 'اختر مريضًا') }}</option>
              <option *ngFor="let p of options()" [value]="p.patientId">{{ libellePatient(p) }}</option>
            </select>
          </label>
          <label *ngIf="patientId()" style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Rendez-vous lié (facultatif)', 'الموعد المرتبط (اختياري)') }}
            <select class="champ" [(ngModel)]="rendezVousId" name="rendezVousId" style="color:var(--ink);font-size:1rem">
              <option value="">{{ l.t('Aucun', 'لا شيء') }}</option>
              <option *ngFor="let r of rendezVousDuPatient()" [value]="r.id">{{ r.debut | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM yyyy à HH:mm') }}</option>
            </select>
          </label>
        </div>
        <p *ngIf="!chargePatients() && options().length === 0" style="margin:0;color:var(--text3)">
          {{ l.t("Aucun patient pour le moment : un patient apparaît ici dès qu'il a un rendez-vous confirmé chez vous.", 'لا يوجد مرضى حاليًا: يظهر المريض هنا بمجرد أن يكون له موعد مؤكد عندك.') }}
        </p>

        <h2 style="font-size:1.1rem;margin:8px 0 0">{{ l.t('Prescription', 'الوصفة') }}</h2>
        <div *ngFor="let ligne of lignes; let i = index; trackBy: parCle"
             style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:12px">
          <label style="flex:2;min-width:160px;display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Médicament', 'الدواء') }}
            <input class="champ" [(ngModel)]="ligne.medicament" [name]="'medicament-' + ligne.cle" required
                   [placeholder]="l.t('Ex. Paracétamol 1 g', 'مثال: باراسيتامول 1 غ')" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="flex:2;min-width:160px;display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Posologie (facultatif)', 'الجرعة (اختياري)') }}
            <input class="champ" [(ngModel)]="ligne.posologie" [name]="'posologie-' + ligne.cle"
                   [placeholder]="l.t('Ex. 1 comprimé matin et soir', 'مثال: قرص صباحًا ومساءً')" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="flex:1;min-width:120px;display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Durée (facultatif)', 'المدة (اختياري)') }}
            <input class="champ" [(ngModel)]="ligne.duree" [name]="'duree-' + ligne.cle"
                   [placeholder]="l.t('Ex. 7 jours', 'مثال: 7 أيام')" style="color:var(--ink);font-size:1rem">
          </label>
          <button type="button" class="bouton-secondaire" (click)="supprimerLigne(i)" [disabled]="lignes.length === 1">
            {{ l.t('Supprimer', 'حذف') }}
          </button>
        </div>
        <div>
          <button type="button" class="bouton-secondaire" (click)="ajouterLigne()">{{ l.t('Ajouter une ligne', 'إضافة سطر') }}</button>
        </div>

        <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:0">{{ erreur() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || enCours()">
            {{ enCours() ? l.t('Émission…', 'جارٍ الإصدار…') : l.t("Émettre l'ordonnance", 'إصدار الوصفة') }}
          </button>
        </div>
      </form>
    </main>
  `
})
export class NouvelleOrdonnanceComponent implements OnInit {
  l = inject(LangueService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private medecin = inject(MedecinService);
  private patientsService = inject(PatientsService);
  private prochaineCle = 0;

  patientId = signal('');
  rendezVousId = '';
  patients = signal<PatientResume[]>([]);
  chargePatients = signal(false);
  private rendezVous = signal<RendezVous[]>([]);
  /** Faux tant que l'agenda n'est pas charge (ou s'il est en erreur) : on ne filtre alors pas la liste. */
  private agendaCharge = signal(false);

  /** Patients proposes, par nom : seuls ceux avec un RDV confirme ou honore (sinon l'API refuse en 403) ; un patient prerempli inconnu de la liste reste selectionnable. */
  options = computed<PatientResume[]>(() => {
    const eligibles = new Set(
      this.rendezVous().filter((r) => r.statut === 'CONFIRME' || r.statut === 'HONORE').map((r) => r.patientId),
    );
    const filtre = this.agendaCharge();
    const liste = this.patients().filter((p) => !filtre || eligibles.has(p.patientId)).sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
    const id = this.patientId();
    if (id && !liste.some((p) => p.patientId === id)) {
      liste.unshift({ patientId: id, nomComplet: this.l.t('Patient', 'مريض'), telephone: null, email: null });
    }
    return liste;
  });

  /** Rendez-vous confirmes ou honores (seuls acceptes par l'API) du patient choisi chez ce medecin, les plus recents d'abord. */
  rendezVousDuPatient = computed(() =>
    this.rendezVous()
      .filter((r) => r.patientId === this.patientId() && (r.statut === 'CONFIRME' || r.statut === 'HONORE'))
      .sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut)),
  );
  lignes: LigneSaisie[] = [this.nouvelleLigne()];
  enCours = signal(false);
  erreur = signal('');

  /** Prerempli depuis l'agenda : /medecin/ordonnance/nouvelle?patientId=...&rendezVousId=... */
  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.patientId.set(params.get('patientId') ?? '');
    this.rendezVousId = params.get('rendezVousId') ?? '';
    this.chargePatients.set(true);
    this.patientsService.patientsDuMedecin().subscribe({
      next: (repertoire) => {
        this.patients.set([...repertoire.values()]);
        this.chargePatients.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargePatients.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger la liste de vos patients.', 'تعذّر تحميل قائمة مرضاك.'));
      },
    });
    this.medecin.agenda().subscribe({ next: (liste) => {
        this.rendezVous.set(liste);
        this.agendaCharge.set(true);
      },
      error: () => undefined });
  }

  choisirPatient(patientId: string) {
    this.patientId.set(patientId);
    this.rendezVousId = '';
  }

  libellePatient(p: PatientResume): string {
    return p.telephone ? `${p.nomComplet} · ${p.telephone}` : p.nomComplet;
  }

  ajouterLigne() {
    this.lignes = [...this.lignes, this.nouvelleLigne()];
  }

  /** Conserve toujours au moins une ligne. */
  supprimerLigne(index: number) {
    if (this.lignes.length === 1) return;
    this.lignes = this.lignes.filter((_, i) => i !== index);
  }

  parCle(_index: number, ligne: LigneSaisie): number {
    return ligne.cle;
  }

  emettre() {
    const patientId = this.patientId().trim();
    const rendezVousId = this.rendezVousId.trim();
    const lignes: LigneOrdonnance[] = this.lignes.map((l) => ({
      medicament: (l.medicament ?? '').trim(),
      posologie: (l.posologie ?? '').trim(),
      duree: (l.duree ?? '').trim(),
    }));
    if (!patientId || lignes.some((l) => !l.medicament)) {
      this.erreur.set(this.l.t('Choisissez le patient et indiquez le médicament de chaque ligne.', 'اختر المريض وأدخل الدواء في كل سطر.'));
      return;
    }
    this.enCours.set(true);
    this.erreur.set('');
    this.service.emettre({ patientId, lignes, ...(rendezVousId ? { rendezVousId } : {}) }).subscribe({
      next: (o) => this.router.navigate(['/ordonnances', o.id], { state: { ordonnanceEmise: true } }),
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403 || e.status === 409) {
          this.erreur.set(
            e.error?.erreur ??
              this.l.t('Le patient doit avoir un rendez-vous confirmé ou honoré avec vous pour recevoir une ordonnance.', 'يجب أن يكون للمريض موعد مؤكد أو منجز معك ليتلقى وصفة.'),
          );
        } else if (e.status === 404) {
          this.erreur.set(this.l.t('Patient ou rendez-vous introuvable.', 'المريض أو الموعد غير موجود.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("L'émission de l'ordonnance a échoué, veuillez réessayer.", 'فشل إصدار الوصفة، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  private nouvelleLigne(): LigneSaisie {
    return { cle: this.prochaineCle++, medicament: '', posologie: '', duree: '' };
  }
}
