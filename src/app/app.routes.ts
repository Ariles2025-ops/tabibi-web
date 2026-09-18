import { Routes } from '@angular/router';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { MoiComponent } from './moi/moi.component';

export const routes: Routes = [
  { path: '', component: AnnuaireComponent },
  { path: 'moi', component: MoiComponent },
];
