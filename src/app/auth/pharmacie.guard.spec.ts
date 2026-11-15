import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { pharmacieGuard } from './pharmacie.guard';
import { RoleService } from './role.service';

describe('pharmacieGuard', () => {
  let connecte: boolean;
  let pharmacie: boolean;
  let auth: { pret: jasmine.Spy; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let roles: { charger: jasmine.Spy; estPharmacie: () => boolean };

  beforeEach(() => {
    connecte = true;
    pharmacie = true;
    auth = {
      pret: jasmine.createSpy('pret').and.resolveTo(),
      estConnecte: () => connecte,
      seConnecter: jasmine.createSpy('seConnecter'),
    };
    roles = { charger: jasmine.createSpy('charger').and.resolveTo(null), estPharmacie: () => pharmacie };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roles },
      ],
    });
  });

  /** Execute la garde dans le contexte d'injection, pour l'URL demandee. */
  function activer(url = '/pharmacie') {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => pharmacieGuard(route, state)) as Promise<boolean | UrlTree>;
  }

  it('laisse passer une pharmacie connectee, une fois les roles charges', async () => {
    expect(await activer()).toBeTrue();
    expect(auth.pret).toHaveBeenCalled();
    expect(roles.charger).toHaveBeenCalled();
    expect(auth.seConnecter).not.toHaveBeenCalled();
  });

  it('envoie un utilisateur non connecte vers la connexion, avec retour sur la page demandee', async () => {
    connecte = false;

    expect(await activer('/pharmacie')).toBeFalse();
    expect(auth.seConnecter).toHaveBeenCalledWith('/pharmacie');
    expect(roles.charger).not.toHaveBeenCalled();
  });

  it("redirige vers l'accueil un utilisateur connecte sans le role PHARMACIE", async () => {
    pharmacie = false;

    const resultat = await activer();
    expect(resultat instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(resultat as UrlTree)).toBe('/');
    expect(auth.seConnecter).not.toHaveBeenCalled();
  });
});
