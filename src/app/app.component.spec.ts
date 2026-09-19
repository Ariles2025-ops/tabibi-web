import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './auth/auth.service';
import { RoleService } from './auth/role.service';
import { NotificationService } from './notifications/notification.service';

/** Test de fumee de la barre de navigation : liens publics, cloche des connectes, section du medecin. */
describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let connecte: boolean;
  let estMedecin: ReturnType<typeof signal<boolean>>;
  let roleService: { estMedecin: ReturnType<typeof signal<boolean>>; charger: jasmine.Spy };

  beforeEach(() => {
    connecte = false;
    estMedecin = signal(false);
    roleService = { estMedecin, charger: jasmine.createSpy('charger').and.resolveTo(null) };
    const auth = { initialiser: () => Promise.resolve(), estConnecte: () => connecte };
    const notifications = { nombreNonLues: () => of(2), changements$: of() };

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roleService },
        { provide: NotificationService, useValue: notifications },
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
    expect(texteNav()).toContain('Vérifier une ordonnance');
    expect(texteNav()).toContain('Mon compte');
    expect(fixture.nativeElement.querySelector('app-cloche-notifications')).toBeNull();
    expect(texteNav()).not.toContain('Espace médecin');
    expect(roleService.charger).toHaveBeenCalledTimes(1);
  });

  it('affiche la cloche de notifications et « Mes ordonnances » une fois connecte', async () => {
    connecte = true;
    await afficher();

    expect(fixture.nativeElement.querySelector('app-cloche-notifications')).not.toBeNull();
    expect(texteNav()).toContain('Mes ordonnances');
    expect(texteNav()).toContain('Mes téléconsultations');
    expect(texteNav()).not.toContain('Espace médecin');
  });

  it('affiche la section « Espace médecin » pour le role MEDECIN', async () => {
    connecte = true;
    estMedecin.set(true);
    await afficher();

    expect(texteNav()).toContain('Espace médecin');
    expect(texteNav()).toContain('Agenda');
    expect(texteNav()).toContain('Disponibilités');
    expect(fixture.nativeElement.querySelector('a[href="/medecin/teleconsultations"]')).not.toBeNull();
  });
});
