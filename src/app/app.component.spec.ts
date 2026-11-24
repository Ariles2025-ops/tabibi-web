import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { ApiDisponibleService } from './partage/api-disponible.service';
import { LangueService } from './partage/langue.service';
import { marquerCompteSupprime } from './moi/compte-supprime';
import { NotificationService } from './notifications/notification.service';

/** Test de fumee de la barre de navigation : liens publics, cloche des connectes, sections du medecin, de la pharmacie, de la secretaire et de l'administrateur. */
describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let connecte: boolean;
  let estMedecin: ReturnType<typeof signal<boolean>>;
  let estAdmin: ReturnType<typeof signal<boolean>>;
  let estPharmacie: ReturnType<typeof signal<boolean>>;
  let estSecretaire: ReturnType<typeof signal<boolean>>;
  let roleService: {
    estMedecin: ReturnType<typeof signal<boolean>>;
    estAdmin: ReturnType<typeof signal<boolean>>;
    estPharmacie: ReturnType<typeof signal<boolean>>;
    estSecretaire: ReturnType<typeof signal<boolean>>;
    charger: jasmine.Spy;
  };

  beforeEach(() => {
    connecte = false;
    estMedecin = signal(false);
    estAdmin = signal(false);
    estPharmacie = signal(false);
    estSecretaire = signal(false);
    roleService = { estMedecin, estAdmin, estPharmacie, estSecretaire, charger: jasmine.createSpy('charger').and.resolveTo(null) };
    const auth = { initialiser: () => Promise.resolve(), estConnecte: () => connecte };
    const notifications = { nombreNonLues: () => of(2), changements$: of() };

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roleService },
        { provide: NotificationService, useValue: notifications },
        { provide: ApiDisponibleService, useValue: { ficheMedecin: signal(true), sonderFiche: () => undefined } },
      ],
    });
    fixture = TestBed.createComponent(AppComponent);
  });

  /** Lance ngOnInit (initialisation OIDC simulee) puis rafraichit la vue. */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texteNav(): string {
    return fixture.nativeElement.querySelector('nav').textContent;
  }

  it('affiche les liens publics sans cloche quand l utilisateur n est pas connecte', async () => {
    await afficher();

    expect(texteNav()).toContain('Accueil');
    expect(texteNav()).not.toContain('Mes téléconsultations');
    expect(texteNav()).not.toContain('Messagerie');
    expect(texteNav()).not.toContain('Mes avis');
    expect(texteNav()).not.toContain('Dawini');
    expect(texteNav()).not.toContain("Mes listes d'attente");
    // « Vérifier une ordonnance » est desormais dans le pied de page (footer riche), plus dans la barre.
    expect(fixture.nativeElement.querySelector('footer').textContent).toContain('Vérifier une ordonnance');
    expect(fixture.nativeElement.querySelector('app-cloche-notifications')).toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Espace pharmacie');
    expect(texteNav()).not.toContain('Espace secrétaire');
    expect(texteNav()).not.toContain('Administration');
    expect(roleService.charger).toHaveBeenCalledTimes(1);
  });

  it('accessibilite : le pied de page utilise des titres h2 (pas de saut h1 -> h4)', async () => {
    await afficher();

    const pied = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(pied.querySelectorAll('h4').length).toBe(0);
    expect(pied.querySelectorAll('h2').length).toBeGreaterThanOrEqual(3);
  });

  it('mene « Centre d aide » a /aide, « Toutes les wilayas » a /wilayas et propose la suppression de compte', async () => {
    await afficher();

    expect(fixture.nativeElement.querySelector('a[href="#aide"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('nav a[href="/aide"]')?.textContent).toContain("Centre d'aide");
    const pied: HTMLElement = fixture.nativeElement.querySelector('footer');
    const toutes = Array.from(pied.querySelectorAll('a')).find((a) => a.textContent?.includes('Toutes les wilayas'));
    expect(toutes?.getAttribute('href')).toBe('/wilayas');
    expect(pied.querySelector('a[href="/supprimer-mon-compte"]')).not.toBeNull();
  });

  it('pied de page en arabe : le lien de suppression de compte s\'intitule « حذف حسابي », comme dans l\'appli et sur « حسابي »', async () => {
    await afficher();
    fixture.componentInstance.ar.set(true);
    fixture.detectChanges();

    const lien = fixture.nativeElement.querySelector('footer a[href="/ar/supprimer-mon-compte"]') as HTMLElement | null;
    expect(lien?.textContent?.trim()).toBe('حذف حسابي');
  });

  it('pied de page : la colonne des liens vers les wilayas s\'intitule « Wilayas » (pas « Villes »), comme son lien', async () => {
    await afficher();

    const titres = Array.from(fixture.nativeElement.querySelectorAll('footer h2') as NodeListOf<HTMLElement>).map((h) => h.textContent?.trim());
    expect(titres).toContain('Wilayas');
    expect(titres).not.toContain('Villes');
  });

  it('pied de page : les liens légaux portent les mêmes libellés que l\'appli (« Politique de confidentialité »)', async () => {
    await afficher();

    const pied: HTMLElement = fixture.nativeElement.querySelector('footer');
    const lien = (href: string) => pied.querySelector(`a[href="${href}"]`)?.textContent?.trim();
    expect(lien('/legal/confidentialite.html')).toBe('Politique de confidentialité');
    expect(lien('/legal/cgu.html')).toBe("Conditions d'utilisation");
    expect(lien('/legal/mentions-legales.html')).toBe('Mentions légales');
  });

  it('affiche la cloche de notifications et « Mes ordonnances » une fois connecte', async () => {
    connecte = true;
    await afficher();

    expect(fixture.nativeElement.querySelector('app-cloche-notifications')).not.toBeNull();
    expect(texteNav()).toContain('Mes ordonnances');
    expect(texteNav()).toContain('Mes téléconsultations');
    expect(fixture.nativeElement.querySelector('a[href="/messagerie"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/mes-avis"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/dawini"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/liste-attente"]')).not.toBeNull();
    // Page des invitations de cabinet (comme « Mon espace » de l'appli) : un patient invité doit pouvoir l'ouvrir.
    expect(fixture.nativeElement.querySelector('a[href="/invitations"]')?.textContent).toContain('Invitations de cabinet');
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Espace pharmacie');
    expect(texteNav()).not.toContain('Administration');
  });

  it('menu patient en arabe quand la langue des ecrans prives est l arabe (comme les ecrans eux-memes)', async () => {
    connecte = true;
    TestBed.inject(LangueService).ar.set(true);
    await afficher();

    const texte = texteNav();
    expect(texte).toContain('مواعيدي');
    expect(texte).toContain('وصفاتي الطبية');
    expect(texte).toContain('الرسائل');
    expect(texte).toContain('آرائي');
    expect(texte).toContain('قوائم الانتظار');
    expect(texte).toContain('دعوات العيادات');
    expect(texte).toContain('داويني');
    expect(texte).not.toContain('Dawini');
    expect(texte).toContain('مركز المساعدة');
    expect(texte).toContain('حسابي');
    expect(texte).toContain('الإشعارات');
    expect(texte).not.toContain('Mes rendez-vous');
    expect(texte).not.toContain('Notifications');
    expect(texte).not.toContain('Mon compte');
  });

  it('affiche la section « Espace médecin » pour le role MEDECIN', async () => {
    connecte = true;
    estMedecin.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace médecin');
    expect(texteNav()).toContain('Agenda');
    expect(texteNav()).toContain('Disponibilités');
    expect(fixture.nativeElement.querySelector('a[href="/medecin/teleconsultations"]')).not.toBeNull();
    // Medecin deja valide : plus de « Ma candidature » dans son menu.
    expect(fixture.nativeElement.querySelector('a[href="/medecin/candidature"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/medecin/avis"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/medecin/liste-attente"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/medecin/secretaires"]')).not.toBeNull();
    expect(texteNav()).not.toContain('Administration');
    expect(texteNav()).not.toContain('Espace secrétaire');
  });

  it('affiche la section « Administration » pour le role ADMIN seulement', async () => {
    connecte = true;
    estAdmin.set(true);
    await afficher();

    expect(texteNav()).toContain('Administration');
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/candidatures"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/avis"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/messagerie"]')).toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
  });

  it('affiche la section « Espace pharmacie » pour le role PHARMACIE seulement', async () => {
    connecte = true;
    estPharmacie.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace pharmacie');
    expect(fixture.nativeElement.querySelector('a[href="/pharmacie"]')).not.toBeNull();
    // L'API réserve la messagerie aux patients et aux médecins.
    expect(fixture.nativeElement.querySelector('a[href="/messagerie"]')).toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Administration');
  });

  it('affiche la section « Espace secrétaire » pour le role SECRETAIRE seulement', async () => {
    connecte = true;
    estSecretaire.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace secrétaire');
    expect(fixture.nativeElement.querySelector('a[href="/secretaire"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/messagerie"]')).toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Administration');
  });

  it('menu médecin en arabe quand la langue des écrans privés est l\'arabe (comme les écrans eux-mêmes)', async () => {
    connecte = true;
    estMedecin.set(true);
    TestBed.inject(LangueService).ar.set(true);
    await afficher();

    const texte = texteNav();
    for (const ar of ['فضاء الطبيب', 'المواعيد', 'الأوقات المتاحة', 'وصفاتي التي حررتها', 'الاستشارات عن بُعد', 'الرسائل', 'آراء المرضى', 'قائمة الانتظار', 'سكرتيراتي']) {
      expect(texte).toContain(ar);
    }
    for (const fr of ['Espace médecin', 'Disponibilités', 'Mes ordonnances rédigées', 'Avis des patients', 'Mes secrétaires', 'Messagerie']) {
      expect(texte).not.toContain(fr);
    }
  });

  it('menu pharmacie en arabe : aucun libellé français restant', async () => {
    connecte = true;
    estPharmacie.set(true);
    TestBed.inject(LangueService).ar.set(true);
    await afficher();

    const texte = texteNav();
    expect(texte).toContain('فضاء الصيدلية');
    expect(texte).toContain('طلبات الأدوية');
    expect(texte).not.toContain('Espace pharmacie');
    expect(texte).not.toContain('Demandes de médicaments');
  });

  it('menu secrétaire en arabe : aucun libellé français restant', async () => {
    connecte = true;
    estSecretaire.set(true);
    TestBed.inject(LangueService).ar.set(true);
    await afficher();

    const texte = texteNav();
    expect(texte).toContain('فضاء السكرتارية');
    expect(texte).toContain('مواعيد العيادة');
    expect(texte).not.toContain('Espace secrétaire');
    expect(texte).not.toContain('Agenda du cabinet');
    expect(texte).not.toContain('Invitations de cabinet');
  });

  it('confirme « Votre compte a été supprimé. » une seule fois après une suppression de compte', async () => {
    marquerCompteSupprime();
    fixture = TestBed.createComponent(AppComponent);
    await afficher();
    expect(fixture.nativeElement.querySelector('.compte-supprime')?.textContent).toContain('Votre compte a été supprimé.');

    fixture = TestBed.createComponent(AppComponent);
    await afficher();
    expect(fixture.nativeElement.querySelector('.compte-supprime')).toBeNull();
  });
});
