import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AvisPublic, AvisService, SyntheseAvis, formaterMoyenne } from './avis.service';

/** Nombre de derniers avis affiches sous la moyenne. */
const NOMBRE_DERNIERS_AVIS = 5;

/**
 * Synthese publique des avis d'un medecin (GET /api/medecins/{id}/avis, sans jeton) : « 4,5 / 5 (12 avis) » ou
 * « Aucun avis pour le moment », puis les derniers avis anonymes (note, date, commentaire). Reutilisable :
 * `<app-synthese-avis [medecinId]="..." />`, rechargee si l'identifiant change.
 */
@Component({
  selector: 'app-synthese-avis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h2 style="font-size:1.1rem;margin:0 0 8px">Avis des patients</h2>
      <p *ngIf="synthese()" style="margin:0 0 12px"><strong>{{ libelle() }}</strong></p>
      <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
        <li *ngFor="let a of derniers()" style="border:1px solid #e4e9e7;border-radius:12px;padding:12px 14px">
          <strong>{{ a.note }} / 5</strong>
          <span style="color:#566b64"> · {{ a.deposeLe | date:'d MMMM yyyy' }}</span>
          <p *ngIf="a.commentaire" style="margin:6px 0 0;white-space:pre-wrap">{{ a.commentaire }}</p>
        </li>
      </ul>
    </section>
  `,
})
export class SyntheseAvisComponent implements OnChanges {
  private service = inject(AvisService);

  medecinId = input.required<string>();
  synthese = signal<SyntheseAvis | null>(null);
  erreur = signal('');

  libelle = computed(() => {
    const s = this.synthese();
    return s ? formaterMoyenne(s.moyenne, s.nombre) : '';
  });

  /** Les derniers avis publies, les plus recents d'abord. */
  derniers = computed<AvisPublic[]>(() => {
    const s = this.synthese();
    if (!s) return [];
    return [...s.avis].sort((a, b) => Date.parse(b.deposeLe) - Date.parse(a.deposeLe)).slice(0, NOMBRE_DERNIERS_AVIS);
  });

  ngOnChanges() {
    this.charger();
  }

  private charger() {
    this.synthese.set(null);
    this.erreur.set('');
    this.service.synthese(this.medecinId()).subscribe({
      next: (s) => this.synthese.set(s),
      error: (e: HttpErrorResponse) => this.erreur.set(e.error?.erreur ?? 'Impossible de charger les avis.'),
    });
  }
}
