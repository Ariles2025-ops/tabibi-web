import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';

/** Remplace les pages de teleconsultation tant que la visio n'est pas ouverte (VISIO_ACTIVE) ; francais ou arabe, comme l'appli. */
@Component({
    selector: 'app-visio-bientot',
    imports: [RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:640px;margin:48px auto;padding:0 16px;text-align:center" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <app-selecteur-langue />
      <div style="margin-top:16px">
        <span class="visio-badge" style="display:inline-block;background:#D4A437;color:var(--tbi-ink);font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px">{{ l.t('Bientôt', 'قريبًا') }}</span>
      </div>
      <h1 style="color:var(--vert);margin:16px 0 10px">{{ l.t('Téléconsultation', 'الاستشارة عن بُعد') }}</h1>
      <p class="visio-texte" style="color:var(--text3);line-height:1.6;margin:0 0 22px">
        {{ l.t('La consultation à distance par vidéo arrive bientôt sur Ndawik. En attendant, vos rendez-vous se passent au cabinet.', 'الاستشارة عن بُعد عبر الفيديو ستتوفر قريبًا على نداويك. وفي الانتظار، تتم مواعيدك في العيادة.') }}
      </p>
      <a class="bouton" routerLink="/">{{ l.t("Retour à l'accueil", 'العودة إلى الرئيسية') }}</a>
    </main>
  `
})
export class VisioBientotComponent {
  l = inject(LangueService);
}
