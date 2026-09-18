import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from '../auth/auth.config';
import { Moi, MoiService } from './moi.service';

@Component({
  selector: 'app-moi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="max-width:640px;margin:40px auto;padding:0 16px">
      <h1 style="color:var(--vert)">Tabibi</h1>
      <button *ngIf="!connecte()" (click)="seConnecter()">Se connecter</button>
      <div *ngIf="connecte()">
        <p>Connecte en tant que <b>{{ moi()?.nom }}</b></p>
        <p>Roles : {{ moi()?.roles?.join(', ') }}</p>
        <button (click)="seDeconnecter()">Se deconnecter</button>
      </div>
    </main>
  `,
})
export class MoiComponent implements OnInit {
  private oauth = inject(OAuthService);
  private service = inject(MoiService);
  connecte = signal(false);
  moi = signal<Moi | null>(null);

  async ngOnInit() {
    this.oauth.configure(authConfig);
    await this.oauth.loadDiscoveryDocumentAndTryLogin();
    if (this.oauth.hasValidAccessToken()) {
      this.connecte.set(true);
      this.service.moi().subscribe((m) => this.moi.set(m));
    }
  }

  seConnecter() { this.oauth.initCodeFlow(); }
  seDeconnecter() { this.oauth.logOut(); this.connecte.set(false); }
}
