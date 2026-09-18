import { Routes } from '@angular/router';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { medecinGuard } from './auth/medecin.guard';
import { FicheMedecinComponent } from './fiche-medecin/fiche-medecin.component';
import { AgendaMedecinComponent } from './medecin/agenda-medecin.component';
import { DisponibilitesComponent } from './medecin/disponibilites.component';
import { NouvelleOrdonnanceComponent } from './medecin/nouvelle-ordonnance.component';
import { OrdonnancesRedigeesComponent } from './medecin/ordonnances-redigees.component';
import { MesRendezVousComponent } from './rendezvous/mes-rendez-vous.component';
import { MesNotificationsComponent } from './notifications/mes-notifications.component';
import { MesOrdonnancesComponent } from './ordonnances/mes-ordonnances.component';
import { OrdonnanceDetailComponent } from './ordonnances/ordonnance-detail.component';
import { VerifierOrdonnanceComponent } from './ordonnances/verifier-ordonnance.component';
import { MoiComponent } from './moi/moi.component';

export const routes: Routes = [
  { path: '', component: AnnuaireComponent },
  { path: 'medecins/:id', component: FicheMedecinComponent },
  { path: 'mes-rendez-vous', component: MesRendezVousComponent },
  { path: 'mes-ordonnances', component: MesOrdonnancesComponent },
  { path: 'ordonnances/:id', component: OrdonnanceDetailComponent },
  { path: 'verifier', component: VerifierOrdonnanceComponent },
  { path: 'notifications', component: MesNotificationsComponent },
  {
    // Espace medecin : reserve au role MEDECIN (medecinGuard), sinon retour a l'accueil.
    path: 'medecin',
    canActivate: [medecinGuard],
    children: [
      { path: 'agenda', component: AgendaMedecinComponent },
      { path: 'disponibilites', component: DisponibilitesComponent },
      { path: 'ordonnances', component: OrdonnancesRedigeesComponent },
      { path: 'ordonnance/nouvelle', component: NouvelleOrdonnanceComponent },
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    ],
  },
  { path: 'moi', component: MoiComponent },
];
