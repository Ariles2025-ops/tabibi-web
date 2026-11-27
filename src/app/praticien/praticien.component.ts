import { Component, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { referencerPage } from '../seo/page-seo';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { inscriptionFermee } from '../lancement';
import { SPECIALITES_SEO, WILAYAS_SEO } from '../seo/referentiel-seo';
import { HttpErrorResponse } from '@angular/common/http';
import { DemandePraticienService } from './demande-praticien.service';

/**
 * Page publique « Vous etes praticien ? » : presentation + formulaire de DEMANDE (sans compte).
 * Le praticien ne cree pas de compte lui-meme : il envoie une demande ; l'equipe verifie puis cree le compte.
 * La demande est envoyee au serveur (POST /api/public/demandes-praticien) et suivie dans /admin/demandes ;
 * en cas d'echec, le mailto vers contact@ndawik.com sert de secours.
 */
@Component({
    selector: 'app-praticien',
    imports: [CommonModule, FormsModule],
    template: `
    <main class="prat" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : null">
      <section class="prat-hero">
        <div class="prat-hero__in">
          <div class="prat-hero__txt">
            <span class="prat-eyebrow">{{ t('Espace praticien', 'فضاء الممارس') }}</span>
            <h1>{{ t('Développez votre cabinet avec', 'طوّر عيادتك مع') }} <span class="acc">{{ t('Ndawik', 'نداويك') }}</span></h1>
            <p>{{ t('Recevez vos rendez-vous en ligne, réduisez les absences grâce aux rappels automatiques et gagnez en visibilité auprès des patients de votre wilaya —', 'استقبل مواعيدك عبر الإنترنت، وقلّل الغيابات بفضل التذكيرات التلقائية، وزد ظهورك لدى مرضى ولايتك —') }} <b>{{ t('gratuitement', 'مجانًا') }}</b>.</p>
            <div class="prat-cta">
              <button type="button" class="prat-btn-blanc" (click)="versFiche()">{{ inscriptionOuverte() ? t('Trouver ma fiche et créer mon compte', 'ابحث عن صفحتي وأنشئ حسابي') : t('Trouver ma fiche et faire ma demande', 'ابحث عن صفحتي وقدّم طلبي') }}</button>
            </div>
            <p class="prat-note">{{ t("Votre compte praticien est activé après vérification de votre inscription à l'ordre par notre équipe.", 'يُفعَّل حسابك كممارس بعد أن يتحقق فريقنا من تسجيلك في الهيئة.') }}</p>
          </div>
          <ul class="prat-benef">
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> {{ t('Recevez vos RDV en ligne, 24h/24', 'استقبل مواعيدك عبر الإنترنت، على مدار الساعة') }}</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> {{ t('Rappel automatique avant chaque rendez-vous', 'تذكير تلقائي قبل كل موعد') }}</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> {{ t('Agenda et disponibilités faciles à gérer', 'جدول مواعيد وأوقات توفّر سهلة الإدارة') }}</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> {{ t('Plus de visibilité auprès des patients', 'ظهور أكبر لدى المرضى') }}</li>
          </ul>
        </div>
      </section>

      <section class="prat-sec" id="fiche">
        <div class="prat-form-wrap">
          <h2 class="prat-h2" style="margin-bottom:6px">{{ t('Retrouvez votre fiche', 'اعثر على صفحتك') }}</h2>
          <p style="text-align:center;color:var(--text3);margin:0 0 20px;font-size:14px">
            {{ inscriptionOuverte() ? t('Plus de 75 000 praticiens sont déjà référencés. Cherchez votre nom, puis créez votre compte pour gérer votre fiche.', 'أكثر من 75 000 ممارس مسجَّلون بالفعل. ابحث عن اسمك ثم أنشئ حسابك لإدارة صفحتك.') : t('Plus de 75 000 praticiens sont déjà référencés. Cherchez votre nom, puis faites votre demande : notre équipe crée votre compte.', 'أكثر من 75 000 ممارس مسجَّلون بالفعل. ابحث عن اسمك ثم قدّم طلبك: يُنشئ فريقنا حسابك.') }}
          </p>
          <div class="prat-cherche">
            <label class="pf"><span>{{ t('Votre nom', 'اسمك') }}</span>
              <input class="champ" [(ngModel)]="nomFiche" (ngModelChange)="chercher()" name="nomFiche" [placeholder]="t('Ex. Belkacem', 'مثال: بلقاسم')" autocomplete="off"></label>
            <label class="pf"><span>{{ t('Wilaya', 'الولاية') }}</span>
              <select class="champ" [(ngModel)]="wilayaFiche" (ngModelChange)="chercher()" name="wilayaFiche">
                <option value="">{{ t('Toutes les wilayas', 'كل الولايات') }}</option>
                <option *ngFor="let w of wilayas" [value]="w.code">{{ ar ? w.nomAr : w.nom }}</option>
              </select></label>
          </div>
          <p *ngIf="rechercheEnCours()" class="prat-muet">{{ t('Recherche…', 'جارٍ البحث…') }}</p>
          <p *ngIf="!rechercheEnCours() && nomFiche.trim().length > 0 && nomFiche.trim().length < 3" class="prat-muet">{{ t('Tapez au moins 3 lettres.', 'اكتب 3 أحرف على الأقل.') }}</p>
          <ul class="prat-fiches" *ngIf="fiches().length">
            <li *ngFor="let m of fiches()">
              <span class="prat-fiche__txt"><strong dir="auto">{{ m.nomComplet }}</strong>
                <small>{{ specialiteDe(m) }} · {{ m.ville || wilayaDe(m) }}</small></span>
              <button type="button" class="prat-btn-vert prat-btn-sm" (click)="cestMaFiche(m)">{{ t("C'est ma fiche", 'هذه صفحتي') }}</button>
            </li>
          </ul>
          <p *ngIf="!rechercheEnCours() && nomFiche.trim().length >= 3 && fiches().length === 0" class="prat-muet">{{ t('Aucune fiche trouvée avec ce nom.', 'لم يتم العثور على أي صفحة بهذا الاسم.') }}</p>
          <div class="prat-pas-fiche">
            <span>{{ t("Votre fiche n'apparaît pas ?", 'صفحتك غير ظاهرة؟') }}</span>
            <button type="button" class="prat-lien" (click)="sansFiche()">{{ inscriptionOuverte() ? t('Créer mon compte et déposer ma candidature', 'أنشئ حسابي وقدّم ترشحي') : t('Faire ma demande', 'قدّم طلبي') }}</button>
          </div>
        </div>
      </section>

      <section class="prat-sec">
        <h2 class="prat-h2">{{ t('Comment rejoindre Ndawik ?', 'كيف تنضم إلى نداويك؟') }}</h2>
        <div class="prat-steps">
          <div class="prat-step"><span class="prat-num">1</span><h3>{{ t('Trouvez votre fiche', 'اعثر على صفحتك') }}</h3><p>{{ inscriptionOuverte() ? t("Cherchez votre nom, puis créez votre compte en un clic (ou déposez une candidature si votre fiche n'existe pas).", 'ابحث عن اسمك ثم أنشئ حسابك بنقرة واحدة (أو قدّم ترشحًا إذا لم تكن صفحتك موجودة).') : t("Cherchez votre nom, puis faites votre demande en un clic (même si votre fiche n'existe pas) : notre équipe crée votre compte.", 'ابحث عن اسمك ثم قدّم طلبك بنقرة واحدة (حتى لو لم تكن صفحتك موجودة): يُنشئ فريقنا حسابك.') }}</p></div>
          <div class="prat-step"><span class="prat-num">2</span><h3>{{ t('Vérification', 'التحقق') }}</h3><p>{{ t("Ajoutez votre numéro d'inscription à l'ordre : notre équipe confirme que c'est bien vous.", 'أضف رقم تسجيلك في الهيئة: يتأكد فريقنا أنك أنت.') }}</p></div>
          <div class="prat-step"><span class="prat-num">3</span><h3>{{ t('Recevez vos RDV', 'استقبل مواعيدك') }}</h3><p>{{ t('Gérez vos disponibilités et recevez vos rendez-vous en ligne, avec rappels automatiques.', 'أدِر أوقات توفّرك واستقبل مواعيدك عبر الإنترنت مع تذكيرات تلقائية.') }}</p></div>
        </div>
      </section>

      <section class="prat-sec prat-sec--soft">
        <h2 class="prat-h2">{{ t('Pourquoi les praticiens choisissent Ndawik', 'لماذا يختار الممارسون نداويك') }}</h2>
        <div class="prat-feats">
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-calendar-check" aria-hidden="true"></i></span><h3>{{ t('Agenda en ligne', 'جدول مواعيد إلكتروني') }}</h3><p>{{ t('Vos créneaux se remplissent tout seuls, sans appels téléphoniques à gérer.', 'تمتلئ أوقاتك تلقائيًا دون الحاجة إلى إدارة المكالمات الهاتفية.') }}</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-bell" aria-hidden="true"></i></span><h3>{{ t("Moins d'absences", 'غيابات أقل') }}</h3><p>{{ t('Un rappel automatique est envoyé au patient dans son espace Ndawik avant chaque rendez-vous.', 'يصل المريض تذكير تلقائي في فضائه على نداويك قبل كل موعد.') }}</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-magnifying-glass" aria-hidden="true"></i></span><h3>{{ t('Plus de visibilité', 'ظهور أكبر') }}</h3><p>{{ t('Les patients de votre wilaya vous trouvent facilement par spécialité.', 'يجدك مرضى ولايتك بسهولة حسب التخصص.') }}</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-shield-halved" aria-hidden="true"></i></span><h3>{{ t('Données protégées', 'بيانات محمية') }}</h3><p>{{ t('Vos données et celles de vos patients sont chiffrées et protégées (loi 18-07).', 'بياناتك وبيانات مرضاك مشفّرة ومحمية (القانون 18-07).') }}</p></div>
        </div>
      </section>

      <!-- Formulaire de demande -->
      <section class="prat-sec" id="demande">
        <div class="prat-form-wrap">
          <h2 class="prat-h2" style="margin-bottom:6px">{{ t("Besoin d'aide ? Écrivez-nous", 'تحتاج مساعدة؟ راسلنا') }}</h2>
          <p style="text-align:center;color:var(--text3);margin:0 0 22px;font-size:14px">{{ t('Vous préférez être accompagné ? Envoyez-nous vos informations, notre équipe vous recontacte.', 'تفضّل المرافقة؟ أرسل لنا معلوماتك وسيتصل بك فريقنا.') }}</p>

          <div *ngIf="!envoye()" class="prat-form">
            <label class="pf"><span>{{ t('Nom complet *', 'الاسم الكامل *') }}</span><input class="champ" [(ngModel)]="nom" name="nom" maxlength="160" [placeholder]="t('Dr Amina Belkacem', 'د. أمينة بلقاسم')"></label>
            <label class="pf"><span>{{ t('Spécialité *', 'التخصص *') }}</span><input class="champ" [(ngModel)]="specialite" name="spec" maxlength="120" [placeholder]="t('Cardiologue, généraliste…', 'طبيب قلب، طبيب عام…')"></label>
            <label class="pf"><span>{{ t('Wilaya *', 'الولاية *') }}</span><input class="champ" [(ngModel)]="wilaya" name="wil" maxlength="60" [placeholder]="t('Alger, Oran…', 'الجزائر، وهران…')"></label>
            <label class="pf"><span>{{ t('Ville / commune', 'المدينة / البلدية') }}</span><input class="champ" [(ngModel)]="ville" name="ville" maxlength="80" [placeholder]="t('Hydra, Bab El Oued…', 'حيدرة، باب الوادي…')"></label>
            <label class="pf"><span>{{ t("N° d'inscription à l'ordre *", 'رقم التسجيل في الهيئة *') }}</span><input class="champ" [(ngModel)]="numeroOrdre" name="ord" maxlength="40" [placeholder]="t('Votre numéro d’ordre', 'رقم تسجيلك في الهيئة')"></label>
            <label class="pf"><span>{{ t('Téléphone *', 'الهاتف *') }}</span><input class="champ" [(ngModel)]="telephone" name="tel" inputmode="tel" placeholder="05 50 12 34 56"></label>
            <label class="pf"><span>{{ t('E-mail *', 'البريد الإلكتروني *') }}</span><input class="champ" [(ngModel)]="email" name="email" maxlength="160" type="email" inputmode="email" placeholder="vous@exemple.com"></label>
            <input class="prat-piege" [(ngModel)]="siteWeb" name="siteWeb" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
            <label class="pf pf--full"><span>{{ t('Message (facultatif)', 'رسالة (اختيارية)') }}</span><textarea class="champ" [(ngModel)]="message" name="msg" rows="3" maxlength="2000" [placeholder]="t('Horaires, cabinet, précisions…', 'المواعيد، العيادة، تفاصيل…')"></textarea><small class="prat-compteur" style="color:var(--text3);font-size:12px">{{ message.length }}/2000</small></label>
            <div class="pf--full">
              <p *ngIf="erreur()" class="prat-erreur" role="alert" style="color:#D21010;font-size:13px;margin:0 0 10px">{{ erreur() }}
                <button *ngIf="echecEnvoi()" type="button" class="prat-lien prat-mailto" (click)="envoyerParMail()">{{ t('Envoyer par e-mail', 'إرسال عبر البريد الإلكتروني') }}</button></p>
              <button type="button" class="prat-btn-vert" [disabled]="enCours()" (click)="envoyer()">{{ enCours() ? t('Envoi…', 'جارٍ الإرسال…') : t('Envoyer ma demande', 'إرسال طلبي') }}</button>
              <p style="color:var(--text3);font-size:12px;margin:10px 0 0">{{ t('Les champs avec * sont obligatoires.', 'الحقول المعلَّمة بـ * إلزامية.') }}</p>
            </div>
          </div>

          <div *ngIf="envoye()" class="prat-ok">
            <span class="prat-ok__ic"><i class="fa fa-circle-check" aria-hidden="true"></i></span>
            <h3>{{ t('Demande envoyée', 'تم إرسال الطلب') }}</h3>
            <p>{{ t('Demande envoyée, nous vous recontactons sous 48 h.', 'تم إرسال الطلب، سنعاود الاتصال بك خلال 48 ساعة.') }}</p>
          </div>
        </div>
      </section>
    </main>
  `,
    styles: [`
    .prat { color: var(--ink); }
    .prat-hero { background: linear-gradient(155deg, var(--vert) 0%, #0a4d3e 100%); color:#fff; }
    .prat-hero__in { max-width:1100px; margin:0 auto; padding:56px var(--gutter); display:grid; grid-template-columns:1.1fr .9fr; gap:40px; align-items:center; }
    .prat-eyebrow { display:inline-block; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#86efac; margin-bottom:12px; }
    .prat-hero h1 { margin:0 0 14px; font-size:clamp(1.8rem,3.2vw,2.6rem); line-height:1.15; font-weight:800; letter-spacing:-.02em; text-wrap:balance; }
    .prat-hero h1 .acc { color:#86efac; }
    .prat-hero p { margin:0 0 22px; font-size:1.05rem; line-height:1.55; color:rgba(255,255,255,.9); max-width:52ch; }
    .prat-note { font-size:.85rem !important; color:rgba(255,255,255,.75) !important; margin:14px 0 0 !important; }
    .prat-cta { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
    .prat-btn-blanc { background:#fff; color:var(--vert); font-weight:700; padding:13px 24px; border-radius:999px; text-decoration:none; border:0; cursor:pointer; font-size:15px; }
    .prat-btn-blanc:hover { background:#f0f7f4; }
    .prat-btn-vert { background:var(--vert); color:#fff; font-weight:700; padding:13px 26px; border-radius:999px; border:0; cursor:pointer; font-size:15px; }
    .prat-btn-vert:hover { background:#0a4d3e; }
    .prat-benef { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); border-radius:20px; padding:24px; }
    .prat-benef li { display:flex; align-items:center; gap:12px; font-weight:600; color:#fff; }
    .prat-benef svg { flex:none; width:22px; height:22px; stroke:#86efac; stroke-width:3; fill:none; }

    .prat-sec { max-width:1100px; margin:0 auto; padding:48px var(--gutter); }
    .prat-sec--soft { background:#f1f5f9; max-width:none; }
    .prat-sec--soft .prat-feats, .prat-sec--soft .prat-h2 { max-width:1100px; margin-inline:auto; }
    .prat-h2 { text-align:center; font-size:1.5rem; font-weight:800; color:var(--ink); margin:0 0 28px; letter-spacing:-.02em; }
    .prat-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .prat-step { background:#fff; border:1px solid var(--border); border-radius:16px; padding:24px; box-shadow:var(--s1); }
    .prat-num { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:#e7f3ef; color:var(--vert); font-weight:800; font-size:18px; margin-bottom:12px; }
    .prat-step h3 { margin:0 0 6px; font-size:16px; font-weight:700; color:var(--ink); }
    .prat-step p { margin:0; font-size:13px; color:var(--text3); line-height:1.55; }

    .prat-feats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .prat-feat { background:#fff; border:1px solid var(--border); border-radius:16px; padding:22px; box-shadow:var(--s1); }
    .prat-feat__ic { display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:14px; background:#e7f3ef; color:var(--vert); font-size:18px; margin-bottom:12px; }
    .prat-feat h3 { margin:0 0 6px; font-size:15px; font-weight:700; color:var(--ink); }
    .prat-feat p { margin:0; font-size:13px; color:var(--text3); line-height:1.5; }

    .prat-form-wrap { max-width:720px; margin:0 auto; background:#fff; border:1px solid var(--border); border-radius:20px; box-shadow:var(--s2); padding:28px; }
    .prat-form { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .pf { display:flex; flex-direction:column; gap:5px; font-size:13px; color:var(--text3); font-weight:600; }
    .pf--full { grid-column:1 / -1; }
    .pf .champ, .pf textarea.champ { width:100%; box-sizing:border-box; font-size:15px; color:var(--ink); }
    .prat-cherche { display:grid; grid-template-columns:2fr 1fr; gap:12px; }
    .prat-muet { color:var(--text3); font-size:14px; margin:12px 0 0; }
    .prat-fiches { list-style:none; padding:0; margin:14px 0 0; display:grid; gap:8px; max-height:380px; overflow:auto; }
    .prat-fiches li { display:flex; align-items:center; gap:12px; justify-content:space-between; padding:12px 14px; border:1px solid var(--border); border-radius:14px; flex-wrap:wrap; }
    .prat-fiche__txt { display:flex; flex-direction:column; min-width:0; flex:1; }
    .prat-fiche__txt strong { overflow-wrap:anywhere; }
    .prat-fiche__txt small { color:var(--text3); }
    .prat-btn-sm { padding:9px 16px; font-size:14px; }
    .prat-pas-fiche { display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; justify-content:center; margin-top:18px; padding-top:16px; border-top:1px solid var(--border); font-size:14px; color:var(--text3); }
    .prat-lien { background:none; border:0; padding:0; color:var(--vert); font:inherit; font-weight:700; text-decoration:underline; cursor:pointer; }
    .prat-piege { position:absolute; left:-10000px; width:1px; height:1px; opacity:0; pointer-events:none; }
    .prat-btn-vert:disabled { opacity:.6; cursor:default; }
    .prat-ok { text-align:center; padding:12px; }
    .prat-ok__ic { display:inline-flex; width:56px; height:56px; align-items:center; justify-content:center; border-radius:50%; background:#f0fdf4; color:#2E8B57; font-size:26px; margin-bottom:12px; }
    .prat-ok h3 { margin:0 0 8px; font-size:20px; font-weight:800; color:var(--ink); }
    .prat-ok p { margin:0 0 18px; color:var(--text3); font-size:14px; line-height:1.55; }

    @media (max-width:860px) {
      .prat-hero__in { grid-template-columns:1fr; gap:28px; padding:40px var(--gutter); }
      .prat-steps { grid-template-columns:1fr; }
      .prat-feats { grid-template-columns:1fr 1fr; }
      .prat-form { grid-template-columns:1fr; }
      .prat-cherche { grid-template-columns:1fr; }
    }
    @media (max-width:560px) { .prat-feats { grid-template-columns:1fr; } }
  `]
})
export class PraticienComponent {
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private annuaire = inject(AnnuaireService);
  private auth = inject(AuthService);
  private router = inject(Router);
  /** Version arabe (/ar/praticien) : langue donnee par la route. */
  readonly ar = inject(ActivatedRoute).snapshot.data['langue'] === 'ar';
  readonly pre = this.ar ? '/ar' : '';
  t(fr: string, ar: string): string { return this.ar ? ar : fr; }
  specialiteDe(m: Medecin): string {
    return this.ar ? (SPECIALITES_SEO.find((x) => x.slug === m.specialiteSlug)?.nomAr ?? m.specialiteFr) : m.specialiteFr;
  }
  wilayaDe(m: Medecin): string {
    return this.ar ? (WILAYAS_SEO.find((x) => x.code === m.wilayaCode)?.nomAr ?? m.wilayaFr) : m.wilayaFr;
  }
  readonly wilayas = [...WILAYAS_SEO].sort((a, b) => this.ar ? a.nomAr.localeCompare(b.nomAr, 'ar') : a.nom.localeCompare(b.nom, 'fr'));
  nomFiche = '';
  wilayaFiche = '';
  fiches = signal<Medecin[]>([]);
  rechercheEnCours = signal(false);
  private recherches = new Subject<string>();

  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);

  constructor() {
    referencerPage(this.document, this.title, this.meta, {
      titre: this.ar ? 'فضاء الممارس: انضم إلى نداويك' : 'Espace praticien : rejoignez Ndawik Doctor',
      description: this.ar
        ? 'طبيب أو عيادة أو صيدلية في الجزائر: استعد صفحتك وانضم إلى نداويك.'
        : 'Médecin, clinique ou pharmacie en Algérie : revendiquez votre fiche et rejoignez Ndawik Doctor.',
      chemin: '/praticien',
      ar: this.ar,
      bilingue: true,
    });
    // Recherche de fiche differee (300 ms) ; au moins 3 lettres. Les resultats viennent de l'annuaire public.
    this.recherches.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((cle) => {
        const [q, wilaya] = cle.split('|');
        if (q.length < 3) { this.rechercheEnCours.set(false); return of([] as Medecin[]); }
        this.rechercheEnCours.set(true);
        return this.annuaire.rechercher(undefined, wilaya || undefined, q).pipe(catchError(() => of([] as Medecin[])));
      }),
    ).subscribe((liste) => { this.fiches.set(liste.slice(0, 20)); this.rechercheEnCours.set(false); });
  }

  chercher() {
    this.recherches.next(this.nomFiche.trim() + '|' + this.wilayaFiche);
  }

  versFiche() {
    if (this.navigateur) document.getElementById('fiche')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Faux en phase de test : le praticien envoie une demande, l'equipe cree son compte. */
  inscriptionOuverte() { return !inscriptionFermee(); }

  /**
   * Fiche choisie : connecte, reclamation preremplie ; sinon, en phase de test, formulaire de demande prerempli
   * (l'equipe cree le compte) ; avec inscription libre, creation du compte puis retour sur la candidature.
   */
  cestMaFiche(m: Medecin) {
    this.allerVers('/medecin/candidature?fiche=' + encodeURIComponent(m.id), m);
  }

  /** Pas de fiche : candidature (connecte) ou demande (phase de test). */
  sansFiche() {
    this.allerVers('/medecin/candidature');
  }

  private async allerVers(cible: string, fiche?: Medecin) {
    await this.auth.pret();
    if (this.auth.estConnecte()) {
      this.router.navigateByUrl(cible);
    } else if (inscriptionFermee()) {
      if (fiche) {
        this.nom = fiche.nomComplet || this.nom;
        this.ville = fiche.ville || this.ville;
        this.ficheChoisie = fiche.id;
      }
      this.versDemande();
    } else {
      this.auth.sInscrireParEmail(cible);
    }
  }
  ficheChoisie = '';
  nom = ''; specialite = ''; wilaya = ''; ville = ''; numeroOrdre = ''; telephone = ''; email = ''; message = '';
  envoye = signal(false);
  erreur = signal('');
  enCours = signal(false);
  echecEnvoi = signal(false);
  /** Champ piege : invisible, reste vide pour un humain. */
  siteWeb = '';
  private demandes = inject(DemandePraticienService);

  /** Fait defiler vers le formulaire de demande. */
  versDemande() {
    if (this.navigateur) document.getElementById('demande')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Envoie la demande au serveur ; en cas d'echec, propose le mailto en secours. Pas de double envoi. */
  envoyer() {
    if (this.enCours()) return;
    if (!this.nom.trim() || !this.specialite.trim() || !this.wilaya.trim() || !this.numeroOrdre.trim() || !this.telephone.trim() || !this.email.trim()) {
      this.erreur.set(this.t('Merci de remplir les champs obligatoires (*).', 'يرجى ملء الحقول الإلزامية (*).'));
      return;
    }
    this.erreur.set('');
    this.echecEnvoi.set(false);
    this.enCours.set(true);
    this.demandes.deposer({
      nom: this.nom.trim(), specialite: this.specialite.trim(), wilaya: this.wilaya.trim(),
      ville: this.ville.trim() || undefined, numeroOrdre: this.numeroOrdre.trim(), telephone: this.telephone.trim(),
      email: this.email.trim(), message: this.message.trim() || undefined,
      ficheId: this.ficheChoisie || undefined, siteWeb: this.siteWeb,
    }).subscribe({
      next: () => { this.enCours.set(false); this.envoye.set(true); },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        this.echecEnvoi.set(true);
        this.erreur.set(e.status === 429
          ? this.t('Trop de demandes envoyées. Réessayez plus tard ou écrivez-nous par e-mail.', 'تم إرسال طلبات كثيرة. أعد المحاولة لاحقًا أو راسلنا عبر البريد الإلكتروني.')
          : e.status === 400
            ? this.t('Vérifiez vos informations : champs obligatoires remplis, téléphone et e-mail valides, textes pas trop longs.', 'تحقق من معلوماتك: الحقول الإلزامية معبأة، الهاتف والبريد الإلكتروني صالحان، والنصوص غير طويلة جدًا.')
            : this.t("Votre demande n'a pas pu être envoyée. Réessayez, ou envoyez-la par e-mail :", 'تعذّر إرسال طلبك. أعد المحاولة أو أرسله عبر البريد الإلكتروني:'));
      },
    });
  }

  /** Secours : ouvre la messagerie du praticien vers contact@ndawik.com avec la demande preremplie. */
  envoyerParMail() {
    const corps = [
      'Demande pour rejoindre Ndawik (praticien)',
      '',
      'Nom complet : ' + this.nom,
      'Spécialité : ' + this.specialite,
      'Wilaya : ' + this.wilaya,
      'Ville / commune : ' + (this.ville || '—'),
      "N° d'inscription à l'ordre : " + this.numeroOrdre,
      'Téléphone : ' + this.telephone,
      'E-mail : ' + (this.email || '—'),
      '',
      'Fiche Ndawik : ' + (this.ficheChoisie ? 'https://ndawik.com/praticiens/' + this.ficheChoisie : '—'),
      '',
      'Message : ' + (this.message || '—'),
    ].join('\n');
    const url = 'mailto:contact@ndawik.com?subject=' + encodeURIComponent('Demande praticien — ' + this.nom)
      + '&body=' + encodeURIComponent(corps);
    if (this.navigateur) window.location.href = url;
  }
}
