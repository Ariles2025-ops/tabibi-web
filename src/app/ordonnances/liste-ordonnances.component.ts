import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Ordonnance } from './ordonnance.service';
import { libelleStatutOrdonnance } from './statut-ordonnance';

/** Liste d'ordonnances (date, code, statut) ; chaque ligne mene au detail /ordonnances/:id. */
@Component({
  selector: 'app-liste-ordonnances',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
      <li *ngFor="let o of ordonnances()" style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);box-shadow:var(--s1)">
        <a [routerLink]="['/ordonnances', o.id]"
           style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;color:inherit;text-decoration:none">
          <span>
            <strong style="color:var(--ink)"><i class="fa fa-file-prescription fa-xs" style="color:var(--blue)"></i> {{ o.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }}</strong><br>
            <span style="color:var(--text3)">
              <ng-container *ngIf="afficherPatient()">Patient : {{ o.patientId }} · </ng-container>{{ libelleStatut(o.statut) }}
            </span>
          </span>
          <code style="font-size:1rem;letter-spacing:.1em;color:var(--blue-d);background:var(--blue-l);border-radius:999px;padding:4px 12px">{{ o.codeVerification }}</code>
        </a>
      </li>
    </ul>
  `,
})
export class ListeOrdonnancesComponent {
  ordonnances = input.required<Ordonnance[]>();
  /** Affiche l'identifiant du patient sur chaque ligne (liste du medecin). */
  afficherPatient = input(false);

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut);
  }
}
