import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Ordonnance } from './ordonnance.service';
import { libelleStatutOrdonnance } from './statut-ordonnance';
import { BadgeStatutOrdonnanceComponent } from './badge-statut-ordonnance.component';
import { instantLisible } from '../partage/dates-lisibles';

/** Liste d'ordonnances (date, praticien si fourni, code, statut) ; chaque ligne mene au detail /ordonnances/:id. */
@Component({
    selector: 'app-liste-ordonnances',
    imports: [CommonModule, RouterLink, BadgeStatutOrdonnanceComponent],
    template: `
    <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px" [attr.dir]="arabe() ? 'rtl' : null">
      <li *ngFor="let o of ordonnances()" style="background:#fff;border:1px solid var(--border);border-radius:var(--r12);box-shadow:var(--s1)">
        <a [routerLink]="['/ordonnances', o.id]"
           style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;color:inherit;text-decoration:none">
          <span>
            <strong style="color:var(--ink)"><i class="fa fa-file-prescription fa-xs" style="color:var(--blue)"></i> <span *ngIf="dateLisible(o.emiseLe)" [attr.dir]="arabe() ? 'ltr' : null">{{ o.emiseLe | date:(arabe() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM yyyy à HH:mm') }}</span><span *ngIf="!dateLisible(o.emiseLe)">{{ arabe() ? 'تاريخ غير معروف' : 'Date inconnue' }}</span></strong><br>
            <span style="color:var(--text3)">
              <ng-container *ngIf="afficherPatient()">{{ arabe() ? 'المريض' : 'Patient' }} : {{ o.patientId }} · </ng-container><ng-container *ngIf="nomsMedecins() as noms"><ng-container *ngIf="noms[o.medecinId] as nom">{{ nom }}</ng-container></ng-container>
            </span>
            <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
              <app-badge-statut-ordonnance [statut]="o.statut" [arabe]="arabe()" />
              <span *ngIf="o.statut === 'ANNULEE'" class="info-statut" style="color:var(--red);font-size:13px">{{ arabe() ? 'ألغاها الطبيب' : 'Annulée par le médecin' }}<ng-container *ngIf="o.motifAnnulation"> : {{ o.motifAnnulation }}</ng-container></span>
              <span *ngIf="o.statut === 'DELIVREE'" class="info-statut" style="color:var(--text2);font-size:13px">{{ arabe() ? 'صُرفت في الصيدلية' : 'Délivrée en pharmacie' }}<ng-container *ngIf="dateLisible(o.delivreeLe)">{{ arabe() ? ' في ' : ' le ' }}<span [attr.dir]="arabe() ? 'ltr' : null">{{ o.delivreeLe | date:(arabe() ? 'dd/MM/yyyy' : 'd MMMM yyyy') }}</span></ng-container></span>
            </span>
          </span>
          <code style="font-size:1rem;letter-spacing:.1em;color:var(--blue-d);background:var(--blue-l);border-radius:999px;padding:4px 12px">{{ o.codeVerification }}</code>
        </a>
      </li>
    </ul>
  `
})
export class ListeOrdonnancesComponent {
  /** Vrai si la date est lisible (sinon « Date inconnue », comme dans l'appli). */
  dateLisible = (iso: string | null | undefined) => instantLisible(iso) !== null;
  ordonnances = input.required<Ordonnance[]>();
  /** Affiche l'identifiant du patient sur chaque ligne (liste du medecin). */
  afficherPatient = input(false);
  /** Vrai : textes en arabe (ecran patient en arabe) ; faux : francais. */
  arabe = input(false);
  /** Nom des praticiens par identifiant (liste du patient) ; null : non affiche. */
  nomsMedecins = input<Partial<Record<string, string>> | null>(null);

  libelleStatut(statut: string): string {
    return libelleStatutOrdonnance(statut);
  }
}
