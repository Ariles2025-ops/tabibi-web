import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';

@Component({
  selector: 'app-moi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="max-width:640px;margin:40px auto;padding:0 16px">
      <h1 style="color:var(--vert)">Mon compte</h1>
      <button *ngIf="!connecte()" type="button" class="bouton" (click)="seConnecter()">Se connecter</button>
      <div *ngIf="connecte()">
        <p>Connecté en tant que <b>{{ moi()?.nom }}</b></p>
        <p>Rôles : {{ moi()?.roles?.join(', ') }}</p>
        <button type="button" class="bouton-secondaire" (click)="seDeconnecter()">Se déconnecter</button>
      </div>
    </main>
  `,
})
export class MoiComponent implements OnInit {
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  connecte = signal(false);
  /** Profil /api/moi, lu depuis le cache de RoleService (une seule requete par chargement de page). */
  moi = this.roleService.moi;

  async ngOnInit() {
    await this.auth.pret();
    if (this.auth.estConnecte()) {
      this.connecte.set(true);
      this.roleService.charger();
    }
  }

  seConnecter() { this.auth.seConnecter(); }
  seDeconnecter() { this.auth.seDeconnecter(); this.connecte.set(false); }
}
