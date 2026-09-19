import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';
import { SeoService } from '../seo/seo.service';

/**
 * Route `**` : URL inconnue. Au rendu serveur, la reponse part avec le statut 404 (`SeoService.introuvable` →
 * `REPONSE_SERVEUR`) et `robots noindex` ; dans le navigateur, la page s'affiche apres une navigation vers un lien
 * mort sans rechargement.
 */
@Component({
  selector: 'app-page-introuvable',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'introuvable.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">
        {{ 'introuvable.texte' | t }}
      </p>
      <p style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="bouton" routerLink="/">{{ 'introuvable.trouver' | t }}</a>
        <a class="bouton-secondaire" routerLink="/verifier">{{ 'nav.verifierOrdonnance' | t }}</a>
      </p>
    </main>
  `,
})
export class PageIntrouvableComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit() {
    this.seo.introuvable();
  }
}
