import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { ProfilService } from '../moi/profil.service';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { libelleStatutOrdonnance } from './statut-ordonnance';
import { BadgeStatutOrdonnanceComponent } from './badge-statut-ordonnance.component';

@Component({
    selector: 'app-ordonnance-detail',
    imports: [CommonModule, RouterLink, BadgeStatutOrdonnanceComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p class="sans-impression" style="margin:0 0 16px">
        <a *ngIf="!estMedecin()" routerLink="/mes-ordonnances" style="color:var(--vert)">Retour à mes ordonnances</a>
        <a *ngIf="estMedecin()" routerLink="/medecin/ordonnances" style="color:var(--vert)">Retour à mes ordonnances rédigées</a>
      </p>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <article *ngIf="ordonnance() as o">
        <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <h1 style="color:var(--vert);margin:0 0 4px">Ordonnance</h1>
            <p style="color:var(--text3);margin:0">
              Émise le {{ o.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }} · <app-badge-statut-ordonnance [statut]="o.statut" />
            </p>
            <p *ngIf="o.statut === 'ANNULEE'" style="color:var(--red);margin:4px 0 0">Annulée par le médecin<ng-container *ngIf="o.motifAnnulation"> : {{ o.motifAnnulation }}</ng-container></p>
            <p *ngIf="o.statut === 'DELIVREE'" style="color:var(--text2);margin:4px 0 0">Délivrée en pharmacie<ng-container *ngIf="o.delivreeLe"> le {{ o.delivreeLe | date:'d MMMM yyyy' }}</ng-container></p>
            <p style="color:var(--text3);margin:4px 0 0">
              Praticien : {{ medecin()?.nomComplet ?? 'Votre médecin' }}
              <ng-container *ngIf="nomPatient()"><br>Patient : {{ nomPatient() }}</ng-container>
            </p>
          </div>
          <button type="button" class="bouton sans-impression" (click)="imprimer()">Imprimer</button>
        </header>

        <p *ngIf="!o.lignes?.length" class="ordonnance-sans-medicament" style="margin:24px 0;color:var(--text3)">Aucun médicament sur cette ordonnance.</p>
        <table *ngIf="o.lignes?.length" style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="text-align:left;color:var(--text3)">
              <th style="padding:8px;border-bottom:2px solid var(--border)">Médicament</th>
              <th style="padding:8px;border-bottom:2px solid var(--border)">Posologie</th>
              <th style="padding:8px;border-bottom:2px solid var(--border)">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of o.lignes">
              <td style="padding:8px;border-bottom:1px solid var(--border)"><strong>{{ l.medicament }}</strong></td>
              <td style="padding:8px;border-bottom:1px solid var(--border)">{{ l.posologie }}</td>
              <td style="padding:8px;border-bottom:1px solid var(--border)">{{ l.duree }}</td>
            </tr>
          </tbody>
        </table>

        <section style="border:2px dashed var(--vert);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0 0 4px;color:var(--text3)">Code de vérification</p>
          <p style="margin:0;font-size:2.2rem;font-weight:700;letter-spacing:.15em;font-family:ui-monospace,monospace;color:var(--vert)">
            {{ o.codeVerification }}
          </p>
          <p class="sans-impression" style="margin:8px 0 0">
            <button type="button" class="bouton-copier bouton sans-impression" [disabled]="!o.codeVerification" (click)="copierCode(o.codeVerification)">Copier le code</button>
          </p>
          <p *ngIf="codeCopie()" class="code-copie sans-impression" role="status" style="margin:8px 0 0;color:var(--vert)">Code copié</p>
          <p *ngIf="aPresenter(o.statut)" class="a-presenter" style="margin:8px 0 0;color:var(--text3);font-size:.9rem">
            À présenter en pharmacie ; vérifiable sans compte via
            <a routerLink="/verifier" [queryParams]="{ code: o.codeVerification }" style="color:var(--vert)">Vérifier une ordonnance</a>.
          </p>
          <p *ngIf="!aPresenter(o.statut)" style="margin:8px 0 0;color:var(--text3);font-size:.9rem">
            Authenticité vérifiable sur Ndawik, page
            <a routerLink="/verifier" [queryParams]="{ code: o.codeVerification }" style="color:var(--vert)">Vérifier une ordonnance</a>.
          </p>
        </section>
      </article>
    </main>
  `
})
export class OrdonnanceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private annuaire = inject(AnnuaireService);
  private roleService = inject(RoleService);
  private profils = inject(ProfilService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Lien de retour : liste du patient ou liste des ordonnances redigees par le medecin. */
  estMedecin = this.roleService.estMedecin;
  ordonnance = signal<Ordonnance | null>(null);
  /** Praticien emetteur, lu dans l'annuaire pour afficher son nom. */
  medecin = signal<Medecin | null>(null);
  /** Nom du patient, lu dans MON profil quand je suis ce patient ; jamais d'identifiant brut a l'impression. */
  nomPatient = signal<string | null>(null);
  charge = signal(false);
  erreur = signal('');
  codeCopie = signal(false);

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

  /** Vrai tant que l'ordonnance peut encore etre presentee en pharmacie (ni annulee ni delivree), comme l'appli. */
  aPresenter(statut: string): boolean {
    return !['ANNULEE', 'DELIVREE'].includes((statut ?? '').trim().toUpperCase());
  }

  /** Copie le code de verification (comme « Copier le code » de l'appli) puis confirme « Code copié ». */
  async copierCode(code: string) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.codeCopie.set(true);
    } catch {
      this.codeCopie.set(false);
    }
  }

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut);
  }

  private charger(id: string) {
    this.ordonnance.set(null);
    this.medecin.set(null);
    this.nomPatient.set(null);
    this.erreur.set('');
    this.charge.set(true);
    this.service.parId(id).subscribe({
      next: (o) => {
        this.ordonnance.set(o);
        this.charge.set(false);
        this.chargerMedecin(o.medecinId);
        this.chargerNomPatient(o.patientId);
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

  /**
   * Nom du patient : GET /api/moi/profil (nomComplet), retenu seulement si ce profil est celui du patient de
   * l'ordonnance (meme sujet Keycloak) ; profil absent ou autre lecteur (medecin) : la ligne est omise.
   */
  private chargerNomPatient(patientId: string) {
    this.profils.monProfil().subscribe({
      next: (p) => this.nomPatient.set(p.utilisateurId === patientId && p.nomComplet?.trim() ? p.nomComplet.trim() : null),
      error: () => this.nomPatient.set(null),
    });
  }

  /** Nom du praticien (annuaire public) ; a defaut, « Votre médecin » (jamais l'identifiant brut). */
  private chargerMedecin(medecinId: string) {
    this.annuaire.medecin(medecinId).subscribe({
      next: (m) => this.medecin.set(m),
      error: () => this.medecin.set(null),
    });
  }
}
