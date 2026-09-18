import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { libelleStatutOrdonnance } from './statut-ordonnance';

@Component({
  selector: 'app-ordonnance-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p class="sans-impression" style="margin:0 0 16px">
        <a *ngIf="!estMedecin()" routerLink="/mes-ordonnances" style="color:var(--vert)">Retour à mes ordonnances</a>
        <a *ngIf="estMedecin()" routerLink="/medecin/ordonnances" style="color:var(--vert)">Retour à mes ordonnances rédigées</a>
      </p>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>
      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <article *ngIf="ordonnance() as o">
        <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <h1 style="color:var(--vert);margin:0 0 4px">Ordonnance</h1>
            <p style="color:#566b64;margin:0">
              Émise le {{ o.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }} · {{ libelleStatut(o.statut) }}
            </p>
            <p style="color:#566b64;margin:4px 0 0">
              Praticien : {{ medecin()?.nomComplet ?? o.medecinId }}<br>
              Patient : {{ o.patientId }}
            </p>
          </div>
          <button type="button" class="bouton sans-impression" (click)="imprimer()">Imprimer</button>
        </header>

        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="text-align:left;color:#566b64">
              <th style="padding:8px;border-bottom:2px solid #e4e9e7">Médicament</th>
              <th style="padding:8px;border-bottom:2px solid #e4e9e7">Posologie</th>
              <th style="padding:8px;border-bottom:2px solid #e4e9e7">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of o.lignes">
              <td style="padding:8px;border-bottom:1px solid #e4e9e7"><strong>{{ l.medicament }}</strong></td>
              <td style="padding:8px;border-bottom:1px solid #e4e9e7">{{ l.posologie }}</td>
              <td style="padding:8px;border-bottom:1px solid #e4e9e7">{{ l.duree }}</td>
            </tr>
          </tbody>
        </table>

        <section style="border:2px dashed var(--vert);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0 0 4px;color:#566b64">Code de vérification</p>
          <p style="margin:0;font-size:2.2rem;font-weight:700;letter-spacing:.15em;font-family:ui-monospace,monospace;color:var(--vert)">
            {{ o.codeVerification }}
          </p>
          <p style="margin:8px 0 0;color:#566b64;font-size:.9rem">
            Authenticité vérifiable sur Tabibi, page
            <a routerLink="/verifier" [queryParams]="{ code: o.codeVerification }" style="color:var(--vert)">Vérifier une ordonnance</a>.
          </p>
        </section>
      </article>
    </main>
  `,
})
export class OrdonnanceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private annuaire = inject(AnnuaireService);
  private roleService = inject(RoleService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Lien de retour : liste du patient ou liste des ordonnances redigees par le medecin. */
  estMedecin = this.roleService.estMedecin;
  ordonnance = signal<Ordonnance | null>(null);
  /** Praticien emetteur, lu dans l'annuaire pour afficher son nom. */
  medecin = signal<Medecin | null>(null);
  charge = signal(false);
  erreur = signal('');

  async ngOnInit() {
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? ''));
  }

  imprimer() {
    window.print();
  }

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut);
  }

  private charger(id: string) {
    this.ordonnance.set(null);
    this.medecin.set(null);
    this.erreur.set('');
    this.charge.set(true);
    this.service.parId(id).subscribe({
      next: (o) => {
        this.ordonnance.set(o);
        this.charge.set(false);
        this.chargerMedecin(o.medecinId);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set("Vous n'avez pas accès à cette ordonnance.");
        } else if (e.status === 404) {
          this.erreur.set('Ordonnance introuvable.');
        } else {
          this.erreur.set(e.error?.erreur ?? "Impossible de charger l'ordonnance.");
        }
      },
    });
  }

  /** Nom du praticien (annuaire public) ; a defaut, l'identifiant reste affiche. */
  private chargerMedecin(medecinId: string) {
    this.annuaire.medecin(medecinId).subscribe({
      next: (m) => this.medecin.set(m),
      error: () => this.medecin.set(null),
    });
  }
}
