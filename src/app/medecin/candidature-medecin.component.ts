import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Candidature, DemandeCandidature, libelleStatutCandidature } from '../admin/admin.service';
import { AuthService } from '../auth/auth.service';
import { MedecinService } from './medecin.service';
import { SeoService } from '../seo/seo.service';

/** Champs du formulaire, vides ou prerempli depuis une candidature refusee. */
function formulaireVide(): DemandeCandidature {
  return { nomComplet: '', specialiteSlug: '', specialiteFr: '', wilayaCode: '', wilayaFr: '', ville: '', numeroOrdre: '', telephone: '' };
}

/**
 * Candidature du medecin a figurer dans l'annuaire : etat de la derniere candidature (GET /api/medecin/candidature),
 * formulaire de depot s'il n'en a jamais depose ou si la derniere a ete refusee (POST /api/medecin/candidature).
 */
@Component({
  selector: 'app-candidature-medecin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Ma candidature</h1>
      <p style="color:#566b64;margin:0 0 20px">
        Pour figurer dans l'annuaire Tabibi, déposez votre candidature : elle est examinée par un administrateur.
      </p>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <section *ngIf="candidature() as c" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;margin:0 0 20px">
        <strong>{{ c.nomComplet }}</strong>
        <span style="color:#566b64"> · {{ libelleStatut(c.statut) }}</span><br>
        <span style="color:#566b64">
          {{ c.specialiteFr || c.specialiteSlug }} · {{ c.ville || 'Ville non précisée' }} ({{ c.wilayaFr || c.wilayaCode }})
          · N° d'ordre {{ c.numeroOrdre }}<ng-container *ngIf="c.telephone"> · {{ c.telephone }}</ng-container>
        </span><br>
        <span style="color:#566b64;font-size:.9rem">
          Déposée le {{ c.deposeeLe | date:'d MMMM yyyy à HH:mm' }}<ng-container *ngIf="c.traiteeLe"> · traitée le {{ c.traiteeLe | date:'d MMMM yyyy à HH:mm' }}</ng-container>
        </span>
        <p *ngIf="c.statut === 'EN_ATTENTE'" style="margin:10px 0 0">Votre candidature est en cours d'examen.</p>
        <p *ngIf="c.statut === 'VALIDEE'" style="margin:10px 0 0;color:var(--vert)">
          Votre candidature a été validée : vous figurez dans l'annuaire.
          <a [routerLink]="['/medecins', c.medecinId]" style="color:var(--vert)">Voir ma fiche</a>
        </p>
        <p *ngIf="c.statut === 'REFUSEE'" style="margin:10px 0 0;color:#b3261e">
          Votre candidature a été refusée<ng-container *ngIf="c.motifRefus"> · Motif : {{ c.motifRefus }}</ng-container>.
          Vous pouvez en déposer une nouvelle ci-dessous.
        </p>
      </section>

      <form *ngIf="formulaireVisible()" (ngSubmit)="deposer()" #f="ngForm" style="display:grid;gap:12px">
        <h2 *ngIf="candidature()" style="font-size:1.1rem;margin:0">Nouvelle candidature</h2>
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Nom complet *
            <input class="champ" [(ngModel)]="demande.nomComplet" name="nomComplet" required placeholder="Ex. Dr Amina Belkacem" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Numéro d'inscription à l'ordre *
            <input class="champ" [(ngModel)]="demande.numeroOrdre" name="numeroOrdre" required style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Spécialité (code) *
            <input class="champ" [(ngModel)]="demande.specialiteSlug" name="specialiteSlug" required
                   placeholder="Ex. generaliste, cardiologue, dermatologue, pediatre" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Spécialité (libellé affiché)
            <input class="champ" [(ngModel)]="demande.specialiteFr" name="specialiteFr" placeholder="Ex. Cardiologue" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Wilaya (code) *
            <input class="champ" [(ngModel)]="demande.wilayaCode" name="wilayaCode" required placeholder="Ex. 16" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Wilaya (libellé affiché)
            <input class="champ" [(ngModel)]="demande.wilayaFr" name="wilayaFr" placeholder="Ex. Alger" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Ville
            <input class="champ" [(ngModel)]="demande.ville" name="ville" style="color:#10241F;font-size:1rem">
          </label>
          <label style="display:grid;gap:4px;color:#566b64;font-size:.9rem">
            Téléphone
            <input class="champ" [(ngModel)]="demande.telephone" name="telephone" type="tel" placeholder="Ex. 0550 00 00 00" style="color:#10241F;font-size:1rem">
          </label>
        </div>
        <p style="color:#566b64;font-size:.9rem;margin:0">* Champs obligatoires.</p>
        <div>
          <button type="submit" class="bouton" [disabled]="enCours()">
            {{ enCours() ? 'Envoi…' : 'Déposer ma candidature' }}
          </button>
        </div>
      </form>
    </main>
  `,
})
export class CandidatureMedecinComponent implements OnInit {
  private seo = inject(SeoService);
  private auth = inject(AuthService);
  private service = inject(MedecinService);

  /** Derniere candidature deposee ; null s'il n'y en a aucune. */
  candidature = signal<Candidature | null>(null);
  /** Vrai une fois l'etat connu : aucune candidature, ou la derniere refusee. */
  formulaireVisible = signal(false);
  demande: DemandeCandidature = formulaireVide();
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  erreur = signal('');

  ngOnInit() {
    this.seo.definirPrivee('Ma candidature');
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.maCandidature().subscribe({
      next: (c) => {
        this.charge.set(false);
        this.afficher(c);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Aucune candidature deposee : on propose le formulaire.
          this.candidature.set(null);
          this.formulaireVisible.set(true);
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux médecins.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger votre candidature.');
        }
      },
    });
  }

  deposer() {
    const demande: DemandeCandidature = {
      nomComplet: this.demande.nomComplet.trim(),
      specialiteSlug: this.demande.specialiteSlug.trim(),
      specialiteFr: this.demande.specialiteFr.trim(),
      wilayaCode: this.demande.wilayaCode.trim(),
      wilayaFr: this.demande.wilayaFr.trim(),
      ville: this.demande.ville.trim(),
      numeroOrdre: this.demande.numeroOrdre.trim(),
      telephone: this.demande.telephone.trim(),
    };
    this.succes.set('');
    if (!demande.nomComplet || !demande.specialiteSlug || !demande.wilayaCode || !demande.numeroOrdre) {
      this.erreur.set("Renseignez le nom complet, la spécialité, la wilaya et le numéro d'inscription à l'ordre.");
      return;
    }
    this.erreur.set('');
    this.enCours.set(true);
    this.service.deposerCandidature(demande).subscribe({
      next: (c) => {
        this.enCours.set(false);
        this.afficher(c);
        this.succes.set('Candidature déposée : elle sera examinée par un administrateur.');
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Seul un compte médecin peut déposer une candidature.');
        } else if (e.status === 409) {
          // Une candidature est deja en attente ou validee : on l'affiche avec le motif renvoye.
          this.erreur.set(e.error?.erreur ?? 'Une candidature est déjà en attente ou validée.');
          this.service.maCandidature().subscribe({ next: (c) => this.afficher(c), error: () => undefined });
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? 'La candidature est incomplète.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Le dépôt de la candidature a échoué, veuillez réessayer.');
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutCandidature(statut);
  }

  /** Affiche la candidature ; le formulaire (prerempli) n'est propose que si elle a ete refusee. */
  private afficher(c: Candidature) {
    this.candidature.set(c);
    const refusee = c.statut === 'REFUSEE';
    this.formulaireVisible.set(refusee);
    if (refusee) {
      this.demande = {
        nomComplet: c.nomComplet,
        specialiteSlug: c.specialiteSlug,
        specialiteFr: c.specialiteFr ?? '',
        wilayaCode: c.wilayaCode,
        wilayaFr: c.wilayaFr ?? '',
        ville: c.ville ?? '',
        numeroOrdre: c.numeroOrdre,
        telephone: c.telephone ?? '',
      };
    }
  }
}
