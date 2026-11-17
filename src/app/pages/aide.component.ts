import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { referencerPage } from '../seo/page-seo';

interface Question { q: string; r: string; lien?: { texte: string; vers: string }; }

const FR: Question[] = [
  { q: 'Comment prendre rendez-vous ?', r: "Recherchez un praticien par nom, spécialité ou wilaya, ouvrez sa fiche et choisissez un créneau libre. La prise de rendez-vous en ligne ouvre très bientôt : la plateforme est déjà consultable." },
  { q: 'Ndawik est-il payant ?', r: "Non, Ndawik est gratuit pour les patients. La consultation se règle au cabinet, en espèces ou avec la carte Chifa selon le praticien. Aucun prépaiement n'est demandé." },
  { q: 'Comment annuler un rendez-vous ?', r: 'Depuis « Mes rendez-vous », annulez le rendez-vous : le créneau est libéré pour un autre patient.' },
  { q: 'Comment me connecter ?', r: 'Par téléphone (code SMS) ou par e-mail et mot de passe.' },
  { q: 'Je suis praticien, comment rejoindre Ndawik ?', r: "Retrouvez votre fiche ou déposez votre candidature avec votre numéro d'inscription à l'Ordre. Notre équipe le vérifie avant d'activer votre compte.", lien: { texte: 'Vous êtes praticien ?', vers: '/praticien' } },
  { q: 'Comment supprimer mon compte ?', r: "Dans l'application : « Mon profil » ; sur le site : « Mon compte ». Choisissez « Supprimer mon compte », ou écrivez-nous à contact@tabibi.doctor.", lien: { texte: 'Supprimer mon compte', vers: '/supprimer-mon-compte' } },
  { q: 'Comment vous contacter ?', r: 'Écrivez-nous à contact@tabibi.doctor : nous répondons sous 48 heures ouvrées.' },
];

const AR: Question[] = [
  { q: 'كيف أحجز موعدًا؟', r: 'ابحث عن طبيب بالاسم أو التخصص أو الولاية، افتح صفحته واختر موعدًا متاحًا. حجز المواعيد عبر الإنترنت متاح قريبًا جدًا، ويمكنك البحث عن طبيب من الآن.' },
  { q: 'هل نداويك مجاني؟', r: 'نعم، نداويك مجاني للمرضى. تُدفع الاستشارة في العيادة نقدًا أو ببطاقة الشفاء حسب الطبيب، دون أي دفع مسبق.' },
  { q: 'كيف ألغي موعدًا؟', r: 'من صفحة «مواعيدي» ألغِ الموعد ليصبح متاحًا لمريض آخر.' },
  { q: 'كيف أسجّل الدخول؟', r: 'برقم الهاتف (رمز عبر رسالة قصيرة) أو بالبريد الإلكتروني وكلمة المرور.' },
  { q: 'أنا طبيب، كيف أنضم إلى نداويك؟', r: 'ابحث عن صفحتك أو قدّم طلبك مع رقم تسجيلك في عمادة الأطباء. يتحقق فريقنا منه قبل تفعيل حسابك.', lien: { texte: 'هل أنت طبيب؟', vers: '/praticien' } },
  { q: 'كيف أحذف حسابي؟', r: 'في التطبيق من «ملفي الشخصي»، وفي الموقع من «حسابي»، اختر «حذف حسابي»، أو راسلنا على contact@tabibi.doctor.', lien: { texte: 'حذف الحساب', vers: '/supprimer-mon-compte' } },
  { q: 'كيف أتواصل معكم؟', r: 'راسلنا على contact@tabibi.doctor، نرد خلال 48 ساعة عمل.' },
];

/** Centre d'aide public (/aide et /ar/aide) : questions frequentes courtes et contact. */
@Component({
    selector: 'app-aide',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="pg" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <div class="pg-haut">
        <a [routerLink]="ar ? '/ar' : '/'" class="pg-retour">{{ ar ? 'الرئيسية' : 'Accueil' }}</a>
        <a class="pg-langue" [routerLink]="ar ? '/aide' : '/ar/aide'" [attr.lang]="ar ? 'fr' : 'ar'">{{ ar ? 'Français' : 'العربية' }}</a>
      </div>
      <h1>{{ ar ? 'مركز المساعدة' : "Centre d'aide" }}</h1>
      <p class="pg-intro">{{ ar ? 'أجوبة عن الأسئلة الأكثر شيوعًا. لم تجد جوابك؟ راسلنا.' : "Les réponses aux questions les plus fréquentes. Vous ne trouvez pas ? Écrivez-nous." }}</p>
      <section class="pg-faq">
        <details *ngFor="let f of questions; let premier = first" [open]="premier">
          <summary>{{ f.q }}</summary>
          <p>{{ f.r }} <a *ngIf="f.lien" [routerLink]="f.lien.vers">{{ f.lien.texte }}</a></p>
        </details>
      </section>
      <a class="bouton" href="mailto:contact@tabibi.doctor">{{ ar ? 'اتصل بنا' : 'Nous contacter' }}</a>
    </main>
  `,
    styles: [`
    .pg { max-width:760px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pg-haut { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; }
    .pg-retour { color:var(--vert); font-weight:600; font-size:13px; text-decoration:none; }
    .pg-langue { padding:6px 14px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--vert); font-weight:700; font-size:13px; text-decoration:none; }
    h1 { margin:0 0 8px; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; letter-spacing:-.02em; line-height:1.15; }
    .pg-intro { margin:0 0 20px; color:var(--text3); line-height:1.6; }
    .pg-faq { margin-bottom:24px; }
    .pg-faq details { background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:8px; }
    .pg-faq summary { cursor:pointer; font-weight:700; }
    .pg-faq p { color:var(--text3); margin:8px 0 0; line-height:1.55; }
    .pg-faq a { color:var(--vert); font-weight:700; }
  `]
})
export class AideComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);
  ar = false;
  questions: Question[] = FR;

  ngOnInit() {
    this.ar = this.route.snapshot.data['langue'] === 'ar';
    this.questions = this.ar ? AR : FR;
    referencerPage(this.document, this.title, this.meta, {
      titre: this.ar ? 'مركز المساعدة' : "Centre d'aide",
      description: this.ar
        ? 'مساعدة نداويك: حجز موعد، الإلغاء، تسجيل الدخول، حذف الحساب والتواصل معنا.'
        : "Aide Ndawik : prendre ou annuler un rendez-vous, se connecter, rejoindre Ndawik en tant que praticien, supprimer son compte, nous contacter.",
      chemin: '/aide',
      ar: this.ar,
    });
  }
}
