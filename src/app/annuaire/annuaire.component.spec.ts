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
