import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SPECIALITES_PRINCIPALES, SPECIALITES_SEO, WILAYAS_PRINCIPALES, WILAYAS_SEO } from './seo/referentiel-seo';

/** Page « Lancement prochainement » : remplace la connexion et l'inscription pendant le pre-lancement. */
@Component({
  selector: 'app-bientot',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="bt">
      <section class="bt-hero">
        <span class="bt-pastille">Bientôt disponible</span>
        <h1>Lancement prochainement</h1>
        <p>Tabibi ouvre très bientôt la prise de rendez-vous en ligne avec les médecins de toute l'Algérie.
           La création de compte et la connexion seront disponibles dès le lancement.</p>
        <a class="bouton" routerLink="/specialites">Parcourir l'annuaire des médecins</a>
      </section>

      <section class="bt-bloc">
        <h2>En attendant, trouvez votre médecin</h2>
        <div class="bt-liens">
          <a *ngFor="let s of specialites" [routerLink]="['/specialites', s.slug]">{{ s.nom }}</a>
        </div>
        <div class="bt-liens">
          <a *ngFor="let w of wilayas" [routerLink]="['/wilayas', w.slug]">Médecins à {{ w.nom }}</a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .bt { max-width:960px; margin:0 auto; padding:32px var(--gutter, 16px) 56px; color:var(--ink); }
    .bt-hero { text-align:center; background:linear-gradient(155deg, var(--vert) 0%, #0a4d3e 100%); color:#fff; border-radius:24px; padding:48px 24px; box-shadow:var(--s2); }
    .bt-pastille { display:inline-block; background:#D4A437; color:#10241F; font-weight:800; font-size:12px; letter-spacing:.08em; text-transform:uppercase; padding:6px 14px; border-radius:999px; }
    .bt-hero h1 { color:#fff !important; margin:16px 0 12px; font-size:clamp(2rem,6vw,3.4rem); font-weight:800; letter-spacing:-.03em; line-height:1.05; text-wrap:balance; }
    .bt-hero p { margin:0 auto 24px; max-width:56ch; color:rgba(255,255,255,.9); line-height:1.6; }
    .bt-hero .bouton { background:#fff; color:var(--vert); text-decoration:none; }
    .bt-bloc { margin-top:36px; }
    .bt-bloc h2 { font-size:1.15rem; font-weight:800; margin:0 0 14px; }
    .bt-liens { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .bt-liens a { padding:7px 12px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--ink); text-decoration:none; font-size:13px; }
    .bt-liens a:hover { border-color:var(--vert); color:var(--vert); }
  `],
})
export class BientotComponent {
  readonly specialites = SPECIALITES_PRINCIPALES.map((s) => SPECIALITES_SEO.find((x) => x.slug === s)!).filter(Boolean);
  readonly wilayas = WILAYAS_PRINCIPALES.map((c) => WILAYAS_SEO.find((w) => w.code === c)!).filter(Boolean);
}
