import { Component, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WILAYAS_SEO } from '../seo/referentiel-seo';
import { referencerPage } from '../seo/page-seo';

/** Page « À propos de Ndawik » (/a-propos et /ar/a-propos) : présentation de la marque et bloc presse. */
@Component({
    selector: 'app-a-propos',
    imports: [RouterLink],
    template: `
    <main class="pg" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <nav class="pg-fil" [attr.aria-label]="ar ? 'مسار التصفح' : 'Fil d\\'Ariane'">
        <a [routerLink]="ar ? '/ar' : '/'">{{ ar ? 'الرئيسية' : 'Accueil' }}</a><span>›</span>
        <span aria-current="page">{{ ar ? 'عن نداويك' : 'À propos' }}</span>
      </nav>
      <header>
        <h1>{{ ar ? 'عن نداويك (Tabibi سابقًا)' : 'À propos de Ndawik (نداويك)' }}</h1>
        <p class="pg-intro">{{ ar
          ? 'نداويك («أُداويك») منصة طبية جزائرية لحجز المواعيد الطبية عبر الإنترنت. كانت تُعرف سابقًا باسم Tabibi.'
          : 'Ndawik (نداويك, « je te soigne ») est une plateforme médicale algérienne de prise de rendez-vous en ligne. Elle s\\'appelait auparavant Tabibi.' }}</p>
      </header>

      <section class="pg-bloc">
        <h2>{{ ar ? 'ما هي نداويك؟' : "Qu'est-ce que Ndawik ?" }}</h2>
        <p>{{ ar
          ? 'تتيح نداويك للمرضى البحث عن طبيب حسب التخصص والولاية وحجز موعد، كما تجمع المواعيد والرسائل والوصفات الطبية والأدوية للمرضى والأطباء والسكرتارية.'
          : 'Ndawik permet de trouver un praticien par spécialité et par wilaya et de prendre rendez-vous, avec rendez-vous, médecins, secrétaires, ordonnances, messagerie et médicaments au même endroit.' }}</p>
        <ul class="pg-chiffres">
          <li><b>{{ ar ? '+75 000' : '75 000+' }}</b><span>{{ ar ? 'طبيب ومؤسسة صحية' : 'praticiens référencés' }}</span></li>
          <li><b>{{ nbWilayas }}</b><span>{{ ar ? 'ولاية' : 'wilayas couvertes' }}</span></li>
        </ul>
        <p>{{ ar ? 'الناشر: HADEV Studio.' : 'Éditeur : HADEV Studio.' }}
          {{ ar ? 'للتواصل:' : 'Contact :' }} <a href="mailto:contact@ndawik.com">contact&#64;ndawik.com</a></p>
      </section>

      <section class="pg-bloc" id="presse">
        <h2>{{ ar ? 'الصحافة' : 'Presse' }}</h2>
        <h3>{{ ar ? 'وصف قصير' : 'Description courte' }}</h3>
        <p class="pg-cite">{{ ar
          ? 'نداويك (Tabibi سابقًا) منصة طبية جزائرية لحجز المواعيد، تضم أكثر من 75 000 طبيب في الولايات الـ69. الناشر: HADEV Studio.'
          : 'Ndawik (anciennement Tabibi) est une plateforme médicale algérienne de prise de rendez-vous qui réunit plus de 75 000 praticiens dans les 69 wilayas. Éditeur : HADEV Studio.' }}</p>
        <h3>{{ ar ? 'الشعار' : 'Logo' }}</h3>
        <p><img src="/icon-512.png" alt="Ndawik — نداويك" width="96" height="96">
          <a href="/icon-512.png" download>{{ ar ? 'تحميل الشعار (PNG 512×512)' : 'Télécharger le logo (PNG 512×512)' }}</a></p>
        <h3>{{ ar ? 'تواريخ رئيسية' : 'Dates clés' }}</h3>
        <ul>
          <li>{{ ar ? '17 نوفمبر 2026: Tabibi تصبح نداويك (Ndawik).' : '17 novembre 2026 : Tabibi devient Ndawik (نداويك).' }}</li>
        </ul>
      </section>
    </main>
  `,
    styles: [`
    .pg { max-width:900px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pg-fil { display:flex; flex-wrap:wrap; gap:6px; font-size:13px; color:var(--text3); margin-bottom:18px; }
    .pg-fil a, .pg-bloc a { color:var(--vert); text-decoration:none; font-weight:600; }
    h1 { margin:0 0 8px; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; letter-spacing:-.02em; line-height:1.15; text-wrap:balance; }
    .pg-intro { margin:0 0 24px; color:var(--text3); line-height:1.6; max-width:70ch; }
    .pg-bloc { background:#fff; border:1px solid var(--border); border-radius:16px; padding:18px 22px; margin-bottom:18px; box-shadow:var(--s1); line-height:1.6; }
    .pg-bloc h2 { margin:0 0 10px; font-size:1.25rem; }
    .pg-bloc h3 { margin:16px 0 6px; font-size:1rem; }
    .pg-chiffres { display:flex; gap:28px; list-style:none; padding:0; margin:12px 0; }
    .pg-chiffres li { display:flex; flex-direction:column; }
    .pg-chiffres b { font-size:1.8rem; color:var(--vert); }
    .pg-cite { border-inline-start:3px solid var(--vert); padding-inline-start:12px; }
    .pg-bloc img { vertical-align:middle; margin-inline-end:12px; border-radius:16px; }
  `]
})
export class AProposComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);

  ar = false;
  nbWilayas = WILAYAS_SEO.length;

  ngOnInit() {
    this.ar = this.route.snapshot.data['langue'] === 'ar';
    referencerPage(this.document, this.title, this.meta, {
      titre: this.ar ? 'عن نداويك (Ndawik) — Tabibi سابقًا' : 'À propos de Ndawik (نداويك) — anciennement Tabibi',
      description: this.ar
        ? 'نداويك (Ndawik): منصة طبية جزائرية لحجز المواعيد، Tabibi سابقًا. الناشر HADEV Studio. فضاء الصحافة والشعار.'
        : 'Ndawik (نداويك), anciennement Tabibi : plateforme médicale algérienne de prise de rendez-vous, éditée par HADEV Studio. Présentation et espace presse.',
      chemin: '/a-propos',
      ar: this.ar,
    });
  }
}
