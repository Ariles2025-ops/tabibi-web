import { connecteGuard } from './auth/connecte.guard';
import { Routes } from '@angular/router';
import { AnnuaireComponent } from './annuaire/annuaire.component';
import { adminGuard } from './auth/admin.guard';
import { medecinGuard } from './auth/medecin.guard';
import { pharmacieGuard } from './auth/pharmacie.guard';
import { secretaireGuard } from './auth/secretaire.guard';
import { VISIO_ACTIVE } from './lancement';

export const routes: Routes = [
  { path: '', component: AnnuaireComponent },
  // Page publique de presentation pour les praticiens (« Vous etes praticien ? »), sans connexion.
  { path: 'praticien', loadComponent: () => import('./praticien/praticien.component').then((m) => m.PraticienComponent) },
  // Fiche medecin reservee aux comptes connectes (annuaire prive : cohérent avec le cadenas de l'accueil).
  { path: 'medecins/:id', canActivate: [connecteGuard], loadComponent: () => import('./fiche-medecin/fiche-medecin.component').then((m) => m.FicheMedecinComponent) },
  { path: 'mes-rendez-vous', loadComponent: () => import('./rendezvous/mes-rendez-vous.component').then((m) => m.MesRendezVousComponent) },
  { path: 'mes-ordonnances', loadComponent: () => import('./ordonnances/mes-ordonnances.component').then((m) => m.MesOrdonnancesComponent) },
  { path: 'ordonnances/:id', loadComponent: () => import('./ordonnances/ordonnance-detail.component').then((m) => m.OrdonnanceDetailComponent) },
  { path: 'verifier', loadComponent: () => import('./ordonnances/verifier-ordonnance.component').then((m) => m.VerifierOrdonnanceComponent) },
  { path: 'notifications', loadComponent: () => import('./notifications/mes-notifications.component').then((m) => m.MesNotificationsComponent) },
  { path: 'teleconsultations', loadComponent: () => (VISIO_ACTIVE ? import('./teleconsultation/mes-teleconsultations.component').then((m) => m.MesTeleconsultationsComponent) : import('./teleconsultation/visio-bientot.component').then((m) => m.VisioBientotComponent)) },
  // Messagerie patient-medecin (utilisateur connecte, patient ou medecin : les pages redirigent vers la connexion).
  { path: 'messagerie', loadComponent: () => import('./messagerie/mes-conversations.component').then((m) => m.MesConversationsComponent) },
  { path: 'messagerie/:id', loadComponent: () => import('./messagerie/conversation.component').then((m) => m.ConversationComponent) },
  // Avis du patient sur un rendez-vous honore, et ses avis (les pages redirigent vers la connexion).
  { path: 'avis/nouveau/:rendezVousId', loadComponent: () => import('./avis/deposer-avis.component').then((m) => m.DeposerAvisComponent) },
  { path: 'mes-avis', loadComponent: () => import('./avis/mes-avis.component').then((m) => m.MesAvisComponent) },
  // Dawini, cote patient : demandes de medicaments et reponses des pharmacies (redirection vers la connexion).
  { path: 'dawini', loadComponent: () => import('./dawini/mes-demandes.component').then((m) => m.MesDemandesComponent) },
  { path: 'dawini/:id', loadComponent: () => import('./dawini/reponses-demande.component').then((m) => m.ReponsesDemandeComponent) },
  // Mes listes d'attente (patient ; la page redirige vers la connexion).
  { path: 'liste-attente', loadComponent: () => import('./liste-attente/mes-listes-attente.component').then((m) => m.MesListesAttenteComponent) },
  {
    // Espace pharmacie (Dawini) : reserve au role PHARMACIE (pharmacieGuard), sinon retour a l'accueil.
    path: 'pharmacie',
    canActivate: [pharmacieGuard],
    loadComponent: () => import('./pharmacie/espace-pharmacie.component').then((m) => m.EspacePharmacieComponent),
  },
  {
    // Espace secretaire (cabinet) : reserve au role SECRETAIRE (secretaireGuard), sinon retour a l'accueil.
    path: 'secretaire',
    canActivate: [secretaireGuard],
    loadComponent: () => import('./secretaire/espace-secretaire.component').then((m) => m.EspaceSecretaireComponent),
  },
  {
    // Candidature ou reclamation de fiche : ouverte a toute personne connectee (le role MEDECIN vient a la validation).
    path: 'medecin/candidature',
    canActivate: [connecteGuard],
    loadComponent: () => import('./medecin/candidature-medecin.component').then((m) => m.CandidatureMedecinComponent),
  },
  {
    // Espace medecin : reserve au role MEDECIN (medecinGuard), sinon retour a l'accueil.
    path: 'medecin',
    canActivate: [medecinGuard],
    children: [
      { path: 'agenda', loadComponent: () => import('./medecin/agenda-medecin.component').then((m) => m.AgendaMedecinComponent) },
      { path: 'disponibilites', loadComponent: () => import('./medecin/disponibilites.component').then((m) => m.DisponibilitesComponent) },
      { path: 'ma-fiche', loadComponent: () => import('./medecin/ma-fiche.component').then((m) => m.MaFicheComponent) },
      { path: 'ordonnances', loadComponent: () => import('./medecin/ordonnances-redigees.component').then((m) => m.OrdonnancesRedigeesComponent) },
      { path: 'ordonnance/nouvelle', loadComponent: () => import('./medecin/nouvelle-ordonnance.component').then((m) => m.NouvelleOrdonnanceComponent) },
      { path: 'teleconsultations', loadComponent: () => (VISIO_ACTIVE ? import('./medecin/teleconsultations-medecin.component').then((m) => m.TeleconsultationsMedecinComponent) : import('./teleconsultation/visio-bientot.component').then((m) => m.VisioBientotComponent)) },
      { path: 'avis', loadComponent: () => import('./medecin/avis-medecin.component').then((m) => m.AvisMedecinComponent) },
      { path: 'liste-attente', loadComponent: () => import('./medecin/liste-attente-medecin.component').then((m) => m.ListeAttenteMedecinComponent) },
      { path: 'secretaires', loadComponent: () => import('./medecin/secretaires.component').then((m) => m.SecretairesComponent) },
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
    ],
  },
  {
    // Administration : reserve au role ADMIN (adminGuard), sinon retour a l'accueil.
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: '', loadComponent: () => import('./admin/tableau-de-bord-admin.component').then((m) => m.TableauDeBordAdminComponent), pathMatch: 'full' },
      { path: 'candidatures', loadComponent: () => import('./admin/candidatures-admin.component').then((m) => m.CandidaturesAdminComponent) },
      { path: 'avis', loadComponent: () => import('./admin/moderation-avis.component').then((m) => m.ModerationAvisComponent) },
    ],
  },
  { path: 'compte-indisponible', loadComponent: () => import('./pages/compte-indisponible.component').then((m) => m.CompteIndisponibleComponent) },
  { path: 'bientot', loadComponent: () => import('./bientot.component').then((m) => m.BientotComponent) },
  { path: 'ar/bientot', loadComponent: () => import('./bientot.component').then((m) => m.BientotComponent), data: { langue: 'ar' } },
  { path: 'invitations', loadComponent: () => import('./secretaire/invitations.component').then((m) => m.InvitationsComponent) },
  // Pages de referencement de l'annuaire (publiques), liees depuis le pied de page.
  { path: 'specialites', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent) },
  { path: 'specialites/:specialite', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent) },
  { path: 'specialites/:specialite/:wilaya', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent) },
  { path: 'specialites/:specialite/:wilaya/:commune', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent) },
  { path: 'wilayas', loadComponent: () => import('./pages/wilayas-index.component').then((m) => m.WilayasIndexComponent) },
  { path: 'wilayas/:wilaya', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent) },
  // Centre d'aide et demarche de suppression de compte (URL declaree dans la Play Console), publics.
  { path: 'aide', loadComponent: () => import('./pages/aide.component').then((m) => m.AideComponent) },
  { path: 'a-propos', loadComponent: () => import('./pages/a-propos.component').then((m) => m.AProposComponent) },
  { path: 'supprimer-mon-compte', loadComponent: () => import('./pages/supprimer-compte.component').then((m) => m.SupprimerCompteComponent) },
  // Page publique de chaque praticien (une par fiche), pour le referencement.
  { path: 'praticiens/:id', loadComponent: () => import('./seo/praticien-public.component').then((m) => m.PraticienPublicComponent) },
  { path: 'praticiens/:id/:slug', loadComponent: () => import('./seo/praticien-public.component').then((m) => m.PraticienPublicComponent) },
  // Versions arabes des pages publiques (memes composants, langue en donnee de route).
  { path: 'ar', component: AnnuaireComponent, pathMatch: 'full', data: { langue: 'ar' } },
  { path: 'ar/specialites', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent), data: { langue: 'ar' } },
  { path: 'ar/specialites/:specialite', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent), data: { langue: 'ar' } },
  { path: 'ar/specialites/:specialite/:wilaya', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent), data: { langue: 'ar' } },
  { path: 'ar/specialites/:specialite/:wilaya/:commune', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent), data: { langue: 'ar' } },
  { path: 'ar/wilayas', loadComponent: () => import('./pages/wilayas-index.component').then((m) => m.WilayasIndexComponent), data: { langue: 'ar' } },
  { path: 'ar/wilayas/:wilaya', loadComponent: () => import('./seo/annuaire-seo.component').then((m) => m.AnnuaireSeoComponent), data: { langue: 'ar' } },
  { path: 'ar/aide', loadComponent: () => import('./pages/aide.component').then((m) => m.AideComponent), data: { langue: 'ar' } },
  { path: 'ar/a-propos', loadComponent: () => import('./pages/a-propos.component').then((m) => m.AProposComponent), data: { langue: 'ar' } },
  { path: 'ar/supprimer-mon-compte', loadComponent: () => import('./pages/supprimer-compte.component').then((m) => m.SupprimerCompteComponent), data: { langue: 'ar' } },
  { path: 'ar/praticiens/:id', loadComponent: () => import('./seo/praticien-public.component').then((m) => m.PraticienPublicComponent), data: { langue: 'ar' } },
  { path: 'ar/praticiens/:id/:slug', loadComponent: () => import('./seo/praticien-public.component').then((m) => m.PraticienPublicComponent), data: { langue: 'ar' } },
  { path: 'moi', loadComponent: () => import('./moi/moi.component').then((m) => m.MoiComponent) },
  // Mon profil (utilisateur connecte, tous roles : la page redirige vers la connexion).
  { path: 'moi/profil', loadComponent: () => import('./moi/profil.component').then((m) => m.ProfilComponent) },
  // Toute adresse inconnue (lien obsolete, faute de frappe) : vraie page 404 (statut HTTP 404 au rendu serveur).
  { path: '**', loadComponent: () => import('./pages/page-introuvable.component').then((m) => m.PageIntrouvableComponent) },
];
