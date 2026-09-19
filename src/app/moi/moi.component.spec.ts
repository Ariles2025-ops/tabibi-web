import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Moi } from './moi.service';
import { MoiComponent } from './moi.component';

const PROFIL: Moi = { sujet: '55555555-5555-5555-5555-555555555555', nom: 'secretaire.demo', roles: ['SECRETAIRE'] };

/** Mon compte : identifiant du compte (sujet du jeton) avec copie dans le presse-papiers. */
describe('MoiComponent', () => {
  let fixture: ComponentFixture<MoiComponent>;
  let connecte: boolean;
  let moi: ReturnType<typeof signal<Moi | null>>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy; seDeconnecter: jasmine.Spy };
  let presseCoupe: { writeText: jasmine.Spy };
  let presseCoupeInitial: PropertyDescriptor | undefined;

  beforeEach(() => {
    connecte = true;
    moi = signal<Moi | null>(PROFIL);
    auth = {
      pret: () => Promise.resolve(),
      estConnecte: () => connecte,
      seConnecter: jasmine.createSpy('seConnecter'),
      seDeconnecter: jasmine.createSpy('seDeconnecter'),
    };
    // navigator.clipboard n'existe qu'en contexte securise : il est remplace pour le test, puis retabli.
    presseCoupe = { writeText: jasmine.createSpy('writeText').and.resolveTo() };
    presseCoupeInitial = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: presseCoupe, configurable: true });

    TestBed.configureTestingModule({
      imports: [MoiComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: { moi, charger: jasmine.createSpy('charger').and.resolveTo(PROFIL) } },
      ],
    });
    fixture = TestBed.createComponent(MoiComponent);
  });

  afterEach(() => {
    if (presseCoupeInitial) {
      Object.defineProperty(navigator, 'clipboard', presseCoupeInitial);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function boutonCopier(): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim() === 'Copier');
  }

  it('affiche l identifiant du compte, le copie dans le presse-papiers et le confirme', async () => {
    await afficher();

    expect(texte()).toContain('secretaire.demo');
    expect(texte()).toContain('Identifiant du compte : 55555555-5555-5555-5555-555555555555');
    expect(fixture.nativeElement.querySelector('a[href="/moi/profil"]')).not.toBeNull();

    boutonCopier()!.click();
    await afficher();

    expect(presseCoupe.writeText).toHaveBeenCalledWith('55555555-5555-5555-5555-555555555555');
    expect(texte()).toContain('Identifiant copié.');
  });

  it('explique comment faire si le presse-papiers est refuse', async () => {
    presseCoupe.writeText.and.rejectWith(new Error('NotAllowedError'));
    await afficher();

    boutonCopier()!.click();
    await afficher();

    expect(texte()).toContain("Copie impossible : sélectionnez l'identifiant et copiez-le.");
    expect(texte()).not.toContain('Identifiant copié.');
  });

  it('propose la connexion sans afficher d identifiant quand l utilisateur n est pas connecte', async () => {
    connecte = false;
    moi.set(null);
    await afficher();

    expect(texte()).toContain('Se connecter');
    expect(texte()).not.toContain('Identifiant du compte');
    expect(boutonCopier()).toBeUndefined();
  });
});
