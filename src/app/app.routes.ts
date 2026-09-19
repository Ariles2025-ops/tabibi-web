import { Routes } from '@angular/router';
import { CandidaturesAdminComponent } from './admin/candidatures-admin.component';
import { ModerationAvisComponent } from './admin/moderation-avis.component';
import { TableauDeBordAdminComponent } from './admin/tableau-de-bord-admin.component';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { adminGuard } from './auth/admin.guard';
import { medecinGuard } from './auth/medecin.guard';
import { pharmacieGuard } from './auth/pharmacie.guard';
import { DeposerAvisComponent } from './avis/deposer-avis.component';
import { MesAvisComponent } from './avis/mes-avis.component';
import { MesDemandesComponent } from './dawini/mes-demandes.component';
import { ReponsesDemandeComponent } from './dawini/reponses-demande.component';
import { FicheMedecinComponent } from './fiche-medecin/fiche-medecin.component';
import { AgendaMedecinComponent } from './medecin/agenda-medecin.component';
import { AvisMedecinComponent } from './medecin/avis-medecin.component';
import { CandidatureMedecinComponent } from './medecin/candidature-medecin.component';
import { DisponibilitesComponent } from './medecin/disponibilites.component';
import { NouvelleOrdonnanceComponent } from './medecin/nouvelle-ordonnance.component';
import { OrdonnancesRedigeesComponent } from './medecin/ordonnances-redigees.component';
import { TeleconsultationsMedecinComponent } from './medecin/teleconsultations-medecin.component';
import { ConversationComponent } from './messagerie/conversation.component';
import { MesConversationsComponent } from './messagerie/mes-conversations.component';
import { MesRendezVousComponent } from './rendezvous/mes-rendez-vous.component';
import { MesNotificationsComponent } from './notifications/mes-notifications.component';
import { MesOrdonnancesComponent } from './ordonnances/mes-ordonnances.component';
import { OrdonnanceDetailComponent } from './ordonnances/ordonnance-detail.component';
import { EspacePharmacieComponent } from './pharmacie/espace-pharmacie.component';
import { VerifierOrdonnanceComponent } from './ordonnances/verifier-ordonnance.component';
import { MesTeleconsultationsComponent } from './teleconsultation/mes-teleconsultations.component';
import { MoiComponent } from './moi/moi.component';
import { ProfilComponent } from './moi/profil.component';

export const routes: Routes = [
  { path: '', component: AnnuaireComponent },
  { path: 'medecins/:id', component: FicheMedecinComponent },
  { path: 'mes-rendez-vous', component: MesRendezVousComponent },
  { path: 'mes-ordonnances', component: MesOrdonnancesComponent },
  { path: 'ordonnances/:id', component: OrdonnanceDetailComponent },
  { path: 'verifier', component: VerifierOrdonnanceComponent },
  { path: 'notifications', component: MesNotificationsComponent },
  { path: 'teleconsultations', component: MesTeleconsultationsComponent },
  // Messagerie patient-medecin (utilisateur connecte, patient ou medecin : les pages redirigent vers la connexion).
  { path: 'messagerie', component: MesConversationsComponent },
  { path: 'messagerie/:id', component: ConversationComponent },
  // Avis du patient sur un rendez-vous honore, et ses avis (les pages redirigent vers la connexion).
  { path: 'avis/nouveau/:rendezVousId', component: DeposerAvisComponent },
  { path: 'mes-avis', component: MesAvisComponent },
  // Dawini, cote patient : demandes de medicaments et reponses des pharmacies (redirection vers la connexion).
  { path: 'dawini', component: MesDemandesComponent },
  { path: 'dawini/:id', component: ReponsesDemandeComponent },
  {
    // Espace pharmacie (Dawini) : reserve au role PHARMACIE (pharmacieGuard), sinon retour a l'accueil.
    path: 'pharmacie',
    canActivate: [pharmacieGuard],
    component: EspacePharmacieComponent,
  },
  {
    // Espace medecin : reserve au role MEDECIN (medecinGuard), sinon retour a l'accueil.
    path: 'medecin',
    canActivate: [medecinGuard],
    children: [
      { path: 'agenda', component: AgendaMedecinComponent },
      { path: 'disponibilites', component: DisponibilitesComponent },
      { path: 'ordonnances', component: OrdonnancesRedigeesComponent },
      { path: 'ordonnance/nouvelle', component: NouvelleOrdonnanceComponent },
      { path: 'teleconsultations', component: TeleconsultationsMedecinComponent },
      { path: 'candidature', component: CandidatureMedecinComponent },
      { path: 'avis', component: AvisMedecinComponent },
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    ],
  },
  {
    // Administration : reserve au role ADMIN (adminGuard), sinon retour a l'accueil.
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: '', component: TableauDeBordAdminComponent, pathMatch: 'full' },
      { path: 'candidatures', component: CandidaturesAdminComponent },
      { path: 'avis', component: ModerationAvisComponent },
    ],
  },
  { path: 'moi', component: MoiComponent },
  // Mon profil (utilisateur connecte, tous roles : la page redirige vers la connexion).
  { path: 'moi/profil', component: ProfilComponent },
];
