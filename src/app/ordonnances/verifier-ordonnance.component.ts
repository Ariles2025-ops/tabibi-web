import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';
import { SeoService } from '../seo/seo.service';
import { OrdonnanceService, Verification } from './ordonnance.service';
import { libelleStatutOrdonnance } from './statut-ordonnance';

/** Page publique : un pharmacien saisit le code imprime sur l'ordonnance pour en verifier l'authenticite. */
@Component({
  selector: 'app-verifier-ordonnance',
  standalone: true,
  imports: [CommonModule, FormsModule, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'verifier.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'verifier.consigne' | t }}</p>

      <form (ngSubmit)="verifier()" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px">
        <input class="champ" [(ngModel)]="code" name="code" [placeholder]="'verifier.code' | t" autocomplete="off"
               style="flex:1;min-width:200px;letter-spacing:.1em">
        <button type="submit" class="bouton" [disabled]="charge() || !code.trim()">
          {{ (charge() ? 'verifier.verification' : 'verifier.verifier') | t }}
        </button>
      </form>

      <ng-container *ngIf="resultat() as r">
        <p *ngIf="r.valide" style="color:var(--vert);font-weight:600">
          {{ 'verifier.authentique' | t:{ date: (r.emiseLe | dateLocale:'jourDateHeure') } }}<ng-container *ngIf="r.statut"> ({{ libelleStatut(r.statut) }})</ng-container>.
        </p>
        <p *ngIf="!r.valide" style="color:#b3261e;font-weight:600">{{ 'verifier.inconnu' | t }}</p>
      </ng-container>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
    </main>
  `,
})
export class VerifierOrdonnanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(OrdonnanceService);
  private seo = inject(SeoService);
  private i18n = inject(TraductionService);

  code = '';
  charge = signal(false);
  resultat = signal<Verification | null>(null);
  erreur = signal('');

  /** Un lien /verifier?code=... (depuis le detail d'une ordonnance) lance la verification directement. */
  ngOnInit() {
    this.seo.definir({ titre: 'seo.verifier.titre', description: 'seo.verifier.description', canonique: '/verifier' });
    this.route.queryParamMap.subscribe((params) => {
      const code = params.get('code');
      if (code) {
        this.code = code;
        this.verifier();
      }
    });
  }

  verifier() {
    const code = this.code.trim();
    if (!code) return;
    this.charge.set(true);
    this.resultat.set(null);
    this.erreur.set('');
    this.service.verifier(code).subscribe({
      next: (r) => {
        this.resultat.set(r);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Code absent : l'API peut repondre 404 plutot que { valide: false }.
          this.resultat.set({ valide: false, emiseLe: null, statut: null });
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('verifier.echec'));
        }
      },
    });
  }

  libelleStatut(statut: string | null): string {
    return libelleStatutOrdonnance(statut, this.i18n.t.bind(this.i18n));
  }
}
