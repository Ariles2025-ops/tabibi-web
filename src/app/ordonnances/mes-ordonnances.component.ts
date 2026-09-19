import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';
import { ListeOrdonnancesComponent } from './liste-ordonnances.component';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { SeoService } from '../seo/seo.service';

@Component({
  selector: 'app-mes-ordonnances',
  standalone: true,
  imports: [CommonModule, ListeOrdonnancesComponent, TPipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">{{ 'ordonnances.mesOrdonnances' | t }}</h1>

      <p *ngIf="connecte() === false">{{ 'commun.redirectionConnexion' | t }}</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <app-liste-ordonnances [ordonnances]="ordonnances()" />
        <p *ngIf="!charge() && !erreur() && ordonnances().length === 0">{{ 'ordonnances.aucune' | t }}</p>
      </ng-container>
    </main>
  `,
})
export class MesOrdonnancesComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private i18n = inject(TraductionService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  ordonnances = signal<Ordonnance[]>([]);
  charge = signal(false);
  erreur = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('seo.mesOrdonnances');
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.charger();
  }

  private charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mes().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.ordonnances.set([...liste].sort((a, b) => Date.parse(b.emiseLe) - Date.parse(a.emiseLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reservePatients'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('ordonnances.erreurChargement'));
        }
      },
    });
  }
}
