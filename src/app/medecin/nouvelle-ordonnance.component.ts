import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LigneOrdonnance, OrdonnanceService } from '../ordonnances/ordonnance.service';
import { SeoService } from '../seo/seo.service';

/** Ligne en cours de saisie ; `cle` reste stable a l'ajout/suppression de lignes (noms de champs uniques). */
interface LigneSaisie extends LigneOrdonnance {
  cle: number;
}

/** Redaction d'une ordonnance par le medecin, preremplie depuis l'agenda (?patientId=&rendezVousId=). */
@Component({
  selector: 'app-nouvelle-ordonnance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/medecin/agenda" style="color:var(--vert)">Retour à l'agenda</a></p>
      <h1 style="color:var(--vert);margin:0 0 16px">Nouvelle ordonnance</h1>

      <form (ngSubmit)="emettre()" #f="ngForm" style="display:grid;gap:16px">
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Identifiant du patient
            <input class="champ" [(ngModel)]="patientId" name="patientId" required style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Rendez-vous lié (facultatif)
            <input class="champ" [(ngModel)]="rendezVousId" name="rendezVousId" style="color:#10241F;font-size:1rem">
          </label>
        </div>

        <h2 style="font-size:1.1rem;margin:8px 0 0">Prescription</h2>
        <div *ngFor="let l of lignes; let i = index; trackBy: parCle"
             style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;border:1px solid #e4e9e7;border-radius:12px;padding:12px">
          <label style="flex:2;min-width:160px;display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Médicament
            <input class="champ" [(ngModel)]="l.medicament" [name]="'medicament-' + l.cle" required
                   placeholder="Ex. Paracétamol 1 g" style="color:#10241F;font-size:1rem">
          </label>
          <label style="flex:2;min-width:160px;display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Posologie
            <input class="champ" [(ngModel)]="l.posologie" [name]="'posologie-' + l.cle" required
                   placeholder="Ex. 1 comprimé matin et soir" style="color:#10241F;font-size:1rem">
          </label>
          <label style="flex:1;min-width:120px;display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Durée
            <input class="champ" [(ngModel)]="l.duree" [name]="'duree-' + l.cle" required
                   placeholder="Ex. 7 jours" style="color:#10241F;font-size:1rem">
          </label>
          <button type="button" class="bouton-secondaire" (click)="supprimerLigne(i)" [disabled]="lignes.length === 1">
            Supprimer
          </button>
        </div>
        <div>
          <button type="button" class="bouton-secondaire" (click)="ajouterLigne()">Ajouter une ligne</button>
        </div>

        <p *ngIf="erreur()" style="color:#b3261e;margin:0">{{ erreur() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || enCours()">
            {{ enCours() ? 'Émission…' : "Émettre l'ordonnance" }}
          </button>
        </div>
      </form>
    </main>
  `,
})
export class NouvelleOrdonnanceComponent implements OnInit {
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private prochaineCle = 0;

  patientId = '';
  rendezVousId = '';
  lignes: LigneSaisie[] = [this.nouvelleLigne()];
  enCours = signal(false);
  erreur = signal('');

  /** Prerempli depuis l'agenda : /medecin/ordonnance/nouvelle?patientId=...&rendezVousId=... */
  ngOnInit() {
    this.seo.definirPrivee('Nouvelle ordonnance');
    const params = this.route.snapshot.queryParamMap;
    this.patientId = params.get('patientId') ?? '';
    this.rendezVousId = params.get('rendezVousId') ?? '';
  }

  ajouterLigne() {
    this.lignes = [...this.lignes, this.nouvelleLigne()];
  }

  /** Conserve toujours au moins une ligne. */
  supprimerLigne(index: number) {
    if (this.lignes.length === 1) return;
    this.lignes = this.lignes.filter((_, i) => i !== index);
  }

  parCle(_index: number, ligne: LigneSaisie): number {
    return ligne.cle;
  }

  emettre() {
    const patientId = this.patientId.trim();
    const rendezVousId = this.rendezVousId.trim();
    const lignes: LigneOrdonnance[] = this.lignes.map((l) => ({
      medicament: l.medicament.trim(),
      posologie: l.posologie.trim(),
      duree: l.duree.trim(),
    }));
    if (!patientId || lignes.some((l) => !l.medicament || !l.posologie || !l.duree)) {
      this.erreur.set("Renseignez l'identifiant du patient et chaque ligne de la prescription.");
      return;
    }
    this.enCours.set(true);
    this.erreur.set('');
    this.service.emettre({ patientId, lignes, ...(rendezVousId ? { rendezVousId } : {}) }).subscribe({
      next: (o) => this.router.navigate(['/ordonnances', o.id]),
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Seul un compte médecin peut émettre une ordonnance.');
        } else if (e.status === 404) {
          this.erreur.set('Patient ou rendez-vous introuvable.');
        } else {
          this.erreur.set(e.error?.erreur ?? "L'émission de l'ordonnance a échoué, veuillez réessayer.");
        }
      },
    });
  }

  private nouvelleLigne(): LigneSaisie {
    return { cle: this.prochaineCle++, medicament: '', posologie: '', duree: '' };
  }
}
