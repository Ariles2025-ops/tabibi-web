import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { ClocheNotificationsComponent } from './notifications/cloche-notifications.component';
import { ApiDisponibleService } from './partage/api-disponible.service';
import { PRELANCEMENT, VISIO_ACTIVE } from './lancement';
import { estPageFrancaiseSeule, remettreDocumentFrancais } from './seo/page-seo';
import { SPECIALITES_SEO, WILAYAS_SEO } from './seo/referentiel-seo';

@Component({
    selector: 'app-root',
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClocheNotificationsComponent],
    template: `
    <div class="lancement-bandeau" *ngIf="prelancement" role="status" [attr.dir]="ar() ? 'rtl' : null">
      <span class="lancement-bandeau__pastille">{{ ar() ? 'قريبًا' : 'Bientôt' }}</span>
      <strong>{{ ar() ? 'الإطلاق قريبًا' : 'Lancement prochainement' }}</strong>
      <span class="lancement-bandeau__txt">{{ ar() ? '— حجز المواعيد عبر الإنترنت متاح قريبًا جدًا. منصة طبية: ابحث عن طبيب من الآن.' : "— la prise de rendez-vous en ligne ouvre très bientôt. Trouvez déjà un médecin sur la plateforme." }}</span>
    </div>
    <div class="shell">
      <aside class="side">
        <a class="side__brand" [routerLink]="ar() ? '/ar' : '/'">ndawik<i>.</i></a>
        <!-- Telephone : bouton « 3 barres » qui ouvre tout le menu -->
        <button type="button" class="side__burger" (click)="menuOuvert.set(!menuOuvert())"
                [attr.aria-expanded]="menuOuvert()" aria-controls="menu-principal" [attr.aria-label]="menuOuvert() ? 'Fermer le menu' : 'Ouvrir le menu'">
          <i class="fa" [class.fa-bars]="!menuOuvert()" [class.fa-xmark]="menuOuvert()" aria-hidden="true"></i>
        </button>
        <nav class="side__nav" id="menu-principal" [class.ouvert]="menuOuvert()">
          <a class="side__home" [routerLink]="ar() ? '/ar' : '/'" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">{{ ar() ? 'الرئيسية' : 'Accueil' }}</a>
          <a *ngIf="estPatient()" routerLink="/mes-rendez-vous" routerLinkActive="actif">Mes rendez-vous</a>
          <a *ngIf="estPatient()" routerLink="/mes-ordonnances" routerLinkActive="actif">Mes ordonnances</a>
          <a *ngIf="estPatient()" routerLink="/teleconsultations" routerLinkActive="actif">Mes téléconsultations<span *ngIf="!visio" class="pastille-bientot">Bientôt</span></a>
          <a *ngIf="estPatient()" routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
          <a *ngIf="estPatient()" routerLink="/mes-avis" routerLinkActive="actif">Mes avis</a>
          <a *ngIf="estPatient()" routerLink="/dawini" routerLinkActive="actif">Dawini</a>
          <a *ngIf="estPatient()" routerLink="/liste-attente" routerLinkActive="actif">Mes listes d'attente</a>
          <a *ngIf="estPatient()" routerLink="/invitations" routerLinkActive="actif">Invitations de cabinet</a>

          <div *ngIf="estMedecin()" class="side__group">
            <div class="side__grouptitle">Espace médecin</div>
            <a routerLink="/medecin/agenda" routerLinkActive="actif">Agenda</a>
            <a routerLink="/medecin/disponibilites" routerLinkActive="actif">Disponibilités</a>
            <a *ngIf="apiDisponible.ficheMedecin()" routerLink="/medecin/ma-fiche" routerLinkActive="actif">Ma fiche</a>
            <a routerLink="/medecin/ordonnances" routerLinkActive="actif">Mes ordonnances rédigées</a>
            <a routerLink="/medecin/teleconsultations" routerLinkActive="actif">Téléconsultations<span *ngIf="!visio" class="pastille-bientot">Bientôt</span></a>
            <a routerLink="/messagerie" routerLinkActive="actif">Messagerie</a>
            <a routerLink="/medecin/avis" routerLinkActive="actif">Avis des patients</a>
            <a routerLink="/medecin/liste-attente" routerLinkActive="actif">Liste d'attente</a>
            <a routerLink="/medecin/secretaires" routerLinkActive="actif">Mes secrétaires</a>
          </div>

          <div *ngIf="estSecretaire()" class="side__group">
            <div class="side__grouptitle">Espace secrétaire</div>
            <a routerLink="/secretaire" routerLinkActive="actif">Agenda du cabinet</a>
            <a routerLink="/invitations" routerLinkActive="actif">Invitations de cabinet</a>
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
              <a class="side__pro" routerLink="/praticien">{{ ar() ? 'هل أنت طبيب؟' : 'Vous êtes praticien ?' }}</a>
              <a class="side__help" [routerLink]="pre() + '/aide'">{{ ar() ? 'المساعدة' : "Centre d'aide" }}</a>
              <a class="side__help" [routerLink]="ar() ? '/' : '/ar'" [attr.lang]="ar() ? 'fr' : 'ar'">{{ ar() ? 'Français' : 'العربية' }}</a>
              <a class="side__login" (click)="seConnecter()" tabindex="0" role="button">{{ ar() ? 'تسجيل الدخول' : 'Se connecter' }}</a>
              <a class="side__signup" (click)="sInscrire()" tabindex="0" role="button" style="cursor:pointer">{{ ar() ? 'إنشاء حساب' : 'Créer un compte' }}</a>
            </ng-container>
            <ng-container *ngIf="connecte()">
              <a class="side__help" routerLink="/aide">Centre d'aide</a>
              <app-cloche-notifications />
              <a routerLink="/moi" routerLinkActive="actif">Mon compte</a>
            </ng-container>
          </div>
        </nav>
      </aside>

      <div class="content">
        <router-outlet />
        <footer class="siteft" id="aide" [attr.dir]="ar() ? 'rtl' : null" [attr.lang]="ar() ? 'ar' : null">
          <div class="siteft__in">
            <div class="siteft__top">
              <div class="siteft__q">
                <b>{{ ar() ? 'لديك سؤال؟' : 'Des questions ?' }}</b>
                <span>{{ ar() ? 'اطّلع على المساعدة أو تواصل معنا.' : 'Consultez notre aide ou contactez-nous.' }}</span>
              </div>
              <a class="siteft__contact" href="mailto:contact@tabibi.doctor">{{ ar() ? 'اتصل بنا' : 'Nous contacter' }}</a>
            </div>

            <div class="siteft__cols">
              <div class="siteft__col">
                <h2>{{ ar() ? 'نداويك' : 'Ndawik' }}</h2>
                <a [routerLink]="pre() + '/aide'">{{ ar() ? 'مركز المساعدة' : "Centre d'aide" }}</a>
                <a routerLink="/verifier">{{ ar() ? 'التحقق من وصفة طبية' : 'Vérifier une ordonnance' }}</a>
                <a href="/legal/mentions-legales.html">{{ ar() ? 'الإشعارات القانونية' : 'Mentions légales' }}</a>
                <a href="/legal/cgu.html">{{ ar() ? 'شروط الاستخدام' : "Conditions d'utilisation" }}</a>
                <a href="/legal/confidentialite.html">{{ ar() ? 'الخصوصية' : 'Confidentialité' }}</a>
                <a [routerLink]="pre() + '/supprimer-mon-compte'">{{ ar() ? 'حذف الحساب' : 'Supprimer mon compte' }}</a>
                <a href="mailto:contact@tabibi.doctor">{{ ar() ? 'اتصل بنا' : 'Nous contacter' }}</a>
                <a routerLink="/praticien">{{ ar() ? 'هل أنت طبيب؟' : 'Vous êtes praticien ?' }}</a>
              </div>
              <div class="siteft__col">
                <h2>{{ ar() ? 'التخصصات' : 'Spécialités' }}</h2>
                <a *ngFor="let sp of specialitesPied" [routerLink]="[pre() + '/specialites', sp.slug]">{{ ar() ? sp.nomAr : sp.nom }}</a>
                <a [routerLink]="pre() + '/specialites'" class="siteft__tout">{{ ar() ? 'جميع التخصصات ←' : 'Toutes les spécialités →' }}</a>
              </div>
              <div class="siteft__col">
                <h2>{{ ar() ? 'الولايات' : 'Villes' }}</h2>
                <a *ngFor="let w of wilayasPied" [routerLink]="[pre() + '/wilayas', w.slug]">{{ ar() ? w.nomAr : w.nom }}</a>
                <a [routerLink]="pre() + '/wilayas'" class="siteft__tout">{{ ar() ? 'جميع الولايات ←' : 'Toutes les wilayas →' }}</a>
              </div>
            </div>

            <div class="siteft__bottom">
              <span class="siteft__logo">ndawik<i>.</i></span>
              <span class="siteft__copy">{{ ar() ? '© 2026 نداويك — جميع الحقوق محفوظة.' : '© 2026 Ndawik — Tous droits réservés.' }}</span>
              <small class="siteft__ancien">{{ ar() ? 'نداويك (Tabibi سابقًا)' : 'Ndawik (anciennement Tabibi)' }}</small>
            </div>
          </div>
        </footer>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  readonly prelancement = PRELANCEMENT;
  readonly visio = VISIO_ACTIVE;
  /** Pages publiques en arabe (/ar...) : menu visiteur, bandeau et pied de page en arabe. */
  ar = signal(false);
  pre = computed(() => (this.ar() ? '/ar' : ''));
  readonly specialitesPied = ['medecin-generaliste', 'cardiologue', 'dentiste', 'pediatre', 'gynecologue', 'dermatologue']
    .map((x) => SPECIALITES_SEO.find((s) => s.slug === x)!);
  readonly wilayasPied = ['16', '31', '25', '23', '9', '19'].map((c) => WILAYAS_SEO.find((w) => w.code === c)!);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  apiDisponible = inject(ApiDisponibleService);

  constructor() {
    // « Ma fiche » n'apparait que si la route de l'API existe deja en production.
    effect(() => {
      if (this.estMedecin()) this.apiDisponible.sonderFiche();
    });
  }

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
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.menuOuvert.set(false);
        // Pages sans version arabe : on ne garde pas lang="ar" laisse par une page /ar visitee juste avant.
        if (estPageFrancaiseSeule(e.urlAfterRedirects)) remettreDocumentFrancais(this.document);
        this.ar.set(e.urlAfterRedirects === '/ar' || e.urlAfterRedirects.startsWith('/ar/') || e.urlAfterRedirects.startsWith('/ar?'));
      }
    });
    await this.auth.initialiser();
    this.connecte.set(this.auth.estConnecte());
    this.roleService.charger();
  }
}
