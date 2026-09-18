import { Routes } from '@angular/router';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { FicheMedecinComponent } from './fiche-medecin/fiche-medecin.component';
import { MesRendezVousComponent } from './rendezvous/mes-rendez-vous.component';
import { MoiComponent } from './moi/moi.component';

export const routes: Routes = [
  { path: '', component: AnnuaireComponent },
  { path: 'medecins/:id', component: FicheMedecinComponent },
  { path: 'mes-rendez-vous', component: MesRendezVousComponent },
  { path: 'moi', component: MoiComponent },
];
