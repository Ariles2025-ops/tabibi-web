import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, DemandeReponse, libelleReponses, libelleWilaya } from '../dawini/dawini.service';
import { Profil, ProfilService } from '../moi/profil.service';
import { OrdonnanceService, Verification } from '../ordonnances/ordonnance.service';
import { instantLisible, trierParDateRecenteDabord } from '../partage/dates-lisibles';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { wilayaParCode } from '../seo/referentiel-seo';

/** Champs d'une reponse en cours de saisie pour une demande. */
interface FormulaireReponse {
  /** null tant qu'aucun bouton oui / non n'est coche. */
  disponible: boolean | null;
  /** Prix en dinars : chaine vide au depart, puis nombre ou null selon le champ numerique (NumberValueAccessor). */
  prixDa: string | number | null;
  commentaire: string;
}

function formulaireVide(): FormulaireReponse {
  return { disponible: null, prixDa: '', commentaire: '' };
}

/**
 * Espace pharmacie (role PHARMACIE, Dawini) : profil de la pharmacie (nom + wilaya, GET / PUT /api/moi/profil),
 * verification / delivrance d'une ordonnance par son code, choix de la wilaya puis demandes de medicaments ouvertes
 * (GET /api/dawini/besoins?wilaya=, sans identite de patient) et, pour chacune, un formulaire de reponse
 * (POST /api/dawini/besoins/{id}/reponses) : nom de la pharmacie (celui du profil, impose par l'API), disponible oui / non,
 * prix en dinars et commentaire facultatifs. Le patient est prevenu par l'API.
 */
@Component({
    selector: 'app-espace-pharmacie',
    imports: [CommonModule, FormsModule, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 8px">
        <h1 style="color:var(--vert);margin:0">{{ l.t('Espace pharmacie', 'فضاء الصيدلية') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Demandes de médicaments publiées par les patients de votre wilaya. Répondez en indiquant la disponibilité, le prix et vos précisions : le patient est prévenu, sans que son identité vous soit communiquée.', 'طلبات الأدوية التي نشرها مرضى ولايتك. ردّ بتحديد التوفّر والسعر وما تريد إضافته: يُبلَّغ المريض دون أن تُكشف لك هويته.') }}
      </p>

      <form (ngSubmit)="chercher()" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:0 0 20px">
        <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
          {{ l.t('Wilaya *', 'الولاية *') }}
          <select class="champ" [(ngModel)]="wilayaCode" name="wilayaCode" required style="min-width:200px;color:var(--tbi-ink);font-size:1rem">
            <option value="">{{ l.t('Choisissez votre wilaya', 'اختر ولايتك') }}</option>
            <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.code }} — {{ nomWilaya(w) }}</option>
          </select>
        </label>
        <button type="submit" class="bouton" [disabled]="charge()">{{ charge() ? l.t('Recherche…', 'جارٍ البحث…') : l.t('Afficher les demandes', 'عرض الطلبات') }}</button>
      </form>

      <div *ngIf="profilEnErreur()" class="profil-erreur" role="alert"
           style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 20px;padding:14px;border:1px solid var(--border);border-radius:var(--r12);color:#b3261e">
        <span>{{ l.t("Impossible de charger le profil de votre pharmacie : vous ne pourrez pas répondre aux demandes tant qu'il n'est pas chargé.", 'تعذّر تحميل ملف صيدليتك: لن تتمكّن من الرد على الطلبات ما لم يُحمَّل.') }}</span>
        <button type="button" class="bouton bouton-reessayer-profil" (click)="chargerProfil()">{{ l.t('Réessayer', 'إعادة المحاولة') }}</button>
      </div>

      <form *ngIf="profilManquant()" class="formulaire-profil" (ngSubmit)="enregistrerProfil()"
            style="display:grid;gap:10px;margin:0 0 20px;padding:14px;border:1px solid var(--border);border-radius:var(--r12);background:var(--blue-l)">
        <strong style="color:var(--blue-d)">{{ l.t('Renseignez le nom et la wilaya de votre pharmacie', 'أدخل اسم صيدليتك وولايتها') }}</strong>
        <span style="color:var(--text2);font-size:.9rem">{{ l.t('Ils seront utilisés pour vos réponses et pour afficher directement les demandes de votre wilaya.', 'سيُستعملان في ردودك ولعرض طلبات ولايتك مباشرةً.') }}</span>
        <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Nom de la pharmacie *', 'اسم الصيدلية *') }}
            <input class="champ" [(ngModel)]="profilNom" name="profilNom" required maxlength="120" [placeholder]="l.t('Ex. Pharmacie El Amel', 'مثال: صيدلية الأمل')" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Téléphone', 'الهاتف') }}
            <input class="champ" [(ngModel)]="profilTelephone" name="profilTelephone" inputmode="tel" [placeholder]="l.t('Ex. 0550123456', 'مثال: 0550123456')" dir="ltr" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ l.t('Wilaya *', 'الولاية *') }}
            <select class="champ" [(ngModel)]="profilWilaya" name="profilWilaya" required style="color:var(--ink);font-size:1rem">
              <option value="">{{ l.t('Choisissez votre wilaya', 'اختر ولايتك') }}</option>
              <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.code }} — {{ nomWilaya(w) }}</option>
            </select>
          </label>
        </div>
        <p *ngIf="erreurProfil()" style="color:var(--red);margin:0">{{ erreurProfil() }}</p>
        <div><button type="submit" class="bouton" [disabled]="enregistrementProfil()">{{ enregistrementProfil() ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Enregistrer', 'حفظ') }}</button></div>
      </form>

      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let b of besoins()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px">
          <strong>{{ b.medicament }}</strong>
          <span style="color:var(--text3)">
            · {{ wilaya(b.wilayaCode) }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
            <ng-container *ngIf="dateLisible(b.publieLe); else dateInconnue">
              <ng-container *ngIf="!l.ar()">· publiée le {{ b.publieLe | date:'d MMMM à HH:mm' }}</ng-container>
              <ng-container *ngIf="l.ar()">· نُشر في <span dir="ltr">{{ b.publieLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container>
            </ng-container>
            <ng-template #dateInconnue>· {{ l.t('date inconnue', 'تاريخ غير معروف') }}</ng-template>
            · {{ libelleReponses(b.nombreReponses) }}
          </span>
          <p *ngIf="b.precision" style="margin:6px 0 0">{{ b.precision }}</p>

          <p *ngIf="repondus().has(b.id)" style="margin:10px 0 0;color:var(--vert)">{{ l.t('Vous avez répondu à cette demande.', 'لقد رددتَ على هذا الطلب.') }}</p>
          <p *ngIf="!repondus().has(b.id) && b.dejaRepondu" class="deja-repondu" style="margin:10px 0 0;color:var(--vert);font-weight:600">{{ l.t('Déjà répondu', 'تم الرد مسبقًا') }}</p>

          <form *ngIf="!repondus().has(b.id) && !b.dejaRepondu && formulaires[b.id] as f" (ngSubmit)="repondre(b)"
                style="display:grid;gap:10px;margin:12px 0 0;padding:12px;border:1px solid var(--border);border-radius:8px;background:#f8faf9">
            <p *ngIf="profil() as p" class="nom-reponse" style="margin:0;color:var(--text3);font-size:.9rem">{{ l.t('Répondre au nom de :', 'الرد باسم:') }} <strong>{{ p.nomComplet }}</strong></p>
            <p *ngIf="!profil() && !profilEnErreur()" class="nom-manquant" style="margin:0;color:#b3261e;font-size:.9rem">{{ l.t("Renseignez d'abord le nom de votre pharmacie ci-dessus", 'أدخل أولًا اسم صيدليتك أعلاه') }}</p>
            <p *ngIf="!profil() && profilEnErreur()" class="nom-manquant" style="margin:0;color:#b3261e;font-size:.9rem">{{ l.t("Le profil de votre pharmacie n'est pas chargé : utilisez « Réessayer » ci-dessus.", 'ملف صيدليتك غير محمَّل: استعمل «إعادة المحاولة» أعلاه.') }}</p>
            <fieldset style="border:0;padding:0;margin:0;display:flex;gap:16px;align-items:center;flex-wrap:wrap;color:var(--text3);font-size:.9rem">
              <legend style="padding:0;margin:0 0 4px">{{ l.t('Médicament disponible *', 'الدواء متوفر *') }}</legend>
              <label style="display:flex;gap:6px;align-items:center;color:var(--tbi-ink);font-size:1rem">
                <input type="radio" [name]="'disponible-' + b.id" [value]="true" [(ngModel)]="f.disponible"> {{ l.t('Oui', 'نعم') }}
              </label>
              <label style="display:flex;gap:6px;align-items:center;color:var(--tbi-ink);font-size:1rem">
                <input type="radio" [name]="'disponible-' + b.id" [value]="false" [(ngModel)]="f.disponible"> {{ l.t('Non', 'لا') }}
              </label>
            </fieldset>
            <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
              <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
                {{ l.t('Prix (DA)', 'السعر (دج)') }}
                <input class="champ" type="number" min="0" step="1" [(ngModel)]="f.prixDa" [name]="'prix-' + b.id" [placeholder]="l.t('Ex. 850', 'مثال: 850')" style="color:var(--tbi-ink);font-size:1rem">
              </label>
              <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
                {{ l.t('Commentaire', 'تعليق') }}
                <input class="champ" [(ngModel)]="f.commentaire" [name]="'commentaire-' + b.id" [placeholder]="l.t('Ex. Disponible jusqu’à 19 h', 'مثال: متوفر حتى الساعة 19')" style="color:var(--tbi-ink);font-size:1rem">
              </label>
            </div>
            <div>
              <button type="submit" class="bouton" [disabled]="enCours() !== null || !profil()">
                {{ enCours() === b.id ? l.t('Envoi…', 'جارٍ الإرسال…') : l.t('Répondre', 'رد') }}
              </button>
            </div>
          </form>
        </li>
      </ul>
      <p *ngIf="recherchee() && !charge() && !erreur() && besoins().length === 0">{{ l.t('Aucune demande ouverte dans cette wilaya.', 'لا توجد طلبات مفتوحة في هذه الولاية.') }}</p>

      <section class="bloc-delivrance" style="margin:32px 0 0;padding:16px;background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r16)">
        <h2 style="color:var(--ink);font-size:1.15rem;margin:0 0 6px">{{ l.t('Vérifier / délivrer une ordonnance', 'التحقق من وصفة وصرفها') }}</h2>
        <p style="color:var(--text3);margin:0 0 12px;font-size:.9rem">{{ l.t("Saisissez le code de 8 caractères imprimé sur l'ordonnance.", 'أدخل الرمز المكوَّن من 8 أحرف المطبوع على الوصفة.') }}</p>
        <form (ngSubmit)="verifierOrdonnance()" style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="champ" [(ngModel)]="codeOrdonnance" name="codeOrdonnance" maxlength="8" autocomplete="off"
                 [placeholder]="l.t('Code de vérification', 'رمز التحقق')" dir="ltr" style="flex:1;min-width:180px;letter-spacing:.15em;text-transform:uppercase;color:var(--ink);font-size:1rem">
          <button type="submit" class="bouton" [disabled]="verificationEnCours() || codeOrdonnance.trim().length !== 8">
            {{ verificationEnCours() ? l.t('Vérification…', 'جارٍ التحقق…') : l.t('Vérifier', 'تحقق') }}
          </button>
        </form>

        <div *ngIf="verification() as v" class="resultat-verification" style="margin:12px 0 0">
          <ng-container [ngSwitch]="v.statut">
            <p *ngSwitchCase="'DELIVREE'" class="delivree-ok" [style.color]="vientDeDelivrer() ? 'var(--green)' : 'var(--red)'" style="font-weight:600;margin:0">
              <ng-container *ngIf="vientDeDelivrer()">
                <ng-container *ngIf="!l.ar()">Ordonnance délivrée<ng-container *ngIf="dateLisible(v.delivreeLe)"> le {{ v.delivreeLe | date:'d MMMM yyyy à HH:mm' }}</ng-container>.</ng-container>
                <ng-container *ngIf="l.ar()">تم صرف الوصفة<ng-container *ngIf="dateLisible(v.delivreeLe)"> في <span dir="ltr">{{ v.delivreeLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container>.</ng-container>
              </ng-container>
              <ng-container *ngIf="!vientDeDelivrer()">
              <ng-container *ngIf="!l.ar()">Déjà délivrée<ng-container *ngIf="dateLisible(v.delivreeLe)"> le {{ v.delivreeLe | date:'d MMMM yyyy à HH:mm' }}</ng-container> : ne pas délivrer une nouvelle fois.</ng-container>
              <ng-container *ngIf="l.ar()">سبق صرفها<ng-container *ngIf="dateLisible(v.delivreeLe)"> في <span dir="ltr">{{ v.delivreeLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container> : لا تصرفها مرة أخرى.</ng-container>
              </ng-container>
            </p>
            <p *ngSwitchCase="'ANNULEE'" style="color:var(--red);font-weight:600;margin:0">{{ l.t('Annulée par le médecin : ne pas délivrer.', 'ألغاها الطبيب: لا تصرفها.') }}</p>
            <p *ngSwitchCase="'EXPIREE'" style="color:var(--red);font-weight:600;margin:0">{{ l.t('Expirée : ordonnance plus valable, ne pas délivrer.', 'منتهية الصلاحية: الوصفة لم تعد صالحة، لا تصرفها.') }}</p>
            <ng-container *ngSwitchDefault>
              <ng-container *ngIf="v.valide">
                <p style="color:var(--green);font-weight:600;margin:0 0 10px">
                  <ng-container *ngIf="dateLisible(v.emiseLe)">
                    <ng-container *ngIf="!l.ar()">Ordonnance valide, émise le {{ v.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }}.</ng-container>
                    <ng-container *ngIf="l.ar()">وصفة صالحة، صدرت في <span dir="ltr">{{ v.emiseLe | date:'dd/MM/yyyy HH:mm' }}</span>.</ng-container>
                  </ng-container>
                  <ng-container *ngIf="!dateLisible(v.emiseLe)">{{ l.t('Ordonnance valide.', 'وصفة صالحة.') }}</ng-container>
                </p>
                <button type="button" class="bouton" (click)="delivrer()" [disabled]="delivranceEnCours()">
                  {{ delivranceEnCours() ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Marquer comme délivrée', 'تسجيل الصرف') }}
                </button>
              </ng-container>
              <p *ngIf="!v.valide" style="color:var(--red);font-weight:600;margin:0">{{ l.t('Code inconnu.', 'رمز غير معروف.') }}</p>
            </ng-container>
          </ng-container>
        </div>
        <p *ngIf="succesOrdonnance()" style="color:var(--green);margin:10px 0 0">{{ succesOrdonnance() }}</p>
        <p *ngIf="erreurOrdonnance()" role="alert" style="color:var(--red);margin:10px 0 0">{{ erreurOrdonnance() }}</p>
      </section>
    </main>
  `
})
export class EspacePharmacieComponent implements OnInit {
  /** Nom de la wilaya (referentiel) plutot que son code. */
  wilaya = (code: string | null | undefined): string => libelleWilaya(code, this.l.ar());
  l = inject(LangueService);
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;
  private auth = inject(AuthService);
  private service = inject(DawiniService);
  private http = inject(HttpClient);
  private profils = inject(ProfilService);
  private ordonnances = inject(OrdonnanceService);

  wilayaCode = '';
  /** Wilayas du referentiel (assets/referentiel.json) : code attendu par l'API + libelle FR. */
  wilayas = signal<{ code: string; nom: string }[]>([]);
  besoins = signal<Besoin[]>([]);
  /** Reponse en cours de saisie, par identifiant de demande. */
  formulaires: Record<string, FormulaireReponse> = {};
  /** Demandes auxquelles j'ai repondu pendant cette visite (le formulaire est remplace par une mention). */
  repondus = signal<Set<string>>(new Set());
  /** Vrai une fois une recherche lancee (etat vide affiche seulement apres). */
  recherchee = signal(false);
  charge = signal(false);
  /** Identifiant de la demande dont la reponse est en cours d'envoi. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  /** Profil de la pharmacie (GET /api/moi/profil) : nom et wilaya ; null tant qu'il n'est pas connu ou s'il manque. */
  profil = signal<Profil | null>(null);
  /** Vrai si le profil n'a jamais ete renseigne (404) : un petit formulaire est propose. */
  profilManquant = signal(false);
  /** Vrai si la lecture du profil a echoue autrement que par 404 / 401 : message et bouton « Réessayer ». */
  profilEnErreur = signal(false);
  profilNom = '';
  profilTelephone = '';
  profilWilaya = '';
  enregistrementProfil = signal(false);
  erreurProfil = signal('');

  /** Verification / delivrance d'une ordonnance par son code. */
  codeOrdonnance = '';
  verification = signal<Verification | null>(null);
  /** Vrai juste apres « Marquer comme delivree » : le statut DELIVREE est alors un succes, pas un refus (comme l'appli). */
  vientDeDelivrer = signal(false);
  /** Code effectivement verifie (celui qu'on marquera delivre). */
  private codeVerifie = '';
  verificationEnCours = signal(false);
  delivranceEnCours = signal(false);
  succesOrdonnance = signal('');
  erreurOrdonnance = signal('');

  ngOnInit() {
    this.http
      .get<{ wilayas?: { code: string; nom: string }[] }>('/assets/referentiel.json')
      .pipe(catchError(() => of({ wilayas: [] })))
      .subscribe((ref) => this.wilayas.set(ref?.wilayas ?? []));
    this.chargerProfil();
  }

  /** Lit le profil : prerempli le nom et la wilaya, et affiche directement les demandes de cette wilaya. */
  chargerProfil() {
    this.profilEnErreur.set(false);
    this.profils.monProfil().subscribe({
      next: (p) => this.appliquerProfil(p),
      error: (e: HttpErrorResponse) => {
        if (e.status === 404) this.profilManquant.set(true);
        else if (e.status === 401) this.auth.seConnecter();
        else this.profilEnErreur.set(true);
      },
    });
  }

  private appliquerProfil(p: Profil) {
    this.profil.set(p);
    this.profilManquant.set(false);
    this.profilEnErreur.set(false);
    if (p.wilayaCode) {
      this.wilayaCode = p.wilayaCode;
      this.charger(p.wilayaCode);
    }
  }

  enregistrerProfil() {
    const nomComplet = this.profilNom.trim();
    const wilayaCode = this.profilWilaya.trim();
    const telephone = this.profilTelephone.replace(/\D/g, '');
    if (nomComplet.length < 2) {
      this.erreurProfil.set(this.l.t('Indiquez le nom de votre pharmacie.', 'أدخل اسم صيدليتك.'));
      return;
    }
    if (!wilayaCode) {
      this.erreurProfil.set(this.l.t('Choisissez la wilaya de votre pharmacie.', 'اختر ولاية صيدليتك.'));
      return;
    }
    this.erreurProfil.set('');
    this.enregistrementProfil.set(true);
    this.profils
      .enregistrer({ nomComplet, telephone: telephone || null, dateNaissance: null, wilayaCode, langue: this.l.ar() ? 'ar' : 'fr' })
      .subscribe({
        next: (p) => {
          this.enregistrementProfil.set(false);
          this.appliquerProfil(p);
        },
        error: (e: HttpErrorResponse) => {
          this.enregistrementProfil.set(false);
          this.erreurProfil.set(e.error?.erreur ?? this.l.t("L'enregistrement du profil a échoué, veuillez réessayer.", 'فشل حفظ الملف، يرجى المحاولة مرة أخرى.'));
        },
      });
  }

  verifierOrdonnance() {
    const code = this.codeOrdonnance.trim().toUpperCase();
    if (code.length !== 8) return;
    this.verificationEnCours.set(true);
    this.verification.set(null);
    this.succesOrdonnance.set('');
    this.erreurOrdonnance.set('');
    this.ordonnances.verifier(code).subscribe({
      next: (v) => {
        this.verificationEnCours.set(false);
        this.codeVerifie = code;
        this.vientDeDelivrer.set(false);
        this.verification.set(v);
      },
      error: (e: HttpErrorResponse) => {
        this.verificationEnCours.set(false);
        if (e.status === 404) {
          this.vientDeDelivrer.set(false);
          this.verification.set({ valide: false, emiseLe: null, statut: null });
        } else {
          this.erreurOrdonnance.set(e.error?.erreur ?? this.l.t('La vérification a échoué, veuillez réessayer.', 'فشل التحقق، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  delivrer() {
    const v = this.verification();
    if (!v || !this.codeVerifie) return;
    this.delivranceEnCours.set(true);
    this.succesOrdonnance.set('');
    this.erreurOrdonnance.set('');
    this.ordonnances.delivrer(this.codeVerifie).subscribe({
      next: (d) => {
        this.delivranceEnCours.set(false);
        this.vientDeDelivrer.set(true);
        this.verification.set({ ...v, statut: d.statut, delivreeLe: d.delivreeLe });
        this.succesOrdonnance.set(this.l.t('Ordonnance marquée comme délivrée.', 'تم تسجيل صرف الوصفة.'));
      },
      error: (e: HttpErrorResponse) => {
        this.delivranceEnCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurOrdonnance.set(e.error?.erreur ?? this.l.t('La délivrance a échoué, veuillez réessayer.', 'فشل تسجيل الصرف، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  chercher() {
    const wilaya = this.wilayaCode.trim();
    this.succes.set('');
    if (!wilaya) {
      this.erreur.set(this.l.t('Choisissez votre wilaya.', 'اختر ولايتك.'));
      return;
    }
    this.charger(wilaya);
  }

  /** Recharge les demandes ouvertes de la wilaya ; `motif` est un message d'erreur a conserver a l'ecran. */
  charger(wilaya: string, motif = '') {
    this.charge.set(true);
    this.recherchee.set(true);
    this.erreur.set(motif);
    this.service.besoinsOuverts(wilaya).subscribe({
      next: (liste) => {
        // Les plus recentes d'abord ; un formulaire vierge par demande nouvelle.
        this.besoins.set(trierParDateRecenteDabord(liste, (b) => b.publieLe));
        for (const b of liste) this.formulaires[b.id] ??= formulaireVide();
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        this.besoins.set([]);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux pharmacies.', 'هذه الصفحة مخصّصة للصيدليات.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger les demandes.', 'تعذّر تحميل الطلبات.'));
        }
      },
    });
  }

  repondre(b: Besoin) {
    const f = this.formulaires[b.id] ?? formulaireVide();
    // Le nom vient du profil (l'API l'impose) ; sans profil, on oriente vers le formulaire de profil.
    const nomPharmacie = this.profil()?.nomComplet?.trim() ?? '';
    const prixSaisi = f.prixDa === null || f.prixDa === undefined ? '' : String(f.prixDa).trim();
    const prixDa = prixSaisi === '' ? null : Number(prixSaisi);
    const commentaire = f.commentaire.trim();
    this.succes.set('');
    if (!this.profil()) {
      this.erreur.set(
        this.profilEnErreur()
          ? this.l.t("Le profil de votre pharmacie n'est pas chargé : utilisez « Réessayer » ci-dessus.", 'ملف صيدليتك غير محمَّل: استعمل «إعادة المحاولة» أعلاه.')
          : this.l.t("Renseignez d'abord le nom de votre pharmacie ci-dessus.", 'أدخل أولًا اسم صيدليتك أعلاه.'),
      );
      return;
    }
    if (f.disponible === null) {
      this.erreur.set(this.l.t('Indiquez si le médicament est disponible.', 'حدّد ما إذا كان الدواء متوفرًا.'));
      return;
    }
    if (prixDa !== null && (!Number.isInteger(prixDa) || prixDa < 0)) {
      this.erreur.set(this.l.t('Indiquez un prix en dinars valide (nombre entier positif ou nul).', 'أدخل سعرًا صحيحًا بالدينار (عدد صحيح موجب أو صفر).'));
      return;
    }
    const demande: DemandeReponse = { nomPharmacie, disponible: f.disponible, prixDa, commentaire: commentaire || null };
    this.erreur.set('');
    this.enCours.set(b.id);
    this.service.repondre(b.id, demande).subscribe({
      next: () => {
        this.enCours.set(null);
        this.repondus.update((ids) => new Set(ids).add(b.id));
        this.succes.set(this.l.t(`Réponse envoyée pour « ${b.medicament} » : le patient est prévenu.`, `تم إرسال الرد بخصوص «${b.medicament}»: المريض مُبلَّغ.`));
        this.charger(b.wilayaCode);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Seul un compte pharmacie peut répondre à une demande.', 'وحده حساب الصيدلية يمكنه الرد على طلب.'));
        } else if (e.status === 409 || e.status === 404) {
          // Demande cloturee entre-temps ou deja repondue : motif affiche et liste rechargee.
          this.charger(b.wilayaCode, e.error?.erreur ?? this.l.t("Cette demande n'accepte plus de réponse.", 'لم يعد هذا الطلب يقبل ردودًا.'));
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? this.l.t('La réponse est incomplète.', 'الرد غير مكتمل.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t("L'envoi de la réponse a échoué, veuillez réessayer.", 'فشل إرسال الرد، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /** Nom de la wilaya du referentiel dans la langue d'affichage (code et nom francais sinon). */
  nomWilaya(w: { code: string; nom: string }): string {
    return this.l.ar() ? (wilayaParCode(w.code)?.nomAr ?? w.nom) : w.nom;
  }

  libelleReponses(nombre: number): string {
    return libelleReponses(nombre, this.l.ar());
  }
}
