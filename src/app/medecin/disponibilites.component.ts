import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestionCreneauxComponent, SourceCreneaux } from './gestion-creneaux.component';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { MedecinService } from './medecin.service';

/**
 * Disponibilites du medecin : ouverture de creneaux (un seul ou une serie, POST /api/medecin/creneaux) et
 * creneaux a venir par jour (GET /api/medecin/creneaux), les libres pouvant etre supprimes
 * (DELETE /api/medecin/creneaux/{id}).
 */
@Component({
    selector: 'app-disponibilites',
    imports: [CommonModule, GestionCreneauxComponent, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--blue);margin:0 0 8px">{{ l.t('Disponibilités', 'الأوقات المتاحة') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Ouvrez des créneaux de consultation : les patients pourront les réserver depuis votre fiche.', 'افتح مواعيد للاستشارة: يستطيع المرضى حجزها من صفحتك.') }}
      </p>
      <app-gestion-creneaux [source]="source" lienAgenda="/medecin/agenda"
                            [message403]="l.t('Seul un compte médecin peut gérer des créneaux.', 'يمكن لحساب الطبيب فقط إدارة المواعيد.')" />
    </main>
  `
})
export class DisponibilitesComponent {
  l = inject(LangueService);
  private service = inject(MedecinService);

  source: SourceCreneaux = {
    lister: () => this.service.creneaux(),
    ouvrir: (debut, duree) => this.service.ouvrirCreneau(debut, duree),
    supprimer: (id) => this.service.supprimerCreneau(id),
    semaineType: (corps) => this.service.semaineType(corps),
  };
}
