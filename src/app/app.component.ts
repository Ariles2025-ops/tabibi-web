import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { ClocheNotificationsComponent } from './notifications/cloche-notifications.component';
import { PRELANCEMENT } from './lancement';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClocheNotificationsComponent],
  template: `
    <div class="lancement-bandeau" *ngIf="prelancement" role="status">
      <span class="lancement-bandeau__pastille">Bientôt</span>
      <strong>Lancement prochainement</strong>
      <span class="lancement-bandeau__txt">— la prise de rendez-vous en ligne ouvre très bientôt. Parcourez déjà l'annuaire des médecins.</span>
    </div>
    <div class="shell">
      <aside class="side">
        <a class="side__brand" routerLink="/">tabibi<i>.</i></a>
        <!-- Telephone : bouton « 3 barres » qui ouvre tout le menu -->
        <button type="button" class="side__burger" (click)="menuOuvert.set(!menuOuvert())"
                [attr.aria-expanded]="menuOuvert()" aria-controls="menu-principal" [attr.aria-label]="menuOuvert() ? 'Fermer le menu' : 'Ouvrir le menu'">
          <i class="fa" [class.fa-bars]="!menuOuvert()" [class.fa-xmark]="menuOuvert()" aria-hidden="true"></i>
        </button>
        <nav class="side__nav" id="menu-principal" [class.ouvert]="menuOuvert()">
          <a class="side__home" routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
          <a *ngIf="estPatient()" routerLink="/mes-rendez-vous" routerLinkActive="actif">Mes rendez-vous</a>
          <a *ngIf="estPatient()" routerLink="/mes-ordonnances" routerLinkActive="actif">Mes ordonnances</a>
          <a *ngIf="estPatient()" routerLink="/teleconsultations" routerLinkActive="actif">Mes téléconsultations</a>
          <a *ngIf="estPatient()" routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
          <a *ngIf="estPatient()" routerLink="/mes-avis" routerLinkActive="actif">Mes avis</a>
          <a *ngIf="estPatient()" routerLink="/dawini" routerLinkActive="actif">Dawini</a>
          <a *ngIf="estPatient()" routerLink="/liste-attente" routerLinkActive="actif">Mes listes d'attente</a>

          <div *ngIf="estMedecin()" class="side__group">
            <div class="side__grouptitle">Espace médecin</div>
            <a routerLink="/medecin/agenda" routerLinkActive="actif">Agenda</a>
            <a routerLink="/medecin/disponibilites" routerLinkActive="actif">Disponibilités</a>
            <a routerLink="/medecin/ordonnances" routerLinkActive="actif">Mes ordonnances rédigées</a>
            <a routerLink="/medecin/teleconsultations" routerLinkActive="actif">Téléconsultations</a>
            <a routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
            <a routerLink="/medecin/candidature" routerLinkActive="actif">Ma candidature</a>
            <a routerLink="/medecin/avis" routerLinkActive="actif">Avis des patients</a>
            <a routerLink="/medecin/liste-attente" routerLinkActive="actif">Liste d'attente</a>
            <a routerLink="/medecin/secretaires" routerLinkActive="actif">Mes secrétaires</a>
          </div>

          <div *ngIf="estSecretaire()" class="side__group">
            <div class="side__grouptitle">Espace secrétaire</div>
            <a routerLink="/secretaire" routerLinkActive="actif">Agenda du cabinet</a>
          </div>

          <div *ngIf="estPharmacie()" class="side__group">
            <div class="side__grouptitle">Espace pharmacie</div>
            <a routerLink="/pharmacie" routerLinkActive="actif">Demandes de médicaments</a>
          </div>

          <div *ngIf="estAdmin()" class="side__group">
            <div class="side__grouptitle">Administration</div>
            <a routerLink="/admin" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Tableau de bord</a>
            <a routerLink="/admin/candidatures" routerLinkActive="actif">Candidatures</a>
            <a routerLink="/admin/avis" routerLinkActive="actif">Modération des avis</a>
          </div>

          <div class="side__account">
            <ng-container *ngIf="!connecte()">
              <a class="side__pro" routerLink="/praticien">Vous êtes praticien ?</a>
              <a class="side__help" href="#aide">Centre d'aide</a>
              <a class="side__login" (click)="seConnecter()" tabindex="0" role="button">Se connecter</a>
              <a class="side__signup" (click)="sInscrire()" tabindex="0" role="button" style="cursor:pointer">Créer un compte</a>
            </ng-container>
            <ng-container *ngIf="connecte()">
              <a class="side__help" href="#aide">Centre d'aide</a>
              <app-cloche-notifications />
              <a routerLink="/moi" routerLinkActive="actif">Mon compte</a>
            </ng-container>
          </div>
        </nav>
      </aside>

      <div class="content">
        <router-outlet />
        <footer class="siteft" id="aide">
          <div class="siteft__in">
            <div class="siteft__top">
              <div class="siteft__q">
                <b>Des questions ?</b>
                <span>Consultez notre aide ou contactez-nous.</span>
              </div>
              <a class="siteft__contact" href="mailto:contact@tabibi.doctor">Nous contacter</a>
            </div>

            <div class="siteft__cols">
              <div class="siteft__col">
                <h4>Tabibi</h4>
                <a routerLink="/verifier">Vérifier une ordonnance</a>
                <a href="/legal/mentions-legales.html">Mentions légales</a>
                <a href="/legal/cgu.html">Conditions d'utilisation</a>
                <a href="/legal/confidentialite.html">Confidentialité</a>
                <a href="mailto:contact@tabibi.doctor">Nous contacter</a>
                <a routerLink="/praticien">Vous êtes praticien ?</a>
              </div>
              <div class="siteft__col">
                <h4>Spécialités</h4>
                <a routerLink="/specialites/medecin-generaliste">Médecin généraliste</a>
                <a routerLink="/specialites/cardiologue">Cardiologue</a>
                <a routerLink="/specialites/dentiste">Dentiste</a>
                <a routerLink="/specialites/pediatre">Pédiatre</a>
                <a routerLink="/specialites/gynecologue">Gynécologue</a>
                <a routerLink="/specialites/dermatologue">Dermatologue</a>
                <a routerLink="/specialites" class="siteft__tout">Toutes les spécialités →</a>
              </div>
              <div class="siteft__col">
                <h4>Villes</h4>
                <a routerLink="/wilayas/alger">Alger</a>
                <a routerLink="/wilayas/oran">Oran</a>
                <a routerLink="/wilayas/constantine">Constantine</a>
                <a routerLink="/wilayas/annaba">Annaba</a>
                <a routerLink="/wilayas/blida">Blida</a>
                <a routerLink="/wilayas/setif">Sétif</a>
                <a routerLink="/specialites" class="siteft__tout">Toutes les wilayas →</a>
              </div>
            </div>

            <div class="siteft__bottom">
              <span class="siteft__logo">tabibi<i>.</i></span>
              <span class="siteft__copy">© 2026 Tabibi — Tous droits réservés.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class AppComponent implements OnInit {
  readonly prelancement = PRELANCEMENT;
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private router = inject(Router);

  /** Menu « 3 barres » ouvert (vue telephone) ; referme a chaque changement de page. */
  menuOuvert = signal(false);

  /** Etat de connexion, connu une fois l'initialisation OIDC terminee (liens reserves aux connectes). */
  connecte = signal(false);
  /** Vrai si l'utilisateur connecte a le role MEDECIN (section « Espace médecin »). */
  estMedecin = this.roleService.estMedecin;
  /** Vrai si l'utilisateur connecte a le role ADMIN (section « Administration »). */
  estAdmin = this.roleService.estAdmin;
  /** Vrai si l'utilisateur connecte a le role PHARMACIE (section « Espace pharmacie », Dawini). */
  estPharmacie = this.roleService.estPharmacie;
  /** Vrai si l'utilisateur connecte a le role SECRETAIRE (section « Espace secrétaire », cabinet). */
  estSecretaire = this.roleService.estSecretaire;
  /**
   * Patient « pur » : connecte sans role professionnel ni admin. Les comptes medecin / admin / pharmacie /
   * secretaire ont aussi le role PATIENT par defaut ; on leur masque le menu patient pour n'afficher que leur espace.
   */
  estPatient = computed(() =>
    this.connecte() && !this.estMedecin() && !this.estAdmin() && !this.estPharmacie() && !this.estSecretaire(),
  );

  /** Lance la connexion Keycloak (bouton « Se connecter » de la barre de navigation). */
  seConnecter() { this.menuOuvert.set(false); this.auth.seConnecter(); }

  /** « Créer un compte » ouvre directement le formulaire d'inscription Keycloak. */
  sInscrire() { this.menuOuvert.set(false); this.auth.sInscrireParEmail(); }

  /** Initialisation OIDC unique pour toute l'application (les pages attendent auth.pret()), puis roles. */
  async ngOnInit() {
    this.router.events.subscribe((e) => { if (e instanceof NavigationEnd) this.menuOuvert.set(false); });
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
    this.roleService.charger();
  }
}
