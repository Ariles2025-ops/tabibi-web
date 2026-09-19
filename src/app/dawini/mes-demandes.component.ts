import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, DemandeBesoin, libelleReponses, libelleStatutBesoin } from './dawini.service';
import { SeoService } from '../seo/seo.service';

/** Champs du formulaire de publication, vides. */
function formulaireVide(): Required<DemandeBesoin> {
  return { medicament: '', wilayaCode: '', commune: '', precision: '' };
}

/**
 * Dawini, cote patient : publication d'un besoin de medicament (POST /api/dawini/besoins) puis « Mes demandes »
 * (GET /api/dawini/besoins/mes), les plus recentes d'abord, avec le statut et le nombre de reponses ; chaque
 * demande mene a ses reponses. Les pharmacies de la wilaya voient le besoin sans l'identite du patient.
 */
@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Dawini</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Vous cherchez un médicament ? Publiez votre demande : les pharmacies de votre wilaya y répondent
        (disponibilité, prix), sans connaître votre identité.
      </p>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <form (ngSubmit)="publier()" style="display:grid;gap:12px;margin:0 0 28px">
          <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Médicament *
              <input class="champ" [(ngModel)]="demande.medicament" name="medicament" required placeholder="Ex. Amoxicilline 1 g" style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Wilaya (code) *
              <input class="champ" [(ngModel)]="demande.wilayaCode" name="wilayaCode" required placeholder="Ex. 16" style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Commune
              <input class="champ" [(ngModel)]="demande.commune" name="commune" placeholder="Ex. Bab Ezzouar" style="color:#10241F;font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
              Précision (dosage, forme, urgence)
              <input class="champ" [(ngModel)]="demande.precision" name="precision" placeholder="Ex. Boîte de 14 comprimés" style="color:#10241F;font-size:1rem">
            </label>
          </div>
          <p style="color:#566b64;font-size:.9rem;margin:0">* Champs obligatoires.</p>
          <p *ngIf="succes()" style="color:var(--vert);margin:0">{{ succes() }}</p>
          <p *ngIf="erreurFormulaire()" style="color:#b3261e;margin:0">{{ erreurFormulaire() }}</p>
          <div>
            <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? 'Publication…' : 'Publier ma demande' }}</button>
          </div>
        </form>

        <h2 style="font-size:1.1rem;margin:0 0 12px">Mes demandes</h2>
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let b of besoins()" style="border:1px solid #e4e9e7;border-radius:12px">
            <a [routerLink]="['/dawini', b.id]"
               style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;color:inherit;text-decoration:none">
              <span>
                <strong>{{ b.medicament }}</strong>
                <span style="color:#566b64"> · {{ libelleStatut(b.statut) }}</span><br>
                <span style="color:#566b64">
                  Wilaya {{ b.wilayaCode }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
                  · publiée le {{ b.publieLe | date:'d MMMM à HH:mm' }}
                </span>
              </span>
              <span style="color:var(--vert);font-weight:600">{{ libelleReponses(b.nombreReponses) }}</span>
            </a>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && besoins().length === 0">Aucune demande pour le moment.</p>
      </ng-container>
    </main>
  `,
})
export class MesDemandesComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(DawiniService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  demande = formulaireVide();
  besoins = signal<Besoin[]>([]);
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  /** Erreur du formulaire de publication (distincte de celle de la liste). */
  erreurFormulaire = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.seo.definirPrivee('Dawini');
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
    this.service.mesBesoins().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.besoins.set([...liste].sort((a, b) => Date.parse(b.publieLe) - Date.parse(a.publieLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux patients.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos demandes.');
        }
      },
    });
  }

  publier() {
    const medicament = this.demande.medicament.trim();
    const wilayaCode = this.demande.wilayaCode.trim();
    const commune = this.demande.commune.trim();
    const precision = this.demande.precision.trim();
    this.succes.set('');
    if (!medicament || !wilayaCode) {
      this.erreurFormulaire.set('Indiquez le médicament recherché et le code de votre wilaya.');
      return;
    }
    const demande: DemandeBesoin = { medicament, wilayaCode };
    if (commune) demande.commune = commune;
    if (precision) demande.precision = precision;
    this.erreurFormulaire.set('');
    this.enCours.set(true);
    this.service.publier(demande).subscribe({
      next: () => {
        this.enCours.set(false);
        this.demande = formulaireVide();
        this.succes.set('Demande publiée : les pharmacies de votre wilaya peuvent y répondre.');
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurFormulaire.set('Seul un compte patient peut publier une demande.');
        } else if (e.status === 400) {
          this.erreurFormulaire.set(e.error?.erreur ?? 'La demande est incomplète.');
        } else {
          this.erreurFormulaire.set(e.error?.erreur ?? 'La publication a échoué, veuillez réessayer.');
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutBesoin(statut);
  }

  libelleReponses(nombre: number): string {
    return libelleReponses(nombre);
  }
}
