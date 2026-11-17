import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Moi, MoiService } from './moi.service';
import { MoiComponent } from './moi.component';

const PROFIL: Moi = { sujet: '55555555-5555-5555-5555-555555555555', nom: 'patient.demo', roles: ['PATIENT'] };

/** Mon compte : roles, acces rapides selon le role, suppression du compte en deux temps. */
describe('MoiComponent', () => {
  let fixture: ComponentFixture<MoiComponent>;
  let connecte: boolean;
  let moi: ReturnType<typeof signal<Moi | null>>;
  let auth: {
    pret: () => Promise<void>; estConnecte: () => boolean;
    seConnecter: jasmine.Spy; sInscrireParEmail: jasmine.Spy; seDeconnecter: jasmine.Spy;
  };
  let service: jasmine.SpyObj<MoiService>;

  beforeEach(() => {
    connecte = true;
    moi = signal<Moi | null>(PROFIL);
    auth = {
      pret: () => Promise.resolve(),
      estConnecte: () => connecte,
      seConnecter: jasmine.createSpy('seConnecter'),
      sInscrireParEmail: jasmine.createSpy('sInscrireParEmail'),
      seDeconnecter: jasmine.createSpy('seDeconnecter'),
    };
    service = jasmine.createSpyObj<MoiService>('MoiService', ['supprimer']);

    TestBed.configureTestingModule({
      imports: [MoiComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: MoiService, useValue: service },
        { provide: RoleService, useValue: { moi, charger: jasmine.createSpy('charger').and.resolveTo(PROFIL) } },
      ],
    });
    fixture = TestBed.createComponent(MoiComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const texte = (): string => fixture.nativeElement.textContent;
  const bouton = (libelle: string): HTMLButtonElement | undefined =>
    (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === libelle);
  const lien = (href: string) => fixture.nativeElement.querySelector(`a[href="${href}"]`);

  it('affiche le role en francais, masque les roles techniques et propose les acces rapides patient', async () => {
    moi.set({ ...PROFIL, roles: ['default-roles-tabibi', 'offline_access', 'uma_authorization', 'PATIENT'] });
    await afficher();

    expect(texte()).toContain('Rôle : Patient');
    expect(texte()).not.toContain('offline_access');
    expect(lien('/moi/profil')).not.toBeNull();
    expect(lien('/mes-rendez-vous')).not.toBeNull();
    expect(lien('/notifications')).not.toBeNull();
    expect(lien('/invitations')).not.toBeNull();
  });

  it('adapte les acces rapides au role : agenda pour le medecin, agenda du cabinet pour la secretaire', async () => {
    moi.set({ ...PROFIL, roles: ['PATIENT', 'MEDECIN'] });
    await afficher();
    expect(lien('/medecin/agenda')).not.toBeNull();
    expect(lien('/mes-rendez-vous')).toBeNull();

    moi.set({ ...PROFIL, roles: ['PATIENT', 'SECRETAIRE'] });
    await afficher();
    expect(lien('/secretaire')).not.toBeNull();
    expect(lien('/invitations')).not.toBeNull();
    expect(lien('/mes-rendez-vous')).toBeNull();
  });

  it('n affiche plus l identifiant technique du compte, meme a une secretaire', async () => {
    moi.set({ ...PROFIL, roles: ['SECRETAIRE'] });
    await afficher();

    expect(texte()).not.toContain('Identifiant du compte');
    expect(texte()).not.toContain(PROFIL.sujet);
  });

  it('supprime le compte apres une confirmation dans la page, puis deconnecte', async () => {
    service.supprimer.and.returnValue(of(undefined));
    await afficher();

    bouton('Supprimer mon compte')!.click();
    await afficher();
    expect(service.supprimer).not.toHaveBeenCalled();
    expect(texte()).toContain('Cette action est définitive');

    bouton('Oui, supprimer définitivement')!.click();
    await afficher();
    expect(service.supprimer).toHaveBeenCalledTimes(1);
    expect(auth.seDeconnecter).toHaveBeenCalled();
  });

  it('annuler la confirmation ne supprime rien ; un echec est explique', async () => {
    service.supprimer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await afficher();

    bouton('Supprimer mon compte')!.click();
    await afficher();
    bouton('Annuler')!.click();
    await afficher();
    expect(service.supprimer).not.toHaveBeenCalled();
    expect(texte()).not.toContain('Cette action est définitive');

    bouton('Supprimer mon compte')!.click();
    await afficher();
    bouton('Oui, supprimer définitivement')!.click();
    await afficher();
    expect(auth.seDeconnecter).not.toHaveBeenCalled();
    expect(texte()).toContain('La suppression a échoué');
  });

  it('non connecte : « Se connecter » et « Créer un compte » (inscription), sans suppression', async () => {
    connecte = false;
    moi.set(null);
    await afficher();

    expect(bouton('Supprimer mon compte')).toBeUndefined();
    bouton('Créer un compte')!.click();
    expect(auth.sInscrireParEmail).toHaveBeenCalled();
    bouton('Se connecter')!.click();
    expect(auth.seConnecter).toHaveBeenCalled();
  });
});
