import { Routes } from '@angular/router';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { FicheMedecinComponent } from './fiche-medecin/fiche-medecin.component';
import { MesRendezVousComponent } from './rendezvous/mes-rendez-vous.component';
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
  { path: 'moi', component: MoiComponent },
];
