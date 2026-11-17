import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { SPECIALITES_PRINCIPALES, SPECIALITES_SEO, WILAYAS_PRINCIPALES, WILAYAS_SEO } from './referentiel-seo';
import { ACCUEIL_AR, referencerAccueil } from './marque';

/**
 * Accueil en arabe (/ar) : recherche par specialite et wilaya qui mene aux pages arabes de l'annuaire
 * (/ar/specialites/:specialite/:wilaya), specialites et wilayas les plus demandees, rappel du pre-lancement.
 */
@Component({
    selector: 'app-accueil-ar',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main class="aa" dir="rtl" lang="ar">
      <section class="aa-hero">
        <span class="aa-pastille">أكثر من 75 000 طبيب في الجزائر</span>
        <h1>احجز موعدك مع طبيب في الجزائر</h1>
        <p>ابحث عن طبيب حسب التخصص والولاية في جميع ولايات الجزائر الـ69. الدفع في العيادة، بدون أي دفع مسبق.</p>

        <form class="aa-recherche" (ngSubmit)="rechercher()">
          <label class="aa-champ">
            <span>التخصص</span>
            <select [(ngModel)]="specialite" name="specialite">
              <option value="">جميع التخصصات</option>
              <option *ngFor="let s of specialites" [value]="s.slug">{{ s.nomAr }}</option>
            </select>
          </label>
          <label class="aa-champ">
            <span>الولاية</span>
            <select [(ngModel)]="wilaya" name="wilaya">
              <option value="">جميع الولايات</option>
              <option *ngFor="let w of wilayas" [value]="w.slug">{{ w.code }} - {{ w.nomAr }}</option>
            </select>
          </label>
          <button type="submit" class="aa-btn">بحث</button>
        </form>
      </section>

      <section class="aa-bloc">
        <h2>التخصصات الأكثر طلبًا</h2>
        <div class="aa-liens">
          <a *ngFor="let s of principales" [routerLink]="['/ar/specialites', s.slug]">{{ s.nomAr }}</a>
          <a routerLink="/ar/specialites" class="aa-tout">جميع التخصصات ←</a>
        </div>
      </section>

      <section class="aa-bloc">
        <h2>الأطباء حسب الولاية</h2>
        <div class="aa-liens">
          <a *ngFor="let w of villes" [routerLink]="['/ar/wilayas', w.slug]">أطباء في {{ w.nomAr }}</a>
          <a routerLink="/ar/specialites" class="aa-tout">جميع الولايات ←</a>
        </div>
      </section>

      <section class="aa-bloc aa-atouts">
        <div><h3>أطباء موثّقون</h3><p>يتم التحقق من رقم التسجيل في نقابة الأطباء قبل تفعيل أي حساب طبيب.</p></div>
        <div><h3>الدفع في العيادة</h3><p>نقدًا أو ببطاقة الشفاء حسب الطبيب. لا يُطلب أي دفع عبر الإنترنت.</p></div>
        <div><h3>بياناتك محمية</h3><p>معلوماتك الصحية محمية وفقًا للقانون 18-07 المتعلق بحماية المعطيات الشخصية.</p></div>
      </section>
    </main>
  `,
    styles: [`
    .aa { max-width:1100px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .aa-hero { background:linear-gradient(155deg, var(--vert) 0%, #0a4d3e 100%); color:#fff; border-radius:24px; padding:40px 24px; text-align:center; box-shadow:var(--s2); }
    .aa-pastille { display:inline-block; background:#D4A437; color:#10241F; font-weight:800; font-size:13px; padding:6px 14px; border-radius:999px; }
    .aa-hero h1 { color:#fff !important; margin:16px 0 10px; font-size:clamp(1.8rem,5vw,2.8rem); font-weight:800; line-height:1.25; text-wrap:balance; }
    .aa-hero p { margin:0 auto 24px; max-width:56ch; color:rgba(255,255,255,.9); line-height:1.7; }
    .aa-recherche { display:grid; grid-template-columns:1fr 1fr auto; gap:10px; background:#fff; border-radius:18px; padding:10px; max-width:820px; margin:0 auto; text-align:start; }
    .aa-champ { display:flex; flex-direction:column; gap:4px; font-size:12px; font-weight:700; color:var(--text3); padding:4px 8px; }
    .aa-champ select { border:1px solid var(--border); border-radius:12px; padding:10px; font:inherit; font-size:15px; color:var(--ink); background:#fff; }
    .aa-btn { align-self:end; border:0; border-radius:12px; background:var(--vert); color:#fff; font:inherit; font-weight:800; font-size:16px; padding:12px 28px; cursor:pointer; }
    .aa-bloc { margin-top:32px; }
    .aa-bloc h2 { font-size:1.2rem; font-weight:800; margin:0 0 14px; }
    .aa-liens { display:flex; flex-wrap:wrap; gap:8px; }
    .aa-liens a { padding:8px 14px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--ink); text-decoration:none; font-size:14px; }
    .aa-liens a:hover, .aa-liens a.aa-tout { border-color:var(--vert); color:var(--vert); font-weight:700; }
    .aa-atouts { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
    .aa-atouts div { background:#fff; border:1px solid var(--border); border-radius:16px; padding:18px; }
    .aa-atouts h3 { margin:0 0 6px; font-size:16px; font-weight:800; }
    .aa-atouts p { margin:0; color:var(--text3); font-size:14px; line-height:1.6; }
    @media (max-width:720px) { .aa-recherche { grid-template-columns:1fr; } .aa-btn { align-self:stretch; } .aa-atouts { grid-template-columns:1fr; } }
  `]
})
export class AccueilArComponent implements OnInit {
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  readonly specialites = [...SPECIALITES_SEO].sort((a, b) => a.nomAr.localeCompare(b.nomAr, 'ar'));
  readonly wilayas = [...WILAYAS_SEO].sort((a, b) => Number(a.code) - Number(b.code));
  readonly principales = SPECIALITES_PRINCIPALES.map((x) => SPECIALITES_SEO.find((s) => s.slug === x)!).filter(Boolean);
  readonly villes = WILAYAS_PRINCIPALES.map((c) => WILAYAS_SEO.find((w) => w.code === c)!).filter(Boolean);
  specialite = '';
  wilaya = '';

  ngOnInit() {
    this.title.setTitle(ACCUEIL_AR.titre);
    this.meta.updateTag({ name: 'description', content: ACCUEIL_AR.description });
    this.meta.updateTag({ property: 'og:title', content: ACCUEIL_AR.titre });
    this.meta.updateTag({ property: 'og:description', content: ACCUEIL_AR.description });
    this.meta.updateTag({ property: 'og:locale', content: 'ar_DZ' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    referencerAccueil(this.document, true);
  }

  /** Recherche : specialite et/ou wilaya vers la page arabe correspondante de l'annuaire. */
  rechercher() {
    const s = this.specialite, w = this.wilaya;
    if (s && w) this.router.navigate(['/ar/specialites', s, w]);
    else if (s) this.router.navigate(['/ar/specialites', s]);
    else if (w) this.router.navigate(['/ar/wilayas', w]);
    else this.router.navigate(['/ar/specialites']);
  }
}
