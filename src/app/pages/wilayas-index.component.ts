import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WILAYAS_SEO, WilayaSeo } from '../seo/referentiel-seo';
import { referencerPage } from '../seo/page-seo';

/** Index public des 69 wilayas (/wilayas et /ar/wilayas) : un lien vers la page de chaque wilaya. */
@Component({
    selector: 'app-wilayas-index',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="pg" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <nav class="pg-fil" [attr.aria-label]="ar ? 'مسار التصفح' : 'Fil d\\'Ariane'">
        <a [routerLink]="ar ? '/ar' : '/'">{{ ar ? 'الرئيسية' : 'Accueil' }}</a><span>›</span>
        <span aria-current="page">{{ ar ? 'الولايات' : 'Wilayas' }}</span>
      </nav>
      <header>
        <h1>{{ ar ? 'الأطباء حسب الولاية' : 'Médecins par wilaya' }}</h1>
        <p class="pg-intro">{{ ar
          ? 'اختر ولايتك من بين الولايات الـ69 لتصفّح الأطباء المسجلين في نداويك وحجز موعدك عبر الإنترنت.'
          : 'Choisissez votre wilaya parmi les 69 wilayas d\\'Algérie pour voir les praticiens référencés sur Ndawik et prendre rendez-vous en ligne.' }}</p>
      </header>
      <div class="pg-colonnes">
        <a *ngFor="let w of wilayas" [routerLink]="[p + '/wilayas', w.slug]">
          {{ ar ? w.nomAr : w.nom }}<span class="pg-code">{{ w.code }}</span></a>
      </div>
      <p class="pg-intro" style="margin-top:20px">
        <a [routerLink]="p + '/specialites'">{{ ar ? 'تصفّح حسب التخصص ←' : 'Parcourir par spécialité →' }}</a>
      </p>
    </main>
  `,
    styles: [`
    .pg { max-width:1100px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pg-fil { display:flex; flex-wrap:wrap; gap:6px; font-size:13px; color:var(--text3); margin-bottom:18px; }
    .pg-fil a, .pg-intro a { color:var(--vert); text-decoration:none; font-weight:600; }
    h1 { margin:0 0 8px; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; letter-spacing:-.02em; line-height:1.15; text-wrap:balance; }
    .pg-intro { margin:0 0 24px; color:var(--text3); line-height:1.6; max-width:70ch; }
    .pg-colonnes { columns:4 180px; column-gap:24px; background:#fff; border:1px solid var(--border); border-radius:16px; padding:14px 18px; box-shadow:var(--s1); }
    .pg-colonnes a { display:flex; justify-content:space-between; gap:8px; break-inside:avoid; padding:7px 4px; border-bottom:1px solid var(--border); color:var(--ink); text-decoration:none; font-size:14px; }
    .pg-colonnes a:hover { color:var(--vert); font-weight:700; }
    .pg-code { color:var(--text3); font-size:12px; font-variant-numeric:tabular-nums; }
  `]
})
export class WilayasIndexComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);

  ar = false;
  p = '';
  wilayas: WilayaSeo[] = WILAYAS_SEO;

  ngOnInit() {
    this.ar = this.route.snapshot.data['langue'] === 'ar';
    this.p = this.ar ? '/ar' : '';
    const tri = this.ar ? 'ar' : 'fr';
    this.wilayas = [...WILAYAS_SEO].sort((a, b) => (this.ar ? a.nomAr : a.nom).localeCompare(this.ar ? b.nomAr : b.nom, tri));
    referencerPage(this.document, this.title, this.meta, {
      titre: this.ar ? 'الأطباء حسب الولاية — الولايات الـ69' : 'Médecins par wilaya — les 69 wilayas',
      description: this.ar
        ? 'جميع ولايات الجزائر الـ69: تصفّح الأطباء المسجلين في نداويك في ولايتك واحجز موعدك عبر الإنترنت.'
        : "Les 69 wilayas d'Algérie : trouvez les médecins référencés sur Ndawik dans votre wilaya et prenez rendez-vous en ligne.",
      chemin: '/wilayas',
      ar: this.ar,
    });
  }
}
