import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { AvisPublic, AvisService, SyntheseAvis, formaterMoyenne } from '../avis/avis.service';

/**
 * Avis publics recus par le medecin connecte (GET /api/medecins/{moi}/avis, ou « moi » est le sujet du jeton lu
 * sur /api/moi) et signalement d'un avis a l'administrateur (POST /api/avis/{id}/signaler) : l'avis signale
 * quitte la vue publique jusqu'a la decision de l'administrateur.
 */
@Component({
  selector: 'app-avis-medecin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--vert);margin:0 0 8px">Avis des patients</h1>
      <p style="color:#566b64;margin:0 0 16px">
        Avis publiés sur votre fiche, anonymes. Un avis signalé est retiré de la vue publique et examiné par un administrateur.
      </p>

      <p *ngIf="charge()">Chargement…</p>
      <p *ngIf="succes()" style="color:var(--vert)">{{ succes() }}</p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>
      <p *ngIf="synthese()" style="margin:0 0 12px"><strong>{{ libelle() }}</strong></p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
        <li *ngFor="let a of avis()"
            style="border:1px solid #e4e9e7;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <strong>{{ a.note }} / 5</strong>
            <span style="color:#566b64"> · {{ a.deposeLe | date:'d MMMM yyyy' }}</span>
            <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
          </div>
          <button type="button" class="bouton-secondaire" (click)="signaler(a)" [disabled]="enCours() !== null">
            {{ enCours() === a.id ? 'Signalement…' : 'Signaler' }}
          </button>
        </li>
      </ul>
    </main>
  `,
})
export class AvisMedecinComponent implements OnInit {
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private service = inject(AvisService);

  /** Identifiant du medecin connecte (sujet du jeton) ; vide tant qu'il est inconnu. */
  private moi = '';
  synthese = signal<SyntheseAvis | null>(null);
  charge = signal(false);
  /** Identifiant de l'avis en cours de signalement. */
  enCours = signal<string | null>(null);
  succes = signal('');
  erreur = signal('');

  libelle = computed(() => {
    const s = this.synthese();
    return s ? formaterMoyenne(s.moyenne, s.nombre) : '';
  });

  /** Avis publies, les plus recents d'abord. */
  avis = computed<AvisPublic[]>(() => {
    const s = this.synthese();
    return s ? [...s.avis].sort((a, b) => Date.parse(b.deposeLe) - Date.parse(a.deposeLe)) : [];
  });

  async ngOnInit() {
    const profil = await this.roleService.charger();
    this.moi = profil?.sujet ?? '';
    if (!this.moi) {
      this.erreur.set('Impossible de lire votre profil, veuillez réessayer.');
      return;
    }
    this.charger();
  }

  /** Recharge la synthese ; `motif` est un message d'erreur a conserver a l'ecran (etat depasse apres un 409). */
  charger(motif = '') {
    this.charge.set(true);
    this.erreur.set(motif);
    this.service.synthese(this.moi).subscribe({
      next: (s) => {
        this.synthese.set(s);
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreur.set(e.error?.erreur ?? 'Impossible de charger vos avis.');
        }
      },
    });
  }

  signaler(a: AvisPublic) {
    this.enCours.set(a.id);
    this.succes.set('');
    this.erreur.set('');
    this.service.signaler(a.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.succes.set("Avis signalé : il est retiré de votre fiche en attendant la décision de l'administrateur.");
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set('Cet avis ne vous concerne pas.');
        } else if (e.status === 409 || e.status === 404) {
          this.charger(e.error?.erreur ?? 'Cet avis a déjà été signalé.');
        } else {
          this.erreur.set(e.error?.erreur ?? "Le signalement a échoué, veuillez réessayer.");
        }
      },
    });
  }
}
