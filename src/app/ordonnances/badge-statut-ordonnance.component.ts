import { Component, computed, input } from '@angular/core';
import { libelleStatutOrdonnance } from './statut-ordonnance';

/** Pastille du statut d'une ordonnance : Émise (vert), Annulée (rouge), Délivrée (gris). */
@Component({
  selector: 'app-badge-statut-ordonnance',
  standalone: true,
  template: `<span class="badge-statut-ordonnance" [attr.data-statut]="statut()"
    [style.background]="couleurs().fond" [style.color]="couleurs().texte"
    style="display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;white-space:nowrap">{{ libelle() }}</span>`,
})
export class BadgeStatutOrdonnanceComponent {
  statut = input<string | null | undefined>(null);
  libelle = computed(() => libelleStatutOrdonnance(this.statut()));
  couleurs = computed(() => {
    switch (this.statut()) {
      case 'EMISE':
        return { fond: 'var(--green-l)', texte: 'var(--green)' };
      case 'ANNULEE':
        return { fond: 'var(--red-l)', texte: 'var(--red)' };
      default:
        return { fond: 'var(--bg2)', texte: 'var(--text2)' };
    }
  });
}
