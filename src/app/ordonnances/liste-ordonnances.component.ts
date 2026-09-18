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
      <li *ngFor="let o of ordonnances()" style="border:1px solid #e4e9e7;border-radius:12px">
        <a [routerLink]="['/ordonnances', o.id]"
           style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;color:inherit;text-decoration:none">
          <span>
            <strong>{{ o.emiseLe | date:'EEEE d MMMM yyyy à HH:mm' }}</strong><br>
            <span style="color:#566b64">
              <ng-container *ngIf="afficherPatient()">Patient : {{ o.patientId }} · </ng-container>{{ libelleStatut(o.statut) }}
            </span>
          </span>
          <code style="font-size:1.05rem;letter-spacing:.1em;color:var(--vert)">{{ o.codeVerification }}</code>
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
