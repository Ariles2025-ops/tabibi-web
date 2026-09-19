import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { TraductionService } from './i18n/traduction.service';
import { ProfilService } from './moi/profil.service';
import { NotificationService } from './notifications/notification.service';

/**
 * Test de fumee de la barre de navigation : liens publics, cloche des connectes, sections du medecin, de la
 * pharmacie, de la secretaire et de l'administrateur, et selecteur de langue (le francais par defaut, l'arabe
 * apres un clic, avec `dir=rtl` sur le document).
 */
describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let connecte: boolean;
  let estMedecin: ReturnType<typeof signal<boolean>>;
  let estAdmin: ReturnType<typeof signal<boolean>>;
  let estPharmacie: ReturnType<typeof signal<boolean>>;
  let estSecretaire: ReturnType<typeof signal<boolean>>;
  let profil: { monProfil: jasmine.Spy };
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
    // Le profil porte la langue de l'utilisateur ; ici il n'a jamais ete renseigne (404 cote API).
    profil = { monProfil: jasmine.createSpy('monProfil').and.returnValue(throwError(() => new Error('404'))) };

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roleService },
        { provide: NotificationService, useValue: notifications },
        { provide: ProfilService, useValue: profil },
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
    expect(texteNav()).toContain('Vérifier une ordonnance');
    expect(texteNav()).toContain('Mon compte');
    expect(fixture.nativeElement.querySelector('app-cloche-notifications')).toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Espace pharmacie');
    expect(texteNav()).not.toContain('Espace secrétaire');
    expect(texteNav()).not.toContain('Administration');
    expect(roleService.charger).toHaveBeenCalledTimes(1);
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
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Espace pharmacie');
    expect(texteNav()).not.toContain('Administration');
  });

  it('affiche la section « Espace médecin » pour le role MEDECIN', async () => {
    connecte = true;
    estMedecin.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace médecin');
    expect(texteNav()).toContain('Agenda');
    expect(texteNav()).toContain('Disponibilités');
    expect(fixture.nativeElement.querySelector('a[href="/medecin/teleconsultations"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/medecin/candidature"]')).not.toBeNull();
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
    expect(texteNav()).not.toContain('Espace médecin');
  });

  it('affiche la section « Espace pharmacie » pour le role PHARMACIE seulement', async () => {
    connecte = true;
    estPharmacie.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace pharmacie');
    expect(fixture.nativeElement.querySelector('a[href="/pharmacie"]')).not.toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Administration');
  });

  it('affiche la section « Espace secrétaire » pour le role SECRETAIRE seulement', async () => {
    connecte = true;
    estSecretaire.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace secrétaire');
    expect(fixture.nativeElement.querySelector('a[href="/secretaire"]')).not.toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(texteNav()).not.toContain('Administration');
  });
  afterEach(() => {
    // Le document est partage entre les specs (Karma) : on remet l'interface en francais.
    TestBed.inject(TraductionService).changer('fr');
  });

  /** Bouton du selecteur de langue portant ce code (`lang` de l'element). */
  function boutonLangue(code: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`.selecteur-langue button[lang="${code}"]`);
  }

  it('propose le selecteur de langue et bascule l interface en arabe (dir rtl)', async () => {
    await afficher();

    expect(texteNav()).toContain('Français');
    expect(texteNav()).toContain('العربية');
    expect(texteNav()).toContain('English');
    expect(texteNav()).toContain('Accueil');

    boutonLangue('ar').click();
    fixture.detectChanges();

    expect(texteNav()).toContain('الرئيسية');
    expect(texteNav()).not.toContain('Accueil');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('la langue du profil initialise l interface apres connexion', async () => {
    connecte = true;
    profil.monProfil.and.returnValue(of({ langue: 'en' }));
    await afficher();
    fixture.detectChanges();

    expect(profil.monProfil).toHaveBeenCalledTimes(1);
    expect(texteNav()).toContain('Home');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('le profil n est pas consulte sans connexion', async () => {
    await afficher();

    expect(profil.monProfil).not.toHaveBeenCalled();
    expect(texteNav()).toContain('Accueil');
  });
});
