import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { Moi, MoiService } from './moi.service';

@Component({
  selector: 'app-moi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="max-width:640px;margin:40px auto;padding:0 16px">
      <h1 style="color:var(--vert)">Mon compte</h1>
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
  private auth = inject(AuthService);
  private service = inject(MoiService);
  connecte = signal(false);
  moi = signal<Moi | null>(null);

  async ngOnInit() {
    await this.auth.pret();
    if (this.auth.estConnecte()) {
      this.connecte.set(true);
      this.service.moi().subscribe((m) => this.moi.set(m));
    }
  }

  seConnecter() { this.auth.seConnecter(); }
  seDeconnecter() { this.auth.seDeconnecter(); this.connecte.set(false); }
}
