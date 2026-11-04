import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { connecteGuard } from './connecte.guard';

describe('connecteGuard', () => {
  let connecte: boolean;
  let auth: { pret: jasmine.Spy; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    connecte = true;
    auth = {
      pret: jasmine.createSpy('pret').and.resolveTo(),
      estConnecte: () => connecte,
      seConnecter: jasmine.createSpy('seConnecter'),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  /** Execute la garde dans le contexte d'injection, pour l'URL demandee. */
  function activer(url = '/medecin/candidature?fiche=f1') {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => connecteGuard(route, state)) as Promise<boolean>;
  }

  it('laisse passer toute personne connectee, patient compris', async () => {
    expect(await activer()).toBeTrue();
    expect(auth.pret).toHaveBeenCalled();
    expect(auth.seConnecter).not.toHaveBeenCalled();
  });

  it('envoie un visiteur vers la connexion, avec retour sur la page demandee', async () => {
    connecte = false;

    expect(await activer()).toBeFalse();
    expect(auth.seConnecter).toHaveBeenCalledWith('/medecin/candidature?fiche=f1');
  });
});
