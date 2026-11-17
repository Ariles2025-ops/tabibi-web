import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LigneOrdonnance, OrdonnanceService } from '../ordonnances/ordonnance.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { MedecinService } from './medecin.service';
import { PatientResume, PatientsService } from './patients.service';

/** Ligne en cours de saisie ; `cle` reste stable a l'ajout/suppression de lignes (noms de champs uniques). */
interface LigneSaisie extends LigneOrdonnance {
  cle: number;
}

/**
 * Redaction d'une ordonnance par le medecin : choix du patient parmi les siens (GET /api/medecin/patients) puis,
 * facultativement, d'un de ses rendez-vous ; preremplie depuis l'agenda (?patientId=&rendezVousId=). Seul le
 * medicament est obligatoire sur chaque ligne.
 */
@Component({
    selector: 'app-nouvelle-ordonnance',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <p style="margin:0 0 16px"><a routerLink="/medecin/agenda" style="color:var(--blue)">Retour à l'agenda</a></p>
      <h1 style="color:var(--blue);margin:0 0 16px">Nouvelle ordonnance</h1>

      <form (ngSubmit)="emettre()" #f="ngForm" style="display:grid;gap:16px">
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Patient
            <select class="champ" [ngModel]="patientId()" (ngModelChange)="choisirPatient($event)" name="patientId" required
                    style="color:var(--ink);font-size:1rem">
              <option value="">{{ chargePatients() ? 'Chargement…' : 'Choisir un patient' }}</option>
              <option *ngFor="let p of options()" [value]="p.patientId">{{ libellePatient(p) }}</option>
            </select>
          </label>
          <label *ngIf="patientId()" style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Rendez-vous lié (facultatif)
            <select class="champ" [(ngModel)]="rendezVousId" name="rendezVousId" style="color:var(--ink);font-size:1rem">
              <option value="">Aucun</option>
              <option *ngFor="let r of rendezVousDuPatient()" [value]="r.id">{{ r.debut | date:'EEEE d MMMM yyyy à HH:mm' }}</option>
            </select>
          </label>
        </div>
        <p *ngIf="!chargePatients() && options().length === 0" style="margin:0;color:var(--text3)">
          Aucun patient pour le moment : un patient apparaît ici dès qu'il a un rendez-vous confirmé chez vous.
        </p>

        <h2 style="font-size:1.1rem;margin:8px 0 0">Prescription</h2>
        <div *ngFor="let l of lignes; let i = index; trackBy: parCle"
             style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:var(--r12);padding:12px">
          <label style="flex:2;min-width:160px;display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Médicament
            <input class="champ" [(ngModel)]="l.medicament" [name]="'medicament-' + l.cle" required
                   placeholder="Ex. Paracétamol 1 g" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="flex:2;min-width:160px;display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Posologie (facultatif)
            <input class="champ" [(ngModel)]="l.posologie" [name]="'posologie-' + l.cle"
                   placeholder="Ex. 1 comprimé matin et soir" style="color:var(--ink);font-size:1rem">
          </label>
          <label style="flex:1;min-width:120px;display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            Durée (facultatif)
            <input class="champ" [(ngModel)]="l.duree" [name]="'duree-' + l.cle"
                   placeholder="Ex. 7 jours" style="color:var(--ink);font-size:1rem">
          </label>
          <button type="button" class="bouton-secondaire" (click)="supprimerLigne(i)" [disabled]="lignes.length === 1">
            Supprimer
          </button>
        </div>
        <div>
          <button type="button" class="bouton-secondaire" (click)="ajouterLigne()">Ajouter une ligne</button>
        </div>

        <p *ngIf="erreur()" role="alert" style="color:var(--red);margin:0">{{ erreur() }}</p>
        <div>
          <button type="submit" class="bouton" [disabled]="f.invalid || enCours()">
            {{ enCours() ? 'Émission…' : "Émettre l'ordonnance" }}
          </button>
        </div>
      </form>
    </main>
  `
})
export class NouvelleOrdonnanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private service = inject(OrdonnanceService);
  private medecin = inject(MedecinService);
  private patientsService = inject(PatientsService);
  private prochaineCle = 0;

  patientId = signal('');
  rendezVousId = '';
  patients = signal<PatientResume[]>([]);
  chargePatients = signal(false);
  private rendezVous = signal<RendezVous[]>([]);

  /** Patients proposes, par nom ; un patient prerempli inconnu de la liste reste selectionnable. */
  options = computed<PatientResume[]>(() => {
    const liste = [...this.patients()].sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
    const id = this.patientId();
    if (id && !liste.some((p) => p.patientId === id)) {
      liste.unshift({ patientId: id, nomComplet: 'Patient', telephone: null, email: null });
    }
    return liste;
  });

  /** Rendez-vous confirmes ou honores (seuls acceptes par l'API) du patient choisi chez ce medecin, les plus recents d'abord. */
  rendezVousDuPatient = computed(() =>
    this.rendezVous()
      .filter((r) => r.patientId === this.patientId() && (r.statut === 'CONFIRME' || r.statut === 'HONORE'))
      .sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut)),
  );
  lignes: LigneSaisie[] = [this.nouvelleLigne()];
  enCours = signal(false);
  erreur = signal('');

  /** Prerempli depuis l'agenda : /medecin/ordonnance/nouvelle?patientId=...&rendezVousId=... */
  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.patientId.set(params.get('patientId') ?? '');
    this.rendezVousId = params.get('rendezVousId') ?? '';
    this.chargePatients.set(true);
    this.patientsService.patientsDuMedecin().subscribe({
      next: (repertoire) => {
        this.patients.set([...repertoire.values()]);
        this.chargePatients.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargePatients.set(false);
        if (e.status === 401) this.auth.seConnecter();
        else this.erreur.set(e.error?.erreur ?? 'Impossible de charger la liste de vos patients.');
      },
    });
    this.medecin.agenda().subscribe({ next: (liste) => this.rendezVous.set(liste), error: () => undefined });
  }

  choisirPatient(patientId: string) {
    this.patientId.set(patientId);
    this.rendezVousId = '';
  }

  libellePatient(p: PatientResume): string {
    return p.telephone ? `${p.nomComplet} · ${p.telephone}` : p.nomComplet;
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
    const patientId = this.patientId().trim();
    const rendezVousId = this.rendezVousId.trim();
    const lignes: LigneOrdonnance[] = this.lignes.map((l) => ({
      medicament: (l.medicament ?? '').trim(),
      posologie: (l.posologie ?? '').trim(),
      duree: (l.duree ?? '').trim(),
    }));
    if (!patientId || lignes.some((l) => !l.medicament)) {
      this.erreur.set('Choisissez le patient et indiquez le médicament de chaque ligne.');
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
        } else if (e.status === 403 || e.status === 409) {
          this.erreur.set(
            e.error?.erreur ?? "Le patient doit avoir un rendez-vous confirmé ou honoré avec vous pour recevoir une ordonnance.",
          );
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
