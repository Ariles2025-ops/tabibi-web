import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Rattachement } from '../secretaire/secretaire.service';
import { MedecinService } from './medecin.service';
import { SecretairesComponent } from './secretaires.component';

const SECRETAIRE_ID = '55555555-5555-5555-5555-555555555555';

const RATTACHEMENT: Rattachement = { id: 'ra1', medecinId: 'm1', secretaireId: SECRETAIRE_ID, creeLe: '2026-09-18T10:00:00Z' };
const ANCIEN: Rattachement = { id: 'ra0', medecinId: 'm1', secretaireId: '66666666-6666-6666-6666-666666666666', creeLe: '2026-09-01T10:00:00Z' };

describe('SecretairesComponent', () => {
  let fixture: ComponentFixture<SecretairesComponent>;
  let service: jasmine.SpyObj<MedecinService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<MedecinService>('MedecinService', ['secretaires', 'rattacherSecretaire', 'retirerSecretaire']);
    service.secretaires.and.returnValue(of([RATTACHEMENT, ANCIEN]));

    TestBed.configureTestingModule({
      imports: [SecretairesComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: service },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(SecretairesComponent);
  });

  /** Premier rendu puis stabilisation des ngModel (asynchrones). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function lignes(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  async function saisir(valeur: string) {
    const champ: HTMLInputElement = fixture.nativeElement.querySelector('input[name="secretaireId"]');
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    await afficher();
  }

  function soumettre() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  it('liste les secretaires rattachees, les plus anciens rattachements d abord, avec l explication du champ', async () => {
    await afficher();

    expect(texte()).toContain('Identifiant du compte de votre secrétaire (visible dans Mon compte)');
    const items = lignes();
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('66666666-6666-6666-6666-666666666666');
    expect(items[0].textContent).toContain('Rattachée le 1 septembre 2026');
    expect(items[1].textContent).toContain(SECRETAIRE_ID);
    expect(items[1].querySelector('button')?.textContent).toContain('Retirer');
  });

  it('refuse cote client un identifiant qui n est pas un UUID, sans appeler l API', async () => {
    await afficher();

    await saisir('secretaire.demo');
    soumettre();
    await afficher();

    expect(service.rattacherSecretaire).not.toHaveBeenCalled();
    expect(texte()).toContain("Indiquez l'identifiant du compte de votre secrétaire");
  });

  it('rattache la secretaire (identifiant nettoye), confirme, vide le champ et recharge', async () => {
    service.rattacherSecretaire.and.returnValue(of(RATTACHEMENT));
    await afficher();

    await saisir(`  ${SECRETAIRE_ID.toUpperCase()} `);
    soumettre();
    await afficher();

    expect(service.rattacherSecretaire).toHaveBeenCalledWith(SECRETAIRE_ID);
    expect(texte()).toContain('Secrétaire rattachée');
    expect(fixture.nativeElement.querySelector('input[name="secretaireId"]').value).toBe('');
    expect(service.secretaires).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 409 (deja rattachee) et recharge la liste', async () => {
    service.rattacherSecretaire.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Cette secretaire est deja rattachee a votre cabinet.' } })),
    );
    await afficher();

    await saisir(SECRETAIRE_ID);
    soumettre();
    await afficher();

    expect(texte()).toContain('Cette secretaire est deja rattachee a votre cabinet.');
    expect(service.secretaires).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 400 (soi-meme) sans recharger', async () => {
    service.rattacherSecretaire.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Un medecin ne peut pas se rattacher lui-meme comme secretaire.' } })),
    );
    await afficher();

    await saisir(SECRETAIRE_ID);
    soumettre();
    await afficher();

    expect(texte()).toContain('Un medecin ne peut pas se rattacher lui-meme comme secretaire.');
    expect(service.secretaires).toHaveBeenCalledTimes(1);
  });

  it('retire une secretaire apres confirmation puis recharge ; sans confirmation rien ne se passe', async () => {
    const confirmation = spyOn(window, 'confirm').and.returnValue(false);
    service.retirerSecretaire.and.returnValue(of(void 0));
    await afficher();

    lignes()[0].querySelector('button')!.click();
    await afficher();
    expect(service.retirerSecretaire).not.toHaveBeenCalled();

    confirmation.and.returnValue(true);
    lignes()[0].querySelector('button')!.click();
    await afficher();

    expect(service.retirerSecretaire).toHaveBeenCalledWith('ra0');
    expect(texte()).toContain('Secrétaire retirée');
    expect(service.secretaires).toHaveBeenCalledTimes(2);
  });

  it('affiche un etat vide et le message reserve aux medecins sur un 403', async () => {
    service.secretaires.and.returnValue(of([]));
    await afficher();
    expect(texte()).toContain('Aucune secrétaire rattachée pour le moment.');

    service.secretaires.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    fixture = TestBed.createComponent(SecretairesComponent);
    await afficher();
    expect(texte()).toContain('Cette page est réservée aux médecins.');
  });
});
