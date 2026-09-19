import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { InscriptionAttente, ListeAttenteService } from '../liste-attente/liste-attente.service';
import { abregerIdentifiant } from '../messagerie/messagerie.service';
import { SeoService } from '../seo/seo.service';
import { DateLocalePipe } from '../i18n/date-locale.pipe';
import { TPipe } from '../i18n/t.pipe';
import { TraductionService } from '../i18n/traduction.service';

/**
 * Liste d'attente du medecin (GET /api/medecin/liste-attente) : patients inscrits, du plus ancien au plus recent,
 * designes par un identifiant abrege et leur date d'inscription. Ils sont prevenus par l'API des qu'un creneau
 * s'ouvre ou se libere.
 */
@Component({
  selector: 'app-liste-attente-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, DateLocalePipe],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">{{ 'listeAttenteMedecin.titre' | t }}</h1>
      <p style="color:#566b64;margin:0 0 20px">{{ 'listeAttenteMedecin.intro' | t }}</p>

      <p *ngIf="charge()">{{ 'commun.chargement' | t }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ol class="liste-numerotee" style="padding-inline-start:24px;margin:0;display:grid;gap:10px">
        <li *ngFor="let i of inscriptions()" style="padding:4px 0">
          <strong>{{ 'commun.patient' | t:{ id: abreger(i.patientId) } }}</strong>
          <span style="color:#566b64"> · {{ 'listeAttenteMedecin.inscritLe' | t:{ date: (i.inscritLe | dateLocale:'dateHeure') } }}</span>
        </li>
      </ol>
      <p *ngIf="!charge() && !erreur() && inscriptions().length === 0">
        {{ 'listeAttenteMedecin.aucun' | t }}
        <a routerLink="/medecin/disponibilites" style="color:var(--vert)">{{ 'commun.ouvrirCreneaux' | t }}</a>
      </p>
    </main>
  `,
})
export class ListeAttenteMedecinComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(ListeAttenteService);
  private i18n = inject(TraductionService);

  inscriptions = signal<InscriptionAttente[]>([]);
  charge = signal(false);
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('seo.listeAttente');
    this.charge.set(true);
    this.service.duMedecin().subscribe({
      next: (liste) => {
        this.inscriptions.set([...liste].sort((a, b) => Date.parse(a.inscritLe) - Date.parse(b.inscritLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.i18n.t('commun.reserveMedecins'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.i18n.t('listeAttenteMedecin.erreurChargement'));
        }
      },
    });
  }

  abreger(id: string): string {
    return abregerIdentifiant(id);
  }
}
