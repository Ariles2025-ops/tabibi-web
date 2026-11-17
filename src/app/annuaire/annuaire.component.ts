import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ACCUEIL_AR, ACCUEIL_FR, referencerAccueil } from '../seo/marque';
import { SPECIALITES_SEO, WILAYAS_SEO } from '../seo/referentiel-seo';
import { VISIO_ACTIVE } from '../lancement';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AnnuaireService, Medecin } from './annuaire.service';
import { AuthService } from '../auth/auth.service';

/** Une wilaya du referentiel (assets/referentiel.json) : code officiel + libelle FR. */
interface OptionWilaya { code: string; nom: string; }
/** Une specialite du referentiel : slug utilise par l'API + libelle FR. */
interface OptionSpecialite { slug: string; nom: string; }
/** Contenu de assets/referentiel.json. */
interface Referentiel { wilayas: OptionWilaya[]; specialites: OptionSpecialite[]; }

/** Libelles arabes des wilayas (par code) et des specialites (par slug), repris du referentiel SEO. */
const WILAYAS_AR = new Map(WILAYAS_SEO.map((w) => [w.code, w.nomAr]));
const SPECIALITES_AR = new Map([...SPECIALITES_SEO.map((s): [string, string] => [s.slug, s.nomAr]), ['autre', 'تخصص آخر']]);

/** Lien Google Play de l'appli Ndawik (bouton du hero). */
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=dz.tabibi.app';

/**
 * Accueil public, en francais (/) et en arabe (/ar, donnee de route `langue: 'ar'`) : la meme page,
 * memes sections dans le meme ordre, traduite et mise en page de droite a gauche en arabe.
 * Le design (hero, cartes) est repris de l'ancien site (legacy-accueil.css) ; la recherche interroge l'API v2.
 */
@Component({
    selector: 'app-annuaire',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main id="contenu" [attr.dir]="ar() ? 'rtl' : null" [attr.lang]="ar() ? 'ar' : null">
    <section class="hero-mobile">
      <div class="hz">
        <div class="hero-col-l">
          <div class="hero-badge"><span class="hero-dot" aria-hidden="true"></span><span>{{ t('75 000+ médecins référencés en Algérie', 'أكثر من 75 000 طبيب مُدرَج في الجزائر') }}</span></div>
          <h1 class="hero-title">{{ t('Votre santé ne devrait jamais attendre.', 'صحتك لا تحتمل الانتظار.') }}</h1>
          <p class="hero-sub">{{ t('Prenez rendez-vous avec un médecin partout en Algérie — 69 wilayas, 24h/24.', 'احجز موعدك مع طبيب في أي مكان من الجزائر — 69 ولاية، على مدار الساعة.') }}</p>
          <div class="dl-search" role="search" id="hero-recherche">
            <div class="dl-field dl-field--text" style="position:relative">
              <i class="fa fa-magnifying-glass dl-ic" aria-hidden="true"></i>
              <input class="dl-input" type="search" [(ngModel)]="q" (input)="surSaisie()" (focus)="surFocus()" (blur)="masquerBientot()"
                     (keyup.enter)="lancerRecherche()"
                     [placeholder]="t('Nom du médecin', 'اسم الطبيب')" autocomplete="off" [attr.aria-label]="t('Nom du médecin', 'اسم الطبيب')"
                     role="combobox" aria-autocomplete="list" aria-controls="ac-suggestions" [attr.aria-expanded]="suggestionsVisibles() && suggestions().length > 0">
              <ul id="ac-suggestions" class="ac-liste" role="listbox" *ngIf="connecte() && suggestionsVisibles() && suggestions().length">
                <li *ngFor="let s of suggestions()" role="option">
                  <a class="ac-item" [routerLink]="['/medecins', s.id]" (click)="choisirSuggestion()">
                    <span class="ac-nom" dir="auto">{{ s.nomComplet }}</span>
                    <span class="ac-meta">{{ specialiteDe(s) }} · {{ wilayaDe(s) }}</span>
                  </a>
                </li>
              </ul>
            </div>
            <div class="dl-sep" aria-hidden="true"></div>
            <label class="dl-field dl-field--wil">
              <i class="fa fa-location-dot dl-ic" aria-hidden="true"></i>
              <select class="dl-select" [(ngModel)]="wilaya" (change)="surFiltre()" [attr.aria-label]="t('Où ?', 'أين؟')">
                <option value="">{{ t('Où ?', 'أين؟') }}</option>
                <option *ngFor="let w of wilayas()" [value]="w.code">{{ nomWilaya(w.code, w.nom) }}</option>
              </select>
            </label>
            <button type="button" class="dl-btn" (click)="lancerRecherche()" [attr.aria-label]="t('Rechercher', 'بحث')">
              <span>{{ t('Rechercher', 'بحث') }}</span><i class="fa fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="dl-refine">
            <label class="dl-chip">
              <i class="fa fa-stethoscope" aria-hidden="true"></i>
              <select [(ngModel)]="specialite" (change)="surFiltre()" [attr.aria-label]="t('Spécialité', 'التخصص')">
                <option value="">{{ t('Toutes les spécialités', 'جميع التخصصات') }}</option>
                <option *ngFor="let s of specialites()" [value]="s.slug">{{ nomSpecialite(s.slug, s.nom) }}</option>
              </select>
            </label>
          </div>
          <div class="hero-stores">
            <a class="store" [href]="googlePlay" target="_blank" rel="noopener">
              <i class="fa-brands fa-google-play" aria-hidden="true"></i>
              <span><small>{{ t('Disponible sur', 'متوفر على') }}</small>Google Play</span>
            </a>
            <span class="store store--bientot" aria-disabled="true">
              <i class="fa-brands fa-apple" aria-hidden="true"></i>
              <span><small>{{ t('Bientôt sur', 'قريبًا على') }}</small>App Store</span>
            </span>
          </div>
          <div class="v4-paynote"><i class="fa fa-credit-card" aria-hidden="true"></i> <span>{{ t('Paiement au cabinet — espèces ou carte Chifa. Aucun prépaiement en ligne.', 'الدفع في العيادة — نقدًا أو ببطاقة الشفاء. لا دفع مسبق عبر الإنترنت.') }}</span></div>
        </div>

        <div class="hero-stats" *ngIf="!enRecherche">
          <div class="hero-stat"><div class="hs-n" dir="ltr">75 000+</div><div class="hs-l">{{ t('Médecins référencés', 'طبيب مُدرَج') }}</div></div>
          <div class="hero-stat"><div class="hs-n">69</div><div class="hs-l">{{ t('Wilayas', 'ولاية') }}</div></div>
          <div class="hero-stat"><div class="hs-n" dir="ltr">24/7</div><div class="hs-l">{{ t('Réservation', 'حجز المواعيد') }}</div></div>
        </div>

        <div class="hero-visual" aria-hidden="true" *ngIf="!enRecherche">
          <div class="bookcard-ghost"></div>
          <div class="bookcard">
            <div class="bc-doc">
              <div class="bc-ava bc-ava--photo" role="img" [attr.aria-label]="t('Photo de la médecin', 'صورة الطبيبة')"></div>
              <div class="bc-id"><b>{{ t('Dr. Sofiane M.', 'د. سفيان م.') }}</b><small>{{ t('Généraliste · Constantine', 'طبيب عام · قسنطينة') }}</small></div>
              <span class="bc-verified"><i class="fa fa-check"></i> <span>{{ t('Vérifié', 'موثَّق') }}</span></span>
            </div>
            <div class="bc-day">{{ t("Aujourd'hui · 12 créneaux disponibles", 'اليوم · 12 موعدًا متاحًا') }}</div>
            <div class="bc-slots"><span dir="ltr">09:00</span><span dir="ltr">09:30</span><span class="sel" dir="ltr">10:30</span><span dir="ltr">11:00</span><span dir="ltr">14:00</span><span dir="ltr">15:30</span></div>
            <div class="bc-btn"><i class="fa fa-check"></i> <span>{{ t('Confirmer le RDV', 'تأكيد الموعد') }}</span> · <span dir="ltr">10:30</span></div>
            <div class="bc-note">{{ t('Confirmation immédiate · Paiement au cabinet', 'تأكيد فوري · الدفع في العيادة') }}</div>
          </div>
          <div class="badge-float bf1"><span class="dot" style="background:var(--blue)"><i class="fa fa-check"></i></span><span><b>{{ t('RDV confirmé', 'تم تأكيد الموعد') }}</b><small>{{ t('Rappel dans votre espace Ndawik', 'تذكير في فضائك على نداويك') }}</small></span></div>
          <div class="badge-float bf2"><span class="dot" style="background:#D4A437"><i class="fa fa-star"></i></span><span><b>{{ t('Médecin vérifié', 'طبيب موثَّق') }}</b><small>{{ t("Numéro d'ordre contrôlé", 'رقم التسجيل في النقابة مُراقَب') }}</small></span></div>
        </div>
      </div>

      <a routerLink="/praticien" *ngIf="!enRecherche" style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 14px;background:#fff;border:1.5px dashed var(--pastille-bd);border-radius:var(--r12);color:var(--ink);text-decoration:none;font-size:13px">
        <span><i class="fa fa-user-doctor" style="margin-inline-end:6px;color:var(--vert)"></i> {{ t('Vous êtes praticien ? Réclamez votre fiche', 'هل أنت طبيب؟ طالِب بصفحتك') }}</span>
        <i class="fa fa-arrow-right" style="opacity:.7"></i>
      </a>
    </section>

    <div class="v4strip" [attr.aria-label]="t('Garanties Ndawik', 'ضمانات نداويك')" *ngIf="!enRecherche">
      <div class="item"><i class="fa fa-shield-halved" aria-hidden="true"></i> <span>{{ t("Numéro d'ordre vérifié avant activation", 'التحقق من رقم التسجيل في النقابة قبل التفعيل') }}</span></div>
      <div class="item"><i class="fa fa-calendar-check" aria-hidden="true"></i> <span>{{ t('RDV en 30 secondes', 'موعد في 30 ثانية') }}</span></div>
      <div class="item"><i class="fa fa-server" aria-hidden="true"></i> <span>{{ t('Vos données protégées (loi 18-07)', 'بياناتك محمية (القانون 18-07)') }}</span></div>
      <div class="item"><i class="fa fa-lock" aria-hidden="true"></i> <span>{{ t('Paiement au cabinet', 'الدفع في العيادة') }}</span></div>
    </div>

    <section class="dwh" id="sec-dawini" *ngIf="!enRecherche">
      <div class="dwh-card">
        <div class="dwh-l">
          <span class="dwh-new"><i class="fa fa-wand-magic-sparkles" aria-hidden="true"></i> <span>{{ t('Nouveau', 'جديد') }}</span></span>
          <h2><span class="dwh-name">{{ t('Dawini', 'داويني') }}</span> — {{ t('trouvez votre médicament en pharmacie', 'اعثر على دوائك في الصيدلية') }}</h2>
          <p>{{ t('Décrivez le médicament que vous cherchez : les pharmacies partenaires de votre wilaya voient votre demande et vous indiquent sa disponibilité et son prix.', 'صِف الدواء الذي تبحث عنه: تطّلع الصيدليات الشريكة في ولايتك على طلبك وتخبرك بتوفّره وسعره.') }}</p>
          <div class="dwh-points">
            <span><i class="fa fa-clock" aria-hidden="true"></i> <span>{{ t('Disponibilité indiquée par la pharmacie', 'الصيدلية هي من يحدد التوفّر') }}</span></span>
            <span><i class="fa fa-location-dot" aria-hidden="true"></i> <span>{{ t('Pharmacies de votre wilaya', 'صيدليات ولايتك') }}</span></span>
            <span><i class="fa fa-lock" aria-hidden="true"></i> <span>{{ t("Votre identité n'est pas communiquée aux pharmacies", 'لا تُرسَل هويتك إلى الصيدليات') }}</span></span>
          </div>
          <a class="btn btn-primary btn-lg dwh-cta" routerLink="/dawini"><i class="fa fa-prescription-bottle-medical" aria-hidden="true"></i> <span>{{ t('Chercher un médicament', 'ابحث عن دواء') }}</span></a>
        </div>
        <div class="dwh-r" aria-hidden="true">
          <div class="dwh-mock">
            <div class="dwh-mock-req"><i class="fa fa-pills"></i> {{ t('Amoxicilline 1g', 'أموكسيسيلين 1 غ') }} <span class="b">{{ t('Envoyée aux pharmacies', 'أُرسلت إلى الصيدليات') }}</span></div>
            <div class="dwh-mock-resp">
              <div class="top">{{ t('Pharmacie El Chifa', 'صيدلية الشفاء') }} <span class="ok"><i class="fa fa-check"></i> <span>{{ t('Disponible', 'متوفر') }}</span></span></div>
              <small>{{ t('Alger-Centre · générique disponible', 'الجزائر الوسطى · الدواء الجنيس متوفر') }}</small>
                          </div>
            <div style="text-align:center;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,.78);font-weight:700">{{ t('Aperçu — exemple', 'معاينة — مثال') }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" *ngIf="!enRecherche" style="padding-top:8px">
      <div style="padding:0 var(--gutter)">
        <h2 class="sec-title" style="text-align:center;margin-bottom:18px">{{ t('Votre compagnon santé au quotidien', 'رفيقك الصحي كل يوم') }}</h2>
        <div class="dl-feats">
          <div class="dl-feat">
            <span class="dl-feat__ic"><i class="fa fa-calendar-check" aria-hidden="true"></i></span>
            <h3>{{ t('Réservez en ligne', 'احجز عبر الإنترنت') }}</h3>
            <p>{{ t('Trouvez un médecin et prenez rendez-vous en 30 secondes, 24h/24.', 'اعثر على طبيب واحجز موعدك في 30 ثانية، على مدار الساعة.') }}</p>
          </div>
          <div class="dl-feat">
            <span class="dl-feat__ic"><i class="fa fa-comment-medical" aria-hidden="true"></i></span>
            <h3>{{ t('Suivi et rappels', 'المتابعة والتذكير') }}</h3>
            <p>{{ t('Retrouvez vos rendez-vous et leurs rappels dans votre espace Ndawik, pour ne jamais les oublier.', 'تجد مواعيدك وتذكيراتها في فضائك على نداويك، حتى لا تنساها أبدًا.') }}</p>
          </div>
          <div class="dl-feat">
            <span class="dl-feat__ic"><i class="fa fa-shield-halved" aria-hidden="true"></i></span>
            <h3>{{ t('Vos données protégées', 'بياناتك محمية') }}</h3>
            <p>{{ t('Vos informations de santé sont chiffrées et protégées (loi 18-07).', 'معلوماتك الصحية مشفّرة ومحمية (القانون 18-07).') }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" *ngIf="!enRecherche" style="padding-top:0">
      <div style="padding:0 var(--gutter)">
        <div class="dl-stats">
          <div class="dl-stat"><div class="dl-stat__n" dir="ltr">75 000+</div><div class="dl-stat__l">{{ t('Médecins référencés', 'طبيب مُدرَج') }}</div></div>
          <div class="dl-stat"><div class="dl-stat__n">69</div><div class="dl-stat__l">{{ t('Wilayas couvertes', 'ولاية مغطّاة') }}</div></div>
        </div>
      </div>
    </section>

    <section class="section" id="sec-docs" *ngIf="enRecherche">
      <div class="sec-head" style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 var(--gutter);margin-bottom:14px">
        <h2 class="sec-title">{{ t('Résultats de votre recherche', 'نتائج بحثك') }}</h2>
        <span style="color:var(--text3);font-size:13px;font-weight:600" *ngIf="!charge() && resultats().length">{{ texteCompte() }}</span>
      </div>

      <p *ngIf="charge()" style="padding:0 var(--gutter);color:var(--text3)">{{ t('Recherche…', 'جارٍ البحث…') }}</p>
      <p *ngIf="erreur()" style="padding:0 var(--gutter);color:#b3261e">
        {{ erreur() }}
        <button type="button" (click)="rechercher()" style="margin-inline-start:8px;background:none;border:0;color:var(--vert);font-weight:700;text-decoration:underline;cursor:pointer;font:inherit;padding:0">{{ t('Réessayer', 'إعادة المحاولة') }}</button>
      </p>

      <div class="docs-wrap">
      <div id="docs-list" [class.docs-flou]="!connecte()" [attr.aria-hidden]="!connecte() ? 'true' : null" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px;padding:0 var(--gutter)">
        <article class="doc-card fu" *ngFor="let m of visibles()" [routerLink]="['/medecins', m.id]" tabindex="0">
          <div class="doc-row">
            <div class="doc-ava">{{ initiales(m) }}</div>
            <div style="flex:1;min-width:0">
              <div class="doc-name" dir="auto">{{ m.nomComplet }}</div>
              <div class="doc-spec"><i class="fa fa-stethoscope fa-xs"></i>{{ specialiteDe(m) }}</div>
              <div class="doc-loc"><i class="fa fa-location-dot fa-xs"></i>{{ m.ville || wilayaDe(m) }} ({{ wilayaDe(m) }})</div>
            </div>
          </div>
          <div class="doc-footer">
            <span *ngIf="m.reservable" class="badge-reservable" style="display:inline-flex;align-items:center;gap:6px;background:var(--green-l);color:var(--green);font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px"><i class="fa fa-calendar-check fa-xs" aria-hidden="true"></i>{{ t('Réservable en ligne', 'الحجز متاح عبر الإنترنت') }}</span>
            <span *ngIf="!m.reservable"></span>
            <span class="btn btn-sm doc-btn-ghost"><i class="fa fa-arrow-right"></i> {{ t('Voir la fiche', 'عرض الصفحة') }}</span>
          </div>
        </article>
      </div>

      <!-- Hors connexion : les premiers resultats sont floutes (non cliquables) sous le cadenas, avec leur nombre. -->
      <div class="docs-gate" *ngIf="!connecte() && !charge() && !erreur() && resultats().length > 0">
        <div class="docs-gate__card">
          <span class="docs-gate__ic"><i class="fa fa-lock" aria-hidden="true"></i></span>
          <h3>{{ texteNombre() }}</h3>
          <p>{{ t("La liste des médecins et leurs disponibilités sont réservées aux membres de Ndawik — c'est gratuit.", 'قائمة الأطباء ومواعيدهم المتاحة مخصّصة لأعضاء نداويك — والتسجيل مجاني.') }}</p>
          <div class="docs-gate__btns">
            <a class="bouton" (click)="sInscrire()" tabindex="0" role="button" style="cursor:pointer">{{ t('Créer un compte', 'إنشاء حساب') }}</a>
            <a class="bouton-secondaire" (click)="seConnecter()" tabindex="0" role="button" style="cursor:pointer">{{ t('Se connecter', 'تسجيل الدخول') }}</a>
          </div>
        </div>
      </div>

      </div>
      <p *ngIf="!charge() && !erreur() && resultats().length === 0" style="text-align:center;color:var(--text3);padding:32px var(--gutter)">
        {{ t('Aucun médecin trouvé. Essayez un autre nom ou une autre wilaya.', 'لم نعثر على أي طبيب. جرّب اسمًا آخر أو ولاية أخرى.') }}
      </p>
    </section>

    <section class="section" id="sec-avis" style="padding-top:0" *ngIf="!enRecherche">
      <div class="v4-revgrid">
        <figure class="v4-rev" style="grid-column:1 / -1;max-width:600px;margin:0 auto;text-align:center">
          <div style="font-size:22px;color:#D4A437;margin-bottom:8px" aria-hidden="true"><i class="fa fa-star"></i></div>
          <blockquote style="font-weight:800">{{ t('Premiers avis à venir', 'أولى التقييمات قريبًا') }}</blockquote>
          <figcaption style="justify-content:center">{{ t('Chaque avis publié ici sera lié à un rendez-vous réel et vérifié.', 'كل تقييم يُنشر هنا سيكون مرتبطًا بموعد حقيقي تم التحقق منه.') }}</figcaption>
        </figure>
      </div>
    </section>

    <div class="v4-tele" *ngIf="!enRecherche">
      <span class="ti"><i class="fa fa-video" aria-hidden="true"></i></span>
      <div>
        <h3>{{ t('Téléconsultation', 'الاستشارة عن بُعد') }} <span *ngIf="!visio" class="pastille-bientot">{{ t('Bientôt', 'قريبًا') }}</span></h3>
        <p *ngIf="visio">{{ t('Après la prise de rendez-vous, votre médecin peut vous proposer une téléconsultation : vous la retrouvez alors dans votre espace Ndawik et consultez à distance, où que vous soyez en Algérie.', 'بعد حجز الموعد، يمكن لطبيبك أن يقترح عليك استشارة عن بُعد: تجدها حينها في فضائك على نداويك وتستشيره عن بُعد أينما كنت في الجزائر.') }}</p>
        <p *ngIf="!visio">{{ t('Bientôt, consultez votre médecin à distance par vidéo, où que vous soyez en Algérie. En attendant, prenez rendez-vous au cabinet.', 'قريبًا، استشر طبيبك عن بُعد عبر الفيديو أينما كنت في الجزائر. وفي الأثناء، احجز موعدًا في العيادة.') }}</p>
      </div>
      <a class="btn btn-primary cta" href="#hero-recherche">{{ t('Trouver un médecin', 'ابحث عن طبيب') }}</a>
    </div>

    <section class="section" *ngIf="!enRecherche" style="background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div class="sec-hdr" style="padding-bottom:16px"><h2 class="sec-title" style="font-size:18px">{{ t('Comment prendre RDV en ligne ?', 'كيف تحجز موعدًا عبر الإنترنت؟') }}</h2></div>
      <div class="steps-col">
        <div class="step-row"><div class="step-num">1</div><div class="step-info"><div class="step-title">{{ t('Recherchez', 'ابحث') }}</div><div class="step-desc">{{ t('Filtrez par nom, ville ou spécialité.', 'صفِّ النتائج حسب الاسم أو المدينة أو التخصص.') }}</div></div></div>
        <div class="step-row"><div class="step-num">2</div><div class="step-info"><div class="step-title">{{ t('Réservez', 'احجز') }}</div><div class="step-desc">{{ t('Choisissez un créneau et confirmez votre RDV en ligne.', 'اختر موعدًا متاحًا وأكّد حجزك عبر الإنترنت.') }}</div></div></div>
        <div class="step-row" style="padding-bottom:0"><div class="step-num">3</div><div class="step-info"><div class="step-title">{{ t('Consultez', 'استشر') }}</div><div class="step-desc">{{ t('Confirmation immédiate : retrouvez votre rendez-vous dans votre espace Ndawik et rencontrez votre médecin.', 'تأكيد فوري: تجد موعدك في فضائك على نداويك وتلتقي بطبيبك.') }}</div></div></div>
      </div>
    </section>

    <section class="section" id="sec-diff" style="padding-top:0" *ngIf="!enRecherche">
      <div class="v4-sechead">
        <span class="v4-eyebrow">{{ t('La différence Ndawik', 'ما يميّز نداويك') }}</span>
        <h2>{{ t('Pourquoi choisir Ndawik ?', 'لماذا تختار نداويك؟') }}</h2>
      </div>
      <div class="v4-cmp" role="group" [attr.aria-label]="t('Comparatif Ndawik et services classiques', 'مقارنة بين نداويك والخدمات التقليدية')">
        <div class="v4-cmp-h"><span></span><strong>{{ t('Ndawik', 'نداويك') }}</strong><span>{{ t('Services classiques', 'الخدمات التقليدية') }}</span></div>
        <div class="v4-cmp-r"><span>{{ t("Numéro d'ordre vérifié avant activation", 'التحقق من رقم التسجيل في النقابة قبل التفعيل') }}</span><strong class="y">✓</strong><span class="n">—</span></div>
        <div class="v4-cmp-r"><span>{{ t('Données de santé protégées (loi 18-07)', 'بيانات صحية محمية (القانون 18-07)') }}</span><strong class="y">✓</strong><span class="n">—</span></div>
        <div class="v4-cmp-r"><span>{{ t('Français et arabe, avec un arabe RTL soigné', 'بالفرنسية والعربية، مع واجهة عربية متقنة من اليمين إلى اليسار') }}</span><strong class="y">✓</strong><span class="n">{{ t('partiel', 'جزئي') }}</span></div>
        <div class="v4-cmp-r"><span>{{ t('Paiement au cabinet — espèces ou Chifa, gratuit patients', 'الدفع في العيادة — نقدًا أو بالشفاء، مجاني للمرضى') }}</span><strong class="y">✓</strong><span class="n">{{ t('variable', 'متفاوت') }}</span></div>
        <div class="v4-cmp-r"><span>{{ t('Réservation instantanée + rappels dans votre espace', 'حجز فوري + تذكيرات في فضائك') }}</span><strong class="y">✓</strong><span class="n">—</span></div>
      </div>
    </section>

    <section class="section" style="padding-bottom:8px" *ngIf="!enRecherche">
      <div style="padding:0 var(--gutter)">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);padding:24px;text-align:center;box-shadow:var(--s1)">
          <div style="font-size:24px;margin-bottom:10px;color:var(--vert)"><i class="fa fa-user-doctor"></i></div>
          <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin-bottom:8px">{{ t('Vous êtes praticien ?', 'هل أنت طبيب؟') }}</h2>
          <p style="font-size:13px;color:var(--text2);margin-bottom:16px">{{ t('Réclamez votre fiche sur Ndawik et recevez vos rendez-vous en ligne.', 'طالِب بصفحتك على نداويك واستقبل مواعيدك عبر الإنترنت.') }}</p>
          <a class="btn btn-primary btn-lg" routerLink="/praticien"><i class="fa fa-user-plus"></i> <span>{{ t('Faire une demande', 'تقديم طلب') }}</span></a>
        </div>
      </div>
    </section>

    <section class="section" id="sec-faq" style="padding-top:0" *ngIf="!enRecherche">
      <div class="v4-sechead"><span class="v4-eyebrow">{{ t('FAQ', 'الأسئلة الشائعة') }}</span><h2>{{ t('Questions fréquentes', 'أسئلة متكررة') }}</h2></div>
      <div class="v4-faq">
        <details open><summary><span>{{ t("L'application est-elle gratuite ?", 'هل التطبيق مجاني؟') }}</span><span class="pl" aria-hidden="true">+</span></summary><p>{{ t('Oui, Ndawik est 100 % gratuite pour les patients. Vous réglez uniquement la consultation, directement au cabinet — en espèces ou avec la carte Chifa.', 'نعم، نداويك مجاني 100% للمرضى. لا تدفع إلا ثمن الاستشارة، مباشرة في العيادة — نقدًا أو ببطاقة الشفاء.') }}</p></details>
        <details><summary><span>{{ t("Comment savez-vous qu'un médecin est fiable ?", 'كيف تتأكدون من أن الطبيب موثوق؟') }}</span><span class="pl" aria-hidden="true">+</span></summary><p>{{ t("Un praticien qui rejoint Ndawik fournit son numéro d'inscription à l'Ordre : notre équipe le vérifie avant d'activer son compte. Le badge « Vérifié » n'apparaît qu'après cette validation.", 'كل طبيب ينضم إلى نداويك يقدّم رقم تسجيله في نقابة الأطباء، ويتحقق منه فريقنا قبل تفعيل حسابه. ولا تظهر شارة « موثَّق » إلا بعد هذا التحقق.') }}</p></details>
        <details><summary><span>{{ t('Mes données de santé sont-elles protégées ?', 'هل بياناتي الصحية محمية؟') }}</span><span class="pl" aria-hidden="true">+</span></summary><p>{{ t("Vos informations sont chiffrées et ne sont accessibles qu'à vous et aux médecins que vous consultez, avec votre consentement.", 'معلوماتك مشفّرة، ولا يطّلع عليها إلا أنت والأطباء الذين تستشيرهم، بموافقتك.') }}</p></details>
        <details><summary><span>{{ t('Je suis médecin, comment rejoindre Ndawik ?', 'أنا طبيب، كيف أنضم إلى نداويك؟') }}</span><span class="pl" aria-hidden="true">+</span></summary><p>{{ t('Réclamez votre fiche depuis la page', 'طالِب بصفحتك من صفحة') }} <a routerLink="/praticien" style="color:var(--vert);font-weight:700">{{ t('Vous êtes praticien ?', 'هل أنت طبيب؟') }}</a>{{ t(', gérez vos disponibilités et recevez vos rendez-vous en ligne.', '، ثم حدّد أوقات توفّرك واستقبل مواعيدك عبر الإنترنت.') }}</p></details>
      </div>
    </section>
    </main>
  `,
    styles: [`
    .ac-liste { position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:40; margin:0; padding:6px; list-style:none; background:#fff; border:1px solid var(--border); border-radius:var(--r12); box-shadow:var(--s1); max-height:340px; overflow-y:auto; }
    .ac-item { display:flex; flex-direction:column; gap:2px; padding:9px 12px; border-radius:8px; text-decoration:none; color:var(--ink); }
    .ac-item:hover, .ac-item:focus { background:var(--tbi-mint); outline:none; }
    .ac-nom { font-weight:700; line-height:1.25; }
    .ac-meta { font-size:12px; color:var(--text3); }

    /* Recherche structuree facon Doctolib : deux listes sous le champ texte. */
    .rech-filtres { display:flex; gap:10px; margin-top:12px; }
    .rf-field { position:relative; flex:1 1 0; min-width:0; display:block; }
    .rf-ic { position:absolute; top:50%; left:14px; transform:translateY(-50%); color:var(--vert); font-size:14px; line-height:1; pointer-events:none; }
    [dir="rtl"] .rf-ic { left:auto; right:14px; }
    .rf-select {
      width:100%; appearance:none; -webkit-appearance:none;
      background-color:#fff; color:var(--ink); font:inherit; font-size:14px;
      border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1);
      padding:14px 38px 14px 40px; cursor:pointer;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="%23D4A437" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      background-repeat:no-repeat; background-position:right 14px center;
      transition:box-shadow .2s, border-color .15s;
    }
    [dir="rtl"] .rf-select { padding:14px 40px 14px 38px; background-position:left 14px center; }
    .rf-select:focus { outline:none; border-color:var(--vert); box-shadow:0 0 0 3px rgba(15,117,96,.14); }
    @media (max-width:640px) { .rech-filtres { flex-direction:column; } }

    /* Barre de recherche unifiee facon Doctolib : nom/specialite + specialite + lieu + bouton, sur une pilule blanche. */
    .dl-search { display:flex; align-items:stretch; gap:0; background:#fff; border-radius:999px;
      box-shadow:0 8px 24px rgba(16,40,34,.10), 0 2px 6px rgba(16,40,34,.05);
      padding:6px; max-width:880px; margin-top:16px; }
    .dl-field { position:relative; display:flex; align-items:center; flex:1 1 0; min-width:0; }
    .dl-field--text { flex:1.5 1 0; }
    .dl-ic { position:absolute; left:18px; top:50%; transform:translateY(-50%); color:var(--vert); font-size:15px; line-height:1; pointer-events:none; }
    [dir="rtl"] .dl-ic { left:auto; right:18px; }
    .dl-input, .dl-select { width:100%; border:0; background:transparent; font:inherit; font-size:15px; color:var(--ink);
      padding:15px 14px 15px 46px; outline:none; }
    [dir="rtl"] .dl-input, [dir="rtl"] .dl-select { padding:15px 46px 15px 14px; }
    .dl-input::placeholder { color:var(--text3); }
    .dl-select { appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:34px;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="%23D4A437" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      background-repeat:no-repeat; background-position:right 16px center; }
    [dir="rtl"] .dl-select { padding:15px 34px 15px 46px; background-position:left 16px center; }
    .dl-sep { width:1px; background:var(--border); margin:10px 0; flex:0 0 auto; }
    .dl-btn { flex:0 0 auto; display:inline-flex; align-items:center; gap:8px; background:var(--vert); color:#fff;
      border:0; border-radius:999px; padding:0 26px; font:inherit; font-weight:700; font-size:15px; cursor:pointer;
      transition:background .15s, transform .05s; }
    .dl-btn:hover { background:#0a4d3e; }
    .dl-btn:active { transform:scale(.97); }
    .dl-btn:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(15,117,96,.35); }
    .dl-field--text { flex:2 1 0; }
    /* Affinage : petit chip blanc (specialite) sous la barre, lisible sur fond vert comme sur fond clair. */
    .dl-refine { display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
    .dl-chip { display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 8px 0 14px;
      background:#fff; border-radius:999px; box-shadow:var(--s1); position:relative; }
    .dl-chip > i { color:var(--vert); font-size:14px; line-height:1; }
    .dl-chip select { border:0; background:transparent; font:inherit; font-size:14px; color:var(--ink);
      padding:0 26px 0 2px; outline:none; cursor:pointer; appearance:none; -webkit-appearance:none;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="%23D4A437" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      background-repeat:no-repeat; background-position:right 6px center; }
    [dir="rtl"] .dl-chip select { padding:0 2px 0 26px; background-position:left 6px center; }
    /* Section « compagnon santé » : 3 cartes a icone (charte verte). */
    .dl-feats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .dl-feat { background:#fff; border:1px solid var(--border); border-radius:var(--r16); padding:22px; text-align:center; box-shadow:var(--s1); }
    .dl-feat__ic { display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:16px; background:#e7f3ef; color:var(--vert); font-size:20px; margin-bottom:12px; }
    .dl-feat h3 { margin:0 0 6px; font-size:16px; font-weight:700; color:var(--ink); }
    .dl-feat p { margin:0; font-size:13px; color:var(--text3); line-height:1.5; }
    /* Bande de statistiques (degrade de marque). */
    .dl-stats { display:grid; grid-template-columns:repeat(3,1fr); background:linear-gradient(155deg,var(--vert) 0%,#0a4d3e 100%); border-radius:var(--r16); padding:24px 12px; color:#fff; box-shadow:var(--s2); }
    .dl-stat { text-align:center; padding:0 6px; }
    .dl-stat + .dl-stat { border-inline-start:1px solid rgba(255,255,255,.2); }
    .dl-stat__n { font-size:28px; font-weight:800; letter-spacing:-.02em; }
    .dl-stat__l { font-size:12px; opacity:.9; margin-top:4px; font-weight:600; }
    @media (max-width:640px) { .dl-feats { grid-template-columns:1fr; } .dl-stat__n { font-size:21px; } }

    /* Resultats verrouilles : floutes hors connexion, avec un cadenas invitant a creer un compte. */
    .docs-wrap { position:relative; }
    .docs-flou { filter:blur(7px); pointer-events:none; user-select:none; min-height:320px; }
    .docs-gate { position:absolute; inset:0; display:flex; align-items:flex-start; justify-content:center; padding:24px var(--gutter); }
    .docs-gate__card { background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s3); padding:28px 24px; text-align:center; max-width:380px; width:100%; }
    .docs-gate__ic { display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:16px; background:#e7f3ef; color:var(--vert); font-size:20px; margin-bottom:12px; }
    .docs-gate__card h3 { margin:0 0 6px; font-size:18px; font-weight:800; color:var(--ink); line-height:1.25; }
    .docs-gate__card p { margin:0 0 16px; font-size:13px; color:var(--text3); line-height:1.5; }
    .docs-gate__btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }

    /* Boutons de telechargement de l'appli sous la recherche (style .store global, cf. pied de page). */
    .hero-stores { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; justify-content:center; }
    .hero-stores .store { text-align:start; }
    @media (min-width:1024px) { .hero-stores { justify-content:flex-start; } }

    /* Accueil arabe (/ar) : de droite a gauche. Fleches retournees, chip et lignes remis dans le sens de lecture
       (legacy-accueil.css inverse .step-row/.doc-row/.doc-footer en RTL, ce qui les remettait de gauche a droite). */
    [dir="rtl"] .fa-arrow-right { transform:scaleX(-1); }
    [dir="rtl"] .dl-chip { padding:0 14px 0 8px; }
    [dir="rtl"] .step-row, [dir="rtl"] .doc-row, [dir="rtl"] .doc-footer { flex-direction:row; }

    @media (max-width:760px) {
      .dl-search { flex-direction:column; border-radius:20px; padding:8px; gap:6px; margin-top:14px; }
      .dl-sep { display:none; }
      .dl-field { width:100%; border:1px solid var(--border); border-radius:12px; }
      .dl-btn { width:100%; justify-content:center; padding:14px; border-radius:12px; }
    }
  `]
})
export class AnnuaireComponent implements OnInit, OnDestroy {
  readonly visio = VISIO_ACTIVE;
  private doc = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);
  private service = inject(AnnuaireService);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  /** Vrai sur l'accueil arabe (/ar, donnee de route `langue: 'ar'`) : textes en arabe, page de droite a gauche. */
  readonly ar = signal(this.route.snapshot?.data?.['langue'] === 'ar');
  readonly googlePlay = GOOGLE_PLAY;
  /** Etat de connexion : hors connexion, les resultats sont floutes et on invite a creer un compte. */
  connecte = signal(false);
  q = ''; specialite = ''; wilaya = '';
  /** Listes du referentiel (assets/referentiel.json) qui alimentent les deux <select>. */
  wilayas = signal<OptionWilaya[]>([]);
  specialites = signal<OptionSpecialite[]>([]);
  resultats = signal<Medecin[]>([]);
  charge = signal(false);
  erreur = signal('');
  private minuteur: any;

  /** Suggestions d'autocompletion affichees sous le champ (max 6). */
  suggestions = signal<Medecin[]>([]);
  suggestionsVisibles = signal(false);
  /** Frappes successives dans le champ, pour l'autocompletion differee (debounce). */
  private saisie = new Subject<string>();
  private abonnementAuto: Subscription | null = null;
  /** Demandes de recherche : switchMap annule la requete precedente, seule la derniere met a jour la liste. */
  private recherches = new Subject<void>();
  private abonnementRecherche: Subscription | null = null;
  /** Filtres passes dans l'URL (?specialite=…&wilaya=…), par exemple depuis les liens du pied de page. */
  private abonnementParams: Subscription | null = null;
  private masquage: any;

  /** Vrai des que l'utilisateur a saisi un texte ou choisi un filtre : on masque le marketing pour montrer les resultats tout de suite. */
  get enRecherche(): boolean { return this.q.trim().length > 0 || !!this.specialite || !!this.wilaya; }

  ngOnInit() {
    this.abonnementRecherche = this.recherches
      .pipe(
        switchMap(() =>
          this.service.rechercher(this.specialite, this.wilaya, this.q).pipe(
            map((r) => ({ r, ok: true })),
            catchError(() => of({ r: [] as Medecin[], ok: false })),
          ),
        ),
      )
      .subscribe(({ r, ok }) => {
        if (ok) this.resultats.set(r);
        else this.erreur.set(this.t(
          'Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.',
          'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت وأعد المحاولة.',
        ));
        this.charge.set(false);
      });
    // Accueil francais (/) <-> arabe (/ar) pour les moteurs de recherche.
    const ar = this.ar();
    const accueil = ar ? ACCUEIL_AR : ACCUEIL_FR;
    this.title.setTitle(accueil.titre);
    this.meta.updateTag({ name: 'description', content: accueil.description });
    this.meta.updateTag({ property: 'og:title', content: accueil.titre });
    this.meta.updateTag({ property: 'og:description', content: accueil.description });
    this.meta.updateTag({ property: 'og:locale', content: ar ? 'ar_DZ' : 'fr_DZ' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    referencerAccueil(this.doc, ar);
    // Charge le referentiel wilayas/specialites. URL relative : SSR-safe, et catchError evite tout plantage si le fichier est indisponible.
    this.http
      .get<Referentiel>('/assets/referentiel.json')
      .pipe(catchError(() => of<Referentiel>({ wilayas: [], specialites: [] })))
      .subscribe((ref) => {
        this.wilayas.set(ref?.wilayas ?? []);
        this.specialites.set(ref?.specialites ?? []);
      });
    // Pas de chargement par defaut : l'accueil n'affiche aucun medecin tant qu'on ne cherche pas.
    // Etat de connexion : determine si les resultats sont visibles ou floutes.
    this.auth.pret().then(() => this.connecte.set(this.auth.estConnecte()));
    // Filtres de l'URL : appliques a l'arrivee et a chaque changement (liens « Spécialités » / « Villes » du pied de page).
    this.abonnementParams = this.route.queryParamMap.subscribe((p) => {
      const specialite = p.get('specialite');
      const wilaya = p.get('wilaya');
      const q = p.get('q');
      if (!specialite && !wilaya && !q) return;
      this.q = q ?? '';
      this.specialite = specialite ?? '';
      this.wilaya = wilaya ?? '';
      this.auth.pret().then(() => {
        this.connecte.set(this.auth.estConnecte());
        this.lancerRecherche();
      });
    });
    // L'autocompletion n'est active que dans le navigateur : cote serveur (SSR), aucun flux debounce ne doit tourner.
    if (!this.navigateur) return;
    this.abonnementAuto = this.saisie
      .pipe(
        debounceTime(250),
        map((t) => t.trim()),
        distinctUntilChanged(),
        switchMap((t) =>
          t.length < 2
            ? of<Medecin[]>([])
            : this.service.rechercher(undefined, undefined, t).pipe(
                map((liste) => liste.slice(0, 6)),
                catchError(() => of<Medecin[]>([])),
              ),
        ),
      )
      .subscribe((liste) => {
        this.suggestions.set(liste);
        this.suggestionsVisibles.set(liste.length > 0);
      });
  }

  ngOnDestroy() {
    this.abonnementRecherche?.unsubscribe();
    this.abonnementRecherche = null;
    this.abonnementAuto?.unsubscribe();
    this.abonnementAuto = null;
    this.abonnementParams?.unsubscribe();
    this.abonnementParams = null;
    clearTimeout(this.minuteur);
    clearTimeout(this.masquage);
  }

  /** Frappe dans le champ : relance la liste principale (differee) et alimente l'autocompletion. */
  surSaisie() {
    this.rechercheDifferee();
    this.suggestionsVisibles.set(true);
    this.saisie.next(this.q);
  }

  /** Focus : reaffiche les suggestions deja chargees si le champ en a. */
  surFocus() {
    if (this.suggestions().length) this.suggestionsVisibles.set(true);
  }

  /** Masque la liste apres un court delai, le temps de laisser passer le clic sur une suggestion. */
  masquerBientot() {
    clearTimeout(this.masquage);
    this.masquage = setTimeout(() => this.suggestionsVisibles.set(false), 150);
  }

  /** Clic sur une suggestion : la navigation est geree par routerLink, on ferme juste la liste. */
  choisirSuggestion() {
    this.suggestionsVisibles.set(false);
  }

  /** Changement d'un des deux <select> : ferme l'autocompletion et relance la recherche combinee (texte + specialite + wilaya). */
  surFiltre() {
    this.suggestionsVisibles.set(false);
    this.rechercher();
  }

  /** Bouton « Se connecter » du cadenas sur les resultats floutes. */
  seConnecter() { this.auth.seConnecter(); }
  /** « Créer un compte » : formulaire d'inscription (en pre-lancement, page /bientot). */
  sInscrire() { this.auth.sInscrireParEmail(); }

  /** Clic sur le bouton « Rechercher » : lance la recherche et fait defiler vers la liste des resultats. */
  lancerRecherche() {
    this.suggestionsVisibles.set(false);
    this.rechercher();
    if (this.navigateur) {
      setTimeout(() => document.getElementById('sec-docs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }

  /** Attend un court instant apres la frappe avant de lancer la recherche. */
  rechercheDifferee() {
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.rechercher(), 300);
  }

  rechercher() {
    this.charge.set(true);
    this.erreur.set('');
    this.recherches.next();
  }

  /** Texte affiche selon la langue de la page : francais sur /, arabe sur /ar. */
  t(fr: string, ar: string): string {
    return this.ar() ? ar : fr;
  }

  /** Libelle d'une wilaya du formulaire : en arabe sur /ar quand il existe, sinon le libelle francais. */
  nomWilaya(code: string, nom: string): string {
    return (this.ar() && WILAYAS_AR.get(code)) || nom;
  }

  /** Libelle d'une specialite du formulaire : en arabe sur /ar quand il existe, sinon le libelle francais. */
  nomSpecialite(slug: string, nom: string): string {
    return (this.ar() && SPECIALITES_AR.get(slug)) || nom;
  }

  /** Specialite et wilaya d'un medecin renvoye par l'API, traduites sur /ar quand c'est possible. */
  specialiteDe(m: Medecin): string { return this.nomSpecialite(m.specialiteSlug, m.specialiteFr); }
  wilayaDe(m: Medecin): string { return this.nomWilaya(m.wilayaCode, m.wilayaFr); }

  /** « 3 médecins trouvés » / « 50+ … » : nombre de medecins, accorde en francais ou en arabe. */
  texteNombre(): string {
    const n = this.resultats().length;
    if (!this.ar()) return n >= 50 ? '50+ médecins trouvés' : `${n} ${n > 1 ? 'médecins trouvés' : 'médecin trouvé'}`;
    if (n >= 50) return 'أكثر من 50 طبيبًا';
    if (n === 1) return 'طبيب واحد';
    if (n === 2) return 'طبيبان';
    return n <= 10 ? `${n} أطباء` : `${n} طبيبًا`;
  }

  /** Compteur a cote du titre des resultats. */
  texteCompte(): string {
    if (this.resultats().length >= 50 && this.connecte()) {
      return this.t('50 premiers résultats — affinez votre recherche', 'أول 50 نتيجة — دقّق بحثك');
    }
    return this.texteNombre();
  }

  /** Hors connexion, seules 6 cartes (floutees) sont rendues sous le cadenas. */
  visibles(): Medecin[] {
    return this.connecte() ? this.resultats() : this.resultats().slice(0, 6);
  }

  /** Monogramme (1 ou 2 lettres) a partir du nom, pour l'avatar. */
  initiales(m: Medecin): string {
    const mots = (m.nomComplet || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    const lettres = mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase());
    return lettres.join('') || '•';
  }
}
