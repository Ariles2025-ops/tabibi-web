import { Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

/** Affichee quand le profil (/api/moi) n'a pas pu etre lu : evite de renvoyer le professionnel a l'accueil sans explication. */
@Component({
    selector: 'app-compte-indisponible',
    template: `
    <main class="pg" role="alert">
      <h1>Impossible de vérifier votre compte</h1>
      <p class="pg-intro">Vérifiez votre connexion et réessayez.</p>
      <button type="button" class="bouton" (click)="reessayer()">Réessayer</button>
    </main>
  `,
    styles: [`
    .pg { max-width:640px; margin:0 auto; padding:56px var(--gutter, 16px); text-align:center; color:var(--ink); }
    h1 { margin:0 0 8px; font-size:clamp(1.5rem,3vw,2rem); font-weight:800; letter-spacing:-.02em; }
    .pg-intro { color:var(--text3); margin:0 0 24px; }
  `]
})
export class CompteIndisponibleComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    this.title.setTitle('Compte indisponible | Ndawik');
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  /** Retourne sur la page demandee (la garde relit alors le profil) ; seuls les chemins internes sont acceptes. */
  reessayer() {
    const retour = this.route.snapshot.queryParamMap.get('retour');
    const sur = retour && retour.startsWith('/') && !retour.startsWith('//') && !retour.startsWith('/\\');
    this.router.navigateByUrl(sur ? retour : '/');
  }
}
