import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestionCreneauxComponent, SourceCreneaux } from './gestion-creneaux.component';
import { LangueService } from '../partage/langue.service';
import { MedecinService } from './medecin.service';

/**
 * Disponibilites du medecin : ouverture de creneaux (un seul ou une serie, POST /api/medecin/creneaux) et
 * creneaux a venir par jour (GET /api/medecin/creneaux), les libres pouvant etre supprimes
 * (DELETE /api/medecin/creneaux/{id}).
 */
@Component({
    selector: 'app-disponibilites',
    imports: [CommonModule, GestionCreneauxComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px">
      <h1 style="color:var(--blue);margin:0 0 8px">Disponibilités</h1>
      <p style="color:var(--text3);margin:0 0 20px">
        Ouvrez des créneaux de consultation : les patients pourront les réserver depuis votre fiche.
      </p>
      <app-gestion-creneaux [source]="source" lienAgenda="/medecin/agenda"
                            message403="Seul un compte médecin peut gérer des créneaux." />
    </main>
  `
})
export class DisponibilitesComponent {
  private service = inject(MedecinService);

  constructor() {
    // Page non traduite : pas de page mi-arabe mi-francaise, meme si l'arabe a ete choisi ailleurs.
    inject(LangueService).forcerFrancais();
  }

  source: SourceCreneaux = {
    lister: () => this.service.creneaux(),
    ouvrir: (debut, duree) => this.service.ouvrirCreneau(debut, duree),
    supprimer: (id) => this.service.supprimerCreneau(id),
    semaineType: (corps) => this.service.semaineType(corps),
  };
}
