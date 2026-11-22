import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { referencerPage } from '../seo/page-seo';

/**
 * Page publique de suppression de compte (/supprimer-mon-compte) : explique la demarche, dans l'appli ou le site
 * (appli : Mon profil → Supprimer mon compte ; site : Mon compte → Supprimer mon compte) ou par e-mail. Adresse a declarer dans la Play Console (« URL de suppression
 * du compte ») ; exigence de Google Play et droit a l'effacement de la loi 18-07.
 */
@Component({
    selector: 'app-supprimer-compte',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="pg" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <div class="pg-haut">
        <a [routerLink]="ar ? '/ar' : '/'" class="pg-retour">{{ ar ? 'الرئيسية' : 'Accueil' }}</a>
        <a class="pg-langue" [routerLink]="ar ? '/supprimer-mon-compte' : '/ar/supprimer-mon-compte'" [attr.lang]="ar ? 'fr' : 'ar'">{{ ar ? 'Français' : 'العربية' }}</a>
      </div>
      <ng-container *ngIf="!ar">
      <h1>Supprimer mon compte Ndawik</h1>
      <p class="pg-intro">Vous pouvez supprimer votre compte Ndawik à tout moment, gratuitement, depuis l'application mobile, depuis le site ou par e-mail.</p>

      <section class="pg-carte">
        <h2>1. Dans l'application ou sur le site</h2>
        <ol>
          <li>Connectez-vous à votre compte Ndawik.</li>
          <li>Dans l'application, ouvrez <strong>Mon profil</strong> ; sur le site, ouvrez <strong>Mon compte</strong>.</li>
          <li>Choisissez <strong>Supprimer mon compte</strong>, puis confirmez.</li>
        </ol>
        <p>La suppression est immédiate et vous êtes déconnecté.</p>
        <a class="bouton" routerLink="/moi">Ouvrir Mon compte</a>
      </section>

      <section class="pg-carte">
        <h2>2. Par e-mail</h2>
        <p>Écrivez à <a href="mailto:contact@ndawik.com?subject=Suppression%20de%20mon%20compte">contact&#64;ndawik.com</a>
          depuis l'adresse e-mail de votre compte, ou en indiquant le numéro de téléphone du compte, avec l'objet
          « Suppression de mon compte ». Nous traitons la demande sous un mois au plus et vous confirmons la suppression.</p>
      </section>

      <section class="pg-carte">
        <h2>Ce qui est supprimé</h2>
        <ul>
          <li>Votre compte de connexion (téléphone, e-mail, mot de passe) et votre profil.</li>
          <li>Vos messages, listes d'attente, demandes Dawini et notifications.</li>
          <li>Vos rendez-vous à venir sont annulés.</li>
        </ul>
        <h2>Ce qui peut être conservé</h2>
        <ul>
          <li>Vos rendez-vous passés, sans aucun lien avec vous, dans l'agenda du médecin.</li>
          <li>La note (sans commentaire) de vos avis.</li>
          <li>Les ordonnances, pour leur vérification par les pharmacies et les obligations légales : 10 ans au plus.</li>
          <li>Le journal de sécurité (accès au service) : 12 mois.</li>
          <li>Les sauvegardes, effacées d'elles-mêmes en 60 jours au plus.</li>
        </ul>
        <h2>Si vous êtes médecin</h2>
        <p>Vos rendez-vous à venir sont annulés (les patients concernés sont prévenus) et votre fiche publique est retirée de la plateforme.</p>
        <p>Pour en savoir plus, consultez notre <a href="/legal/confidentialite.html">politique de confidentialité</a>
          et les <a href="/legal/cgu.html">conditions d'utilisation</a>.</p>
      </section>
      </ng-container>

      <ng-container *ngIf="ar">
      <h1>حذف حسابي في نداويك</h1>
      <p class="pg-intro">يمكنك حذف حسابك في نداويك في أي وقت ومجانًا، من التطبيق أو من الموقع أو عبر البريد الإلكتروني.</p>

      <section class="pg-carte">
        <h2>1. من التطبيق أو من الموقع</h2>
        <ol>
          <li>سجّل الدخول إلى حسابك في نداويك.</li>
          <li>في التطبيق افتح <strong>ملفي الشخصي</strong>، وفي الموقع افتح <strong>حسابي</strong>.</li>
          <li>اختر <strong>حذف حسابي</strong> ثم أكّد.</li>
        </ol>
        <p>يتم الحذف فورًا ويُسجَّل خروجك.</p>
        <a class="bouton" routerLink="/moi">فتح حسابي</a>
      </section>

      <section class="pg-carte">
        <h2>2. عبر البريد الإلكتروني</h2>
        <p>راسلنا على <a href="mailto:contact@ndawik.com?subject=%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A">contact&#64;ndawik.com</a>
          من البريد الإلكتروني المرتبط بحسابك، أو مع ذكر رقم هاتف الحساب، وعنوان الرسالة «حذف حسابي».
          نعالج الطلب في أجل أقصاه شهر ونؤكد لك الحذف.</p>
      </section>

      <section class="pg-carte">
        <h2>ما يتم حذفه</h2>
        <ul>
          <li>حساب الدخول الخاص بك (الهاتف والبريد الإلكتروني وكلمة المرور) وملفك الشخصي.</li>
          <li>رسائلك وقوائم الانتظار وطلبات دَويني والإشعارات.</li>
          <li>تُلغى مواعيدك القادمة.</li>
        </ul>
        <h2>ما قد يتم الاحتفاظ به</h2>
        <ul>
          <li>مواعيدك السابقة، دون أي صلة بك، في أجندة الطبيب.</li>
          <li>تقييم (النجوم) آرائك، دون التعليق.</li>
          <li>الوصفات الطبية، للتحقق منها من طرف الصيدليات ولأسباب قانونية: 10 سنوات على الأكثر.</li>
          <li>سجل الأمان (الدخول إلى الخدمة): 12 شهرًا.</li>
          <li>النسخ الاحتياطية، وتُمحى تلقائيًا في أجل أقصاه 60 يومًا.</li>
        </ul>
        <h2>إذا كنت طبيبًا</h2>
        <p>تُلغى مواعيدك القادمة (ويُبلَّغ المرضى المعنيون) وتُسحب بطاقتك العامة من المنصة.</p>
        <p>لمعرفة المزيد، اطّلع على <a href="/legal/confidentialite.html">سياسة الخصوصية</a>
          و<a href="/legal/cgu.html">شروط الاستخدام</a>.</p>
      </section>
      </ng-container>
    </main>
  `,
    styles: [`
    .pg { max-width:760px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pg-haut { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; }
    .pg-langue { padding:6px 14px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--vert); font-weight:700; font-size:13px; text-decoration:none; }
    .pg-retour { color:var(--vert); font-weight:600; font-size:13px; text-decoration:none; }
    h1 { margin:0 0 8px; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; letter-spacing:-.02em; line-height:1.15; text-wrap:balance; }
    .pg-intro { margin:0 0 20px; color:var(--text3); line-height:1.6; }
    .pg-carte { background:#fff; border:1px solid var(--border); border-radius:16px; box-shadow:var(--s1); padding:18px 20px; margin-bottom:14px; }
    .pg-carte h2 { font-size:1.05rem; font-weight:700; margin:0 0 10px; }
    .pg-carte h2 + ul { margin-top:0; }
    .pg-carte p, .pg-carte li { color:var(--text3); line-height:1.55; }
    .pg-carte a:not(.bouton) { color:var(--vert); font-weight:700; }
  `]
})
export class SupprimerCompteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  ar = false;
  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    this.ar = this.route.snapshot?.data?.['langue'] === 'ar';
    referencerPage(this.document, this.title, this.meta, {
      titre: this.ar ? 'حذف حسابي' : 'Supprimer mon compte',
      description: this.ar
        ? 'كيف تحذف حسابك في نداويك: من التطبيق («ملفي الشخصي») أو من الموقع («حسابي») ثم «حذف حسابي»، أو عبر البريد الإلكتروني contact@ndawik.com.'
        : "Comment supprimer votre compte Ndawik : depuis l'application (Mon profil) ou le site (Mon compte) puis « Supprimer mon compte », ou par e-mail à contact@ndawik.com.",
      chemin: '/supprimer-mon-compte',
      ar: this.ar,
    });
  }
}
