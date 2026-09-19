import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { libelleStatutTeleconsultation } from './statut-teleconsultation';
import { Teleconsultation, TeleconsultationService, salleAccessible } from './teleconsultation.service';

/**
 * Teleconsultations du patient connecte (GET /api/teleconsultations/mes). Le lien de la salle video n'est
 * remis qu'apres un consentement explicite (POST /api/teleconsultations/{id}/consentir) : tant qu'il manque,
 * un encart explique le recours a un service tiers (Jitsi Meet) et propose de consentir.
 */
@Component({
  selector: 'app-mes-teleconsultations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 16px">Mes téléconsultations</h1>

      <p *ngIf="connecte() === false">Redirection vers la page de connexion…</p>

      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">Chargement…</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let t of teleconsultations()" style="border:1px solid #e4e9e7;border-radius:12px;padding:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <strong *ngIf="datesRendezVous()[t.rendezVousId] as debut">Rendez-vous du {{ debut | date:'EEEE d MMMM à HH:mm' }}</strong>
                <strong *ngIf="!datesRendezVous()[t.rendezVousId]">Téléconsultation proposée le {{ t.creeLe | date:'EEEE d MMMM à HH:mm' }}</strong>
                <br>
                <a [routerLink]="['/medecins', t.medecinId]" style="color:var(--vert)">{{ noms()[t.medecinId] ?? 'Voir le praticien' }}</a>
                <span style="color:#566b64"> · {{ libelleStatut(t.statut) }}</span>
                <span *ngIf="t.consentementPatientLe" style="color:#566b64"> · consentement donné le {{ t.consentementPatientLe | date:'d MMMM à HH:mm' }}</span>
              </div>
              <a *ngIf="salleAccessible(t)" class="bouton" [href]="t.lienSalle" target="_blank" rel="noopener">
                Rejoindre la téléconsultation
              </a>
            </div>

            <section *ngIf="consentementAttendu(t)"
                     style="margin:12px 0 0;padding:12px;border:1px solid var(--vert);border-radius:8px;background:#f3faf7">
              <p style="margin:0 0 10px">
                En rejoignant cette téléconsultation, vous acceptez qu'elle se déroule en vidéo via un service tiers
                (Jitsi Meet). Aucun enregistrement n'est réalisé par Tabibi.
              </p>
              <button type="button" class="bouton" (click)="consentir(t)" [disabled]="enCours() !== null">
                {{ enCours() === t.id ? 'Enregistrement…' : 'Je donne mon consentement' }}
              </button>
            </section>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && teleconsultations().length === 0">
          Aucune téléconsultation pour le moment. Votre praticien peut vous en proposer une sur un rendez-vous confirmé.
        </p>
      </ng-container>
    </main>
  `,
})
export class MesTeleconsultationsComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(TeleconsultationService);
  private rendezVousService = inject(RendezVousService);
  private annuaire = inject(AnnuaireService);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  teleconsultations = signal<Teleconsultation[]>([]);
  /** Nom complet des praticiens, par identifiant. */
  noms = signal<Partial<Record<string, string>>>({});
  /** Date de debut des rendez-vous du patient, par identifiant de rendez-vous. */
  datesRendezVous = signal<Partial<Record<string, string>>>({});
  charge = signal(false);
  /** Identifiant de la teleconsultation dont le consentement est en cours d'envoi. */
  enCours = signal<string | null>(null);
  erreur = signal('');

  async ngOnInit() {
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.charger();
  }

  /** Recharge la liste ; `motif` est un message d'erreur a conserver a l'ecran (etat depasse apres un 409). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.mes().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.teleconsultations.set([...liste].sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe)));
        this.chargerNoms(liste);
        this.chargerDatesRendezVous(liste);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cette page est réservée aux patients.');
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos téléconsultations.');
        }
      },
    });
  }

  /** Consentement explicite : la vue renvoyee porte le lien de salle et remplace la ligne. */
  consentir(t: Teleconsultation) {
    this.enCours.set(t.id);
    this.erreur.set('');
    this.service.consentir(t.id).subscribe({
      next: (consentie) => {
        this.enCours.set(null);
        this.teleconsultations.update((liste) => liste.map((x) => (x.id === consentie.id ? consentie : x)));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.charger(e.error?.erreur ?? "Cette téléconsultation n'accepte plus de consentement.");
        } else {
          this.erreur.set(e.error?.erreur ?? "L'enregistrement du consentement a échoué, veuillez réessayer.");
        }
      },
    });
  }

  /** L'encart de consentement est propose tant que le patient n'a pas consenti et que la session n'est pas close. */
  consentementAttendu(t: Teleconsultation): boolean {
    return t.consentementPatientLe === null && (t.statut === 'PLANIFIEE' || t.statut === 'EN_COURS');
  }

  salleAccessible(t: Teleconsultation): boolean {
    return salleAccessible(t);
  }

  libelleStatut(statut: string): string {
    return libelleStatutTeleconsultation(statut);
  }

  /** Recupere (une seule fois par praticien) le nom des medecins des teleconsultations. */
  private chargerNoms(liste: Teleconsultation[]) {
    const ids = new Set(liste.map((t) => t.medecinId));
    for (const id of ids) {
      if (this.noms()[id] !== undefined) continue;
      this.annuaire.medecin(id).subscribe({
        next: (m) => this.noms.update((noms) => ({ ...noms, [id]: m.nomComplet })),
        error: () => undefined,
      });
    }
  }

  /** Date du rendez-vous lie, lue dans mes rendez-vous ; a defaut, la date de proposition reste affichee. */
  private chargerDatesRendezVous(liste: Teleconsultation[]) {
    if (liste.length === 0) return;
    this.rendezVousService.mes().subscribe({
      next: (rendezVous) => {
        const dates: Partial<Record<string, string>> = {};
        for (const r of rendezVous) dates[r.id] = r.debut;
        this.datesRendezVous.set(dates);
      },
      error: () => undefined,
    });
  }
}
