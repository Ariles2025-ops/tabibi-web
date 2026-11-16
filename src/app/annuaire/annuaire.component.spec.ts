import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../auth/auth.service';
import { AnnuaireService } from './annuaire.service';
import { AnnuaireComponent } from './annuaire.component';

/** Verrou de l'accueil : « Créer un compte » mene a l'inscription (en pre-lancement : /bientot), pas a la connexion. */
describe('AnnuaireComponent : boutons du verrou', () => {
  it('« Créer un compte » appelle l inscription, « Se connecter » la connexion', () => {
    const auth = jasmine.createSpyObj('AuthService', ['sInscrireParEmail', 'seConnecter']);
    const c = Object.create(AnnuaireComponent.prototype) as { auth: unknown; sInscrire(): void; seConnecter(): void };
    c.auth = auth;

    c.sInscrire();
    expect(auth.sInscrireParEmail).toHaveBeenCalledTimes(1);
    expect(auth.seConnecter).not.toHaveBeenCalled();
    c.seConnecter();
    expect(auth.seConnecter).toHaveBeenCalledTimes(1);
  });
});

/** Accessibilite : l'accueil expose un repere <main> unique (audit Lighthouse « landmark-one-main »). */
describe('AnnuaireComponent : reperes d accessibilite', () => {
  it('affiche un unique <main> contenant le titre h1', () => {
    TestBed.configureTestingModule({
      imports: [AnnuaireComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { estConnecte: () => false, pret: () => Promise.resolve() } },
        { provide: AnnuaireService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(AnnuaireComponent);
    fixture.detectChanges();

    const mains = fixture.nativeElement.querySelectorAll('main') as NodeListOf<HTMLElement>;
    expect(mains.length).toBe(1);
    expect(mains[0].querySelector('h1')).not.toBeNull();
  });
});
