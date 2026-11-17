import { connecteGuard } from './auth/connecte.guard';
import { Routes } from '@angular/router';
import { CandidaturesAdminComponent } from './admin/candidatures-admin.component';
import { ModerationAvisComponent } from './admin/moderation-avis.component';
import { TableauDeBordAdminComponent } from './admin/tableau-de-bord-admin.component';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { adminGuard } from './auth/admin.guard';
import { medecinGuard } from './auth/medecin.guard';
import { pharmacieGuard } from './auth/pharmacie.guard';
import { secretaireGuard } from './auth/secretaire.guard';
import { DeposerAvisComponent } from './avis/deposer-avis.component';
import { MesAvisComponent } from './avis/mes-avis.component';
import { MesDemandesComponent } from './dawini/mes-demandes.component';
import { ReponsesDemandeComponent } from './dawini/reponses-demande.component';
import { FicheMedecinComponent } from './fiche-medecin/fiche-medecin.component';
import { PraticienComponent } from './praticien/praticien.component';
import { MesListesAttenteComponent } from './liste-attente/mes-listes-attente.component';
import { AgendaMedecinComponent } from './medecin/agenda-medecin.component';
import { AvisMedecinComponent } from './medecin/avis-medecin.component';
import { CandidatureMedecinComponent } from './medecin/candidature-medecin.component';
import { DisponibilitesComponent } from './medecin/disponibilites.component';
import { MaFicheComponent } from './medecin/ma-fiche.component';
import { ListeAttenteMedecinComponent } from './medecin/liste-attente-medecin.component';
import { NouvelleOrdonnanceComponent } from './medecin/nouvelle-ordonnance.component';
import { OrdonnancesRedigeesComponent } from './medecin/ordonnances-redigees.component';
import { SecretairesComponent } from './medecin/secretaires.component';
import { TeleconsultationsMedecinComponent } from './medecin/teleconsultations-medecin.component';
import { ConversationComponent } from './messagerie/conversation.component';
import { MesConversationsComponent } from './messagerie/mes-conversations.component';
import { MesRendezVousComponent } from './rendezvous/mes-rendez-vous.component';
import { MesNotificationsComponent } from './notifications/mes-notifications.component';
import { MesOrdonnancesComponent } from './ordonnances/mes-ordonnances.component';
import { OrdonnanceDetailComponent } from './ordonnances/ordonnance-detail.component';
import { EspacePharmacieComponent } from './pharmacie/espace-pharmacie.component';
import { EspaceSecretaireComponent } from './secretaire/espace-secretaire.component';
import { VerifierOrdonnanceComponent } from './ordonnances/verifier-ordonnance.component';
import { MesTeleconsultationsComponent } from './teleconsultation/mes-teleconsultations.component';
import { VisioBientotComponent } from './teleconsultation/visio-bientot.component';
import { VISIO_ACTIVE } from './lancement';
import { MoiComponent } from './moi/moi.component';
import { ProfilComponent } from './moi/profil.component';
import { InvitationsComponent } from './secretaire/invitations.component';
import { BientotComponent } from './bientot.component';
import { AnnuaireSeoComponent } from './seo/annuaire-seo.component';
import { PraticienPublicComponent } from './seo/praticien-public.component';
import { WilayasIndexComponent } from './pages/wilayas-index.component';
import { AideComponent } from './pages/aide.component';
import { AProposComponent } from './pages/a-propos.component';
import { SupprimerCompteComponent } from './pages/supprimer-compte.component';
import { PageIntrouvableComponent } from './pages/page-introuvable.component';

export const routes: Routes = [
  { path: '', component: AnnuaireComponent },
  // Page publique de presentation pour les praticiens (« Vous etes praticien ? »), sans connexion.
  { path: 'praticien', component: PraticienComponent },
  // Fiche medecin reservee aux comptes connectes (annuaire prive : cohérent avec le cadenas de l'accueil).
  { path: 'medecins/:id', canActivate: [connecteGuard], component: FicheMedecinComponent },
  { path: 'mes-rendez-vous', component: MesRendezVousComponent },
  { path: 'mes-ordonnances', component: MesOrdonnancesComponent },
  { path: 'ordonnances/:id', component: OrdonnanceDetailComponent },
  { path: 'verifier', component: VerifierOrdonnanceComponent },
  { path: 'notifications', component: MesNotificationsComponent },
  { path: 'teleconsultations', component: VISIO_ACTIVE ? MesTeleconsultationsComponent : VisioBientotComponent },
  // Messagerie patient-medecin (utilisateur connecte, patient ou medecin : les pages redirigent vers la connexion).
  { path: 'messagerie', component: MesConversationsComponent },
  { path: 'messagerie/:id', component: ConversationComponent },
  // Avis du patient sur un rendez-vous honore, et ses avis (les pages redirigent vers la connexion).
  { path: 'avis/nouveau/:rendezVousId', component: DeposerAvisComponent },
  { path: 'mes-avis', component: MesAvisComponent },
  // Dawini, cote patient : demandes de medicaments et reponses des pharmacies (redirection vers la connexion).
  { path: 'dawini', component: MesDemandesComponent },
  { path: 'dawini/:id', component: ReponsesDemandeComponent },
  // Mes listes d'attente (patient ; la page redirige vers la connexion).
  { path: 'liste-attente', component: MesListesAttenteComponent },
  {
    // Espace pharmacie (Dawini) : reserve au role PHARMACIE (pharmacieGuard), sinon retour a l'accueil.
    path: 'pharmacie',
    canActivate: [pharmacieGuard],
    component: EspacePharmacieComponent,
  },
  {
    // Espace secretaire (cabinet) : reserve au role SECRETAIRE (secretaireGuard), sinon retour a l'accueil.
    path: 'secretaire',
    canActivate: [secretaireGuard],
    component: EspaceSecretaireComponent,
  },
  {
    // Candidature ou reclamation de fiche : ouverte a toute personne connectee (le role MEDECIN vient a la validation).
    path: 'medecin/candidature',
    canActivate: [connecteGuard],
    component: CandidatureMedecinComponent,
  },
  {
    // Espace medecin : reserve au role MEDECIN (medecinGuard), sinon retour a l'accueil.
    path: 'medecin',
    canActivate: [medecinGuard],
    children: [
      { path: 'agenda', component: AgendaMedecinComponent },
      { path: 'disponibilites', component: DisponibilitesComponent },
      { path: 'ma-fiche', component: MaFicheComponent },
      { path: 'ordonnances', component: OrdonnancesRedigeesComponent },
      { path: 'ordonnance/nouvelle', component: NouvelleOrdonnanceComponent },
      { path: 'teleconsultations', component: VISIO_ACTIVE ? TeleconsultationsMedecinComponent : VisioBientotComponent },
      { path: 'avis', component: AvisMedecinComponent },
      { path: 'liste-attente', component: ListeAttenteMedecinComponent },
      { path: 'secretaires', component: SecretairesComponent },
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
  { path: 'bientot', component: BientotComponent },
  { path: 'ar/bientot', component: BientotComponent, data: { langue: 'ar' } },
  { path: 'invitations', component: InvitationsComponent },
  // Pages de referencement de l'annuaire (publiques), liees depuis le pied de page.
  { path: 'specialites', component: AnnuaireSeoComponent },
  { path: 'specialites/:specialite', component: AnnuaireSeoComponent },
  { path: 'specialites/:specialite/:wilaya', component: AnnuaireSeoComponent },
  { path: 'specialites/:specialite/:wilaya/:commune', component: AnnuaireSeoComponent },
  { path: 'wilayas', component: WilayasIndexComponent },
  { path: 'wilayas/:wilaya', component: AnnuaireSeoComponent },
  // Centre d'aide et demarche de suppression de compte (URL declaree dans la Play Console), publics.
  { path: 'aide', component: AideComponent },
  { path: 'a-propos', component: AProposComponent },
  { path: 'supprimer-mon-compte', component: SupprimerCompteComponent },
  // Page publique de chaque praticien (une par fiche), pour le referencement.
  { path: 'praticiens/:id', component: PraticienPublicComponent },
  { path: 'praticiens/:id/:slug', component: PraticienPublicComponent },
  // Versions arabes des pages publiques (memes composants, langue en donnee de route).
  { path: 'ar', component: AnnuaireComponent, pathMatch: 'full', data: { langue: 'ar' } },
  { path: 'ar/specialites', component: AnnuaireSeoComponent, data: { langue: 'ar' } },
  { path: 'ar/specialites/:specialite', component: AnnuaireSeoComponent, data: { langue: 'ar' } },
  { path: 'ar/specialites/:specialite/:wilaya', component: AnnuaireSeoComponent, data: { langue: 'ar' } },
  { path: 'ar/specialites/:specialite/:wilaya/:commune', component: AnnuaireSeoComponent, data: { langue: 'ar' } },
  { path: 'ar/wilayas', component: WilayasIndexComponent, data: { langue: 'ar' } },
  { path: 'ar/wilayas/:wilaya', component: AnnuaireSeoComponent, data: { langue: 'ar' } },
  { path: 'ar/aide', component: AideComponent, data: { langue: 'ar' } },
  { path: 'ar/a-propos', component: AProposComponent, data: { langue: 'ar' } },
  { path: 'ar/supprimer-mon-compte', component: SupprimerCompteComponent, data: { langue: 'ar' } },
  { path: 'ar/praticiens/:id', component: PraticienPublicComponent, data: { langue: 'ar' } },
  { path: 'ar/praticiens/:id/:slug', component: PraticienPublicComponent, data: { langue: 'ar' } },
  { path: 'moi', component: MoiComponent },
  // Mon profil (utilisateur connecte, tous roles : la page redirige vers la connexion).
  { path: 'moi/profil', component: ProfilComponent },
  // Toute adresse inconnue (lien obsolete, faute de frappe) : vraie page 404 (statut HTTP 404 au rendu serveur).
  { path: '**', component: PageIntrouvableComponent },
];
