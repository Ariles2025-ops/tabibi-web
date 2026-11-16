import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { StatutHttpService } from '../seo/statut-http';

/** Adresse inconnue : vraie page 404 (statut HTTP 404 au rendu serveur, noindex) avec des liens utiles. */
@Component({
  selector: 'app-page-introuvable',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="pg" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <p class="pg-code">404</p>
      <h1>{{ ar ? 'الصفحة غير موجودة' : 'Page introuvable' }}</h1>
      <p class="pg-intro">{{ ar ? 'الرابط غير صحيح أو أن الصفحة لم تعد موجودة.' : "Le lien est erroné ou la page n'existe plus." }}</p>
      <div class="pg-liens">
        <a class="bouton" [routerLink]="ar ? '/ar' : '/'">{{ ar ? 'العودة إلى الرئيسية' : "Retour à l'accueil" }}</a>
        <a class="bouton-secondaire" [routerLink]="ar ? '/ar/specialites' : '/specialites'">{{ ar ? 'دليل الأطباء' : 'Annuaire des médecins' }}</a>
      </div>
    </main>
  `,
  styles: [`
    .pg { max-width:640px; margin:0 auto; padding:56px var(--gutter, 16px); text-align:center; color:var(--ink); }
    .pg-code { margin:0; font-size:48px; font-weight:800; color:var(--vert); }
    h1 { margin:0 0 8px; font-size:clamp(1.5rem,3vw,2rem); font-weight:800; letter-spacing:-.02em; }
    .pg-intro { color:var(--text3); margin:0 0 24px; }
    .pg-liens { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
  `],
})
export class PageIntrouvableComponent implements OnInit {
  private statut = inject(StatutHttpService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private router = inject(Router);
  ar = false;

  ngOnInit() {
    this.ar = this.router.url === '/ar' || this.router.url.startsWith('/ar/');
    this.statut.introuvable();
    this.title.setTitle(this.ar ? 'الصفحة غير موجودة | طبيبي' : 'Page introuvable | Tabibi');
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
    this.document.head.querySelector('link[rel="canonical"]')?.remove();
  }
}
