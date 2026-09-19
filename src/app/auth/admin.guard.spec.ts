import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

describe('adminGuard', () => {
  let connecte: boolean;
  let admin: boolean;
  let auth: { pret: jasmine.Spy; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let roles: { charger: jasmine.Spy; estAdmin: () => boolean };

  beforeEach(() => {
    connecte = true;
    admin = true;
    auth = {
      pret: jasmine.createSpy('pret').and.resolveTo(),
      estConnecte: () => connecte,
      seConnecter: jasmine.createSpy('seConnecter'),
    };
    roles = { charger: jasmine.createSpy('charger').and.resolveTo(null), estAdmin: () => admin };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roles },
      ],
    });
  });

  /** Execute la garde dans le contexte d'injection, pour l'URL demandee. */
  function activer(url = '/admin/candidatures') {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => adminGuard(route, state)) as Promise<boolean | UrlTree>;
  }

  it('laisse passer un administrateur connecte, une fois les roles charges', async () => {
    expect(await activer()).toBeTrue();
    expect(auth.pret).toHaveBeenCalled();
    expect(roles.charger).toHaveBeenCalled();
    expect(auth.seConnecter).not.toHaveBeenCalled();
  });

  it('envoie un utilisateur non connecte vers la connexion, avec retour sur la page demandee', async () => {
    connecte = false;

    expect(await activer('/admin/candidatures')).toBeFalse();
    expect(auth.seConnecter).toHaveBeenCalledWith('/admin/candidatures');
    expect(roles.charger).not.toHaveBeenCalled();
  });

  it("redirige vers l'accueil un utilisateur connecte sans le role ADMIN", async () => {
    admin = false;

    const resultat = await activer();
    expect(resultat instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(resultat as UrlTree)).toBe('/');
    expect(auth.seConnecter).not.toHaveBeenCalled();
  });
});
