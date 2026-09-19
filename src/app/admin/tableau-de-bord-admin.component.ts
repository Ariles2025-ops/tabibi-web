import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminService, StatistiquesAdministration, libelleRappels } from './admin.service';
import { SeoService } from '../seo/seo.service';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';

/**
 * Tableau de bord de l'administrateur : nombre de candidatures par statut (GET /api/admin/statistiques) et
 * declenchement manuel des rappels de rendez-vous (POST /api/admin/rappels/executer).
 */
@Component({
  selector: 'app-tableau-de-bord-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">{{ 'admin.titre' | t }}</h1>

      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul *ngIf="statistiques() as s" style="list-style:none;padding:0;margin:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <li style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <span style="display:block;color:#566b64;font-size:.9rem">{{ 'admin.candidaturesEnAttente' | t }}</span>
          <strong style="display:block;font-size:2rem;font-weight:600">{{ s.candidaturesEnAttente }}</strong>
        </li>
        <li style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <span style="display:block;color:#566b64;font-size:.9rem">{{ 'admin.candidaturesValidees' | t }}</span>
          <strong style="display:block;font-size:2rem;font-weight:600">{{ s.candidaturesValidees }}</strong>
        </li>
        <li style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
          <span style="display:block;color:#566b64;font-size:.9rem">{{ 'admin.candidaturesRefusees' | t }}</span>
          <strong style="display:block;font-size:2rem;font-weight:600">{{ s.candidaturesRefusees }}</strong>
        </li>
      </ul>

      <p style="margin:24px 0 0">
        <a class="bouton" routerLink="/admin/candidatures">{{ 'admin.examiner' | t }}</a>
      </p>

      <section style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;margin:32px 0 0">
        <h2 style="font-size:1.1rem;margin:0 0 6px">{{ 'admin.rappelsTitre' | t }}</h2>
        <p style="color:#566b64;margin:0 0 12px">{{ 'admin.rappelsTexte' | t }}</p>
        <button type="button" class="bouton-secondaire" (click)="executerRappels()" [disabled]="rappelsEnCours()">
          {{ (rappelsEnCours() ? 'commun.envoi' : 'admin.rappelsExecuter') | t }}
        </button>
        <p *ngIf="rappels()" style="color:var(--vert);margin:12px 0 0">{{ rappels() }}</p>
        <p *ngIf="erreurRappels()" style="color:#b3261e;margin:12px 0 0">{{ erreurRappels() }}</p>
      </section>
    </main>
  `,
})
export class TableauDeBordAdminComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(AdminService);
  private i18n = inject(TraductionService);

  statistiques = signal<StatistiquesAdministration | null>(null);
  charge = signal(false);
  erreur = signal('');
  rappelsEnCours = signal(false);
  /** Resultat du dernier envoi manuel (« 3 rappels envoyés ») ; vide tant qu'aucun n'a ete lance. */
  rappels = signal('');
  erreurRappels = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.administration');
    this.charge.set(true);
    this.service.statistiques().subscribe({
      next: (s) => {
        this.statistiques.set(s);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveAdmin'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('admin.erreurStatistiques'));
        }
      },
    });
  }

  /** Envoie maintenant les rappels des rendez-vous confirmes des 24 prochaines heures et affiche leur nombre. */
  executerRappels() {
    this.rappelsEnCours.set(true);
    this.rappels.set('');
    this.erreurRappels.set('');
    this.service.executerRappels().subscribe({
      next: (nombre) => {
        this.rappelsEnCours.set(false);
        this.rappels.set(libelleRappels(nombre, (cle, params) => this.i18n.t(cle, params)));
      },
      error: (e: HttpErrorResponse) => {
        this.rappelsEnCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurRappels.set(this.i18n.t('commun.actionReserveAdmin'));
        } else {
          this.erreurRappels.set(e.error?.erreur ?? this.i18n.t('admin.rappelsEchec'));
        }
      },
    });
  }
}
