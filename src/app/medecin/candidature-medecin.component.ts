import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { Candidature, DemandeCandidature, libelleStatutCandidature, libelleStatutCandidatureAr } from '../admin/admin.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { SPECIALITES_SEO, WILAYAS_SEO } from '../seo/referentiel-seo';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { MedecinService } from './medecin.service';

/** Champs du formulaire, vides ou prerempli depuis une candidature refusee. */
function formulaireVide(): DemandeCandidature {
  return { nomComplet: '', specialiteSlug: '', specialiteFr: '', wilayaCode: '', wilayaFr: '', ville: '', numeroOrdre: '', telephone: '' };
}

/**
 * Candidature du medecin a figurer dans l'annuaire : etat de la derniere candidature (GET /api/medecin/candidature),
 * formulaire de depot s'il n'en a jamais depose ou si la derniere a ete refusee (POST /api/medecin/candidature).
 */
@Component({
    selector: 'app-candidature-medecin',
    imports: [CommonModule, FormsModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--vert);margin:0 0 8px">{{ ficheReclamee ? l.t('Réclamer ma fiche', 'المطالبة بملفي') : l.t('Ma candidature', 'ترشحي') }}</h1>
        <app-selecteur-langue />
      </div>
      <p *ngIf="!ficheReclamee" style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Pour figurer sur Ndawik, déposez votre candidature : elle est examinée par un administrateur.', 'لتظهر على نداويك، أودع ترشحك: سيفحصه مسؤول.') }}
      </p>
      <p *ngIf="ficheReclamee" style="color:var(--text3);margin:0 0 20px">
        {{ l.t("Vérifiez les informations de votre fiche et ajoutez votre numéro d'inscription à l'ordre : un administrateur confirme que c'est bien vous avant de vous la confier.", 'تحقّق من معلومات ملفك وأضف رقم تسجيلك في الهيئة: يتأكد مسؤول أنك أنت صاحبه قبل أن يسلّمه لك.') }}
      </p>

      <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <section *ngIf="candidature() as c" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px;margin:0 0 20px">
        <strong>{{ c.nomComplet }}</strong>
        <span style="color:var(--text3)"> · {{ libelleStatut(c.statut) }}</span><br>
        <span style="color:var(--text3)">
          {{ nomSpecialite(c) }} · {{ c.ville || l.t('Ville non précisée', 'المدينة غير محددة') }} ({{ nomWilaya(c) }})
          · {{ l.t("N° d'ordre", 'رقم التسجيل') }} {{ c.numeroOrdre }}<ng-container *ngIf="c.telephone"> · {{ c.telephone }}</ng-container>
        </span><br>
        <span style="color:var(--text3);font-size:.9rem">
          {{ l.t('Déposée le', 'أُودع في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ c.deposeeLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'd MMMM yyyy à HH:mm') }}</span><ng-container *ngIf="c.traiteeLe"> · {{ l.t('traitée le', 'عولج في') }} <span [attr.dir]="l.ar() ? 'ltr' : null">{{ c.traiteeLe | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'd MMMM yyyy à HH:mm') }}</span></ng-container>
        </span>
        <p *ngIf="c.statut === 'EN_ATTENTE'" style="margin:10px 0 0">{{ l.t("Votre candidature est en cours d'examen.", 'ترشحك قيد الفحص.') }}</p>
        <div *ngIf="c.statut === 'VALIDEE'" style="margin:10px 0 0">
          <p style="margin:0 0 10px;color:var(--vert)">
            {{ l.t('Votre candidature a été validée : vous figurez sur Ndawik.', 'تم قبول ترشحك: أنت تظهر على نداويك.') }}
            <a [routerLink]="['/medecins', c.medecinId]" style="color:var(--vert)">{{ l.t('Voir ma fiche', 'عرض ملفي') }}</a>
          </p>
          <a class="bouton" routerLink="/medecin/agenda">{{ l.t('Ouvrir mon agenda', 'فتح جدول مواعيدي') }}</a>
        </div>
        <p *ngIf="c.statut === 'REFUSEE'" style="margin:10px 0 0;color:#b3261e">
          {{ l.t('Votre candidature a été refusée', 'تم رفض ترشحك') }}<ng-container *ngIf="c.motifRefus"> · {{ l.t('Motif', 'السبب') }} : {{ c.motifRefus }}</ng-container>.
          {{ l.t('Vous pouvez en déposer une nouvelle ci-dessous.', 'يمكنك إيداع ترشح جديد أدناه.') }}
        </p>
      </section>

      <form *ngIf="formulaireVisible()" (ngSubmit)="deposer()" #f="ngForm" style="display:grid;gap:12px">
        <h2 *ngIf="candidature()" style="font-size:1.1rem;margin:0">{{ l.t('Nouvelle candidature', 'ترشح جديد') }}</h2>
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Nom complet', 'الاسم الكامل') }} *
            <input class="champ" [(ngModel)]="demande.nomComplet" name="nomComplet" required [placeholder]="l.t('Ex. Dr Amina Belkacem', 'مثال: د. أمينة بلقاسم')" style="color:var(--tbi-ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t("Numéro d'inscription à l'ordre", 'رقم التسجيل في الهيئة') }} *
            <input class="champ" [(ngModel)]="demande.numeroOrdre" name="numeroOrdre" required style="color:var(--tbi-ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Spécialité', 'التخصص') }} *
            <select class="champ" [(ngModel)]="demande.specialiteSlug" name="specialiteSlug" required style="color:var(--tbi-ink);font-size:1rem">
              <option value="">{{ l.t('Choisissez votre spécialité', 'اختر تخصصك') }}</option>
              <option *ngFor="let sp of specialites" [value]="sp.slug">{{ l.ar() ? sp.nomAr : sp.nom }}</option>
            </select>
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Wilaya', 'الولاية') }} *
            <select class="champ" [(ngModel)]="demande.wilayaCode" name="wilayaCode" required style="color:var(--tbi-ink);font-size:1rem">
              <option value="">{{ l.t('Choisissez votre wilaya', 'اختر ولايتك') }}</option>
              <option *ngFor="let w of wilayas" [value]="w.code">{{ w.code }} · {{ l.ar() ? w.nomAr : w.nom }}</option>
            </select>
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Ville', 'المدينة') }}
            <input class="champ" [(ngModel)]="demande.ville" name="ville" style="color:var(--tbi-ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Téléphone', 'الهاتف') }}
            <input class="champ" [(ngModel)]="demande.telephone" name="telephone" type="tel" [placeholder]="l.t('Ex. 0550 00 00 00', 'مثال: 0550 00 00 00')" [attr.dir]="l.ar() ? 'ltr' : null" style="color:var(--tbi-ink);font-size:1rem">
          </label>
        </div>
        <p style="color:var(--text3);font-size:.9rem;margin:0">{{ l.t('* Champs obligatoires.', '* حقول إلزامية.') }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">
            {{ enCours() ? l.t('Envoi…', 'جارٍ الإرسال…') : (ficheReclamee ? l.t('Réclamer ma fiche', 'المطالبة بملفي') : l.t('Déposer ma candidature', 'إيداع ترشحي')) }}
          </button>
        </div>
      </form>
    </main>
  `
})
export class CandidatureMedecinComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(MedecinService);
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private roles = inject(RoleService);
  l = inject(LangueService);

  /** Listes du referentiel (slugs et codes exacts) : une specialite saisie a la main ne s'afficherait nulle part. */
  readonly specialites = SPECIALITES_SEO.filter((sp) => sp.slug !== 'pharmacie')
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  readonly wilayas = WILAYAS_SEO;

  /** Fiche de l'annuaire reclamee (parametre ?fiche=) ; null pour une nouvelle candidature. */
  ficheReclamee: string | null = null;

  /** Derniere candidature deposee ; null s'il n'y en a aucune. */
  candidature = signal<Candidature | null>(null);
  /** Vrai une fois l'etat connu : aucune candidature, ou la derniere refusee. */
  formulaireVisible = signal(false);
  demande: DemandeCandidature = formulaireVide();
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.ficheReclamee = this.route.snapshot.queryParamMap.get('fiche');
    if (this.ficheReclamee) {
      this.preremplirDepuisFiche(this.ficheReclamee);
    }
    this.charger();
  }

  /** Reprend nom, specialite et lieu de la fiche reclamee ; le medecin n'ajoute que son numero d'ordre. */
  private preremplirDepuisFiche(id: string) {
    this.annuaire.medecin(id).subscribe({
      next: (m) => {
        this.demande = {
          ...this.demande,
          nomComplet: m.nomComplet,
          specialiteSlug: m.specialiteSlug,
          specialiteFr: m.specialiteFr,
          wilayaCode: m.wilayaCode,
          wilayaFr: m.wilayaFr,
          ville: m.ville ?? '',
        };
      },
      error: () => {
        this.ficheReclamee = null;
        this.erreur.set(this.l.t('La fiche à réclamer est introuvable : vous pouvez déposer une candidature.', 'الملف المطلوب غير موجود: يمكنك إيداع ترشح.'));
      },
    });
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.maCandidature().subscribe({
      next: (c) => {
        this.charge.set(false);
        this.afficher(c);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Aucune candidature deposee : on propose le formulaire.
          this.candidature.set(null);
          this.formulaireVisible.set(true);
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Accès refusé. Connectez-vous pour envoyer votre demande.', 'تم رفض الوصول. سجّل الدخول لإرسال طلبك.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger votre candidature.', 'تعذّر تحميل ترشحك.'));
        }
      },
    });
  }

  deposer() {
    const specialiteSlug = this.demande.specialiteSlug.trim();
    const wilayaCode = this.demande.wilayaCode.trim();
    const demande: DemandeCandidature = {
      nomComplet: this.demande.nomComplet.trim(),
      specialiteSlug,
      specialiteFr: SPECIALITES_SEO.find((sp) => sp.slug === specialiteSlug)?.nom ?? this.demande.specialiteFr.trim(),
      wilayaCode,
      wilayaFr: WILAYAS_SEO.find((w) => w.code === wilayaCode)?.nom ?? this.demande.wilayaFr.trim(),
      ville: this.demande.ville.trim(),
      numeroOrdre: this.demande.numeroOrdre.trim(),
      telephone: this.demande.telephone.trim(),
      ...(this.ficheReclamee ? { ficheReclamee: this.ficheReclamee } : {}),
    };
    this.succes.set('');
    if (!demande.nomComplet || !demande.specialiteSlug || !demande.wilayaCode || !demande.numeroOrdre) {
      this.erreur.set(this.l.t("Renseignez le nom complet, la spécialité, la wilaya et le numéro d'inscription à l'ordre.", 'أدخل الاسم الكامل والتخصص والولاية ورقم التسجيل في الهيئة.'));
      return;
    }
    this.erreur.set('');
    this.enCours.set(true);
    this.service.deposerCandidature(demande).subscribe({
      next: (c) => {
        this.enCours.set(false);
        this.afficher(c);
        this.succes.set(this.l.t('Candidature déposée : elle sera examinée par un administrateur.', 'تم إيداع الترشح: سيفحصه مسؤول.'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t("Accès refusé. Votre demande n'a pas pu être envoyée.", 'تم رفض الوصول. تعذّر إرسال طلبك.'));
        } else if (e.status === 409) {
          // Une candidature est deja en attente ou validee : on l'affiche avec le motif renvoye.
          this.erreur.set(e.error?.erreur ?? this.l.t('Une candidature est déjà en attente ou validée.', 'يوجد ترشح قيد الانتظار أو معتمد بالفعل.'));
          this.service.maCandidature().subscribe({ next: (c) => this.afficher(c), error: () => undefined });
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? this.l.t('La candidature est incomplète.', 'الترشح غير مكتمل.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Le dépôt de la candidature a échoué, veuillez réessayer.', 'فشل إيداع الترشح، يرجى إعادة المحاولة.'));
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return this.l.ar() ? libelleStatutCandidatureAr(statut) : libelleStatutCandidature(statut);
  }

  /** Specialite de la candidature, en arabe si l'interface l'est (referentiel), sinon libelle francais. */
  nomSpecialite(c: Candidature): string {
    const sp = SPECIALITES_SEO.find((s) => s.slug === c.specialiteSlug);
    return this.l.ar() && sp ? sp.nomAr : c.specialiteFr || c.specialiteSlug;
  }

  nomWilaya(c: Candidature): string {
    const w = WILAYAS_SEO.find((x) => x.code === c.wilayaCode);
    return this.l.ar() && w ? w.nomAr : c.wilayaFr || c.wilayaCode;
  }

  /** Affiche la candidature ; le formulaire (prerempli) n'est propose que si elle a ete refusee. */
  private afficher(c: Candidature) {
    this.candidature.set(c);
    if (c.statut === 'VALIDEE') {
      // Le role MEDECIN vient d'etre accorde : on relit le jeton puis le profil pour ouvrir l'espace medecin.
      this.auth.actualiserRoles().then(() => this.roles.recharger());
    }
    const refusee = c.statut === 'REFUSEE';
    this.formulaireVisible.set(refusee);
    if (refusee && this.ficheReclamee) {
      // Reclamation : l'identite vient de la fiche ; on ne reprend que les champs absents de la fiche.
      this.demande = { ...this.demande, numeroOrdre: c.numeroOrdre, telephone: c.telephone ?? '' };
    } else if (refusee) {
      this.demande = {
        nomComplet: c.nomComplet,
        specialiteSlug: c.specialiteSlug,
        specialiteFr: c.specialiteFr ?? '',
        wilayaCode: c.wilayaCode,
        wilayaFr: c.wilayaFr ?? '',
        ville: c.ville ?? '',
        numeroOrdre: c.numeroOrdre,
        telephone: c.telephone ?? '',
      };
    }
  }
}
