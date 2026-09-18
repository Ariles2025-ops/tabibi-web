import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav style="background:var(--vert)">
      <div style="max-width:720px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <span style="color:#fff;font-weight:700;font-size:1.15rem">Tabibi</span>
        <a routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
        <a routerLink="/mes-rendez-vous" routerLinkActive="actif">Mes rendez-vous</a>
        <a *ngIf="connecte()" routerLink="/mes-ordonnances" routerLinkActive="actif">Mes ordonnances</a>
        <a routerLink="/verifier" routerLinkActive="actif">Vérifier une ordonnance</a>
        <a routerLink="/moi" routerLinkActive="actif" style="margin-left:auto">Mon compte</a>
      </div>
    </nav>
    <router-outlet />
  `,
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);

  /** Etat de connexion, connu une fois l'initialisation OIDC terminee (liens reserves aux connectes). */
  connecte = signal(false);

  /** Initialisation OIDC unique pour toute l'application (les pages attendent auth.pret()). */
  async ngOnInit() {
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
  }
}
