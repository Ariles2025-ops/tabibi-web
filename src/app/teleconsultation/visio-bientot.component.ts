import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Remplace les pages de teleconsultation tant que la visio n'est pas ouverte (VISIO_ACTIVE). */
@Component({
    selector: 'app-visio-bientot',
    imports: [RouterLink],
    template: `
    <main style="max-width:640px;margin:48px auto;padding:0 16px;text-align:center">
      <span style="display:inline-block;background:#D4A437;color:var(--tbi-ink);font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px">Bientôt</span>
      <h1 style="color:var(--vert);margin:16px 0 10px">Téléconsultation</h1>
      <p style="color:var(--text3);line-height:1.6;margin:0 0 22px">
        La consultation à distance par vidéo arrive bientôt sur Ndawik. En attendant, vos rendez-vous se passent au cabinet.
      </p>
      <a class="bouton" routerLink="/">Retour à l'accueil</a>
    </main>
  `
})
export class VisioBientotComponent {}
