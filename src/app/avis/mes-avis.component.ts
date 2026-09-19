import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { Avis, AvisService, libelleStatutAvis } from './avis.service';
import { SeoService } from '../seo/seo.service';

/** Avis deposes par le patient connecte (GET /api/avis/mes), tous statuts, les plus recents d'abord. */
@Component({
  selector: 'app-mes-avis',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">Mes avis</h1>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let a of avis()" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
            <strong>{{ a.note }} / 5</strong>
            <span style="color:#566b64"> · {{ libelleStatut(a.statut) }} · {{ a.deposeLe | date:'d MMMM yyyy' }}</span><br>
            <a [routerLink]="['/medecins', a.medecinId]" style="color:var(--vert)">{{ noms()[a.medecinId] ?? 'Voir le praticien' }}</a>
            <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && avis().length === 0">
          Aucun avis pour le moment. Vous pouvez noter un rendez-vous honoré depuis
          <a routerLink="/mes-rendez-vous" style="color:var(--vert)">Mes rendez-vous</a>.
        </p>
      </ng-container>
    </main>
  `,
})
export class MesAvisComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(AvisService);
  private annuaire = inject(AnnuaireService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  avis = signal<Avis[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  erreur = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('Mes avis');
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mes().subscribe({
      next: (liste) => {
        // Les plus recents d'abord.
        this.avis.set([...liste].sort((a, b) => Date.parse(b.deposeLe) - Date.parse(a.deposeLe)));
        this.chargerNoms(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux patients.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos avis.');
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutAvis(statut);
  }

  /** Recupere (une seule fois par praticien) le nom des medecins notes. */
  private chargerNoms(liste: Avis[]) {
    const ids = new Set(liste.map((a) => a.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }
}
