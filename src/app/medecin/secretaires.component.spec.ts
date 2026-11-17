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
const EMAIL = 'nadia@exemple.dz';

const RATTACHEMENT: Rattachement = {
  id: 'ra1',
  medecinId: 'm1',
  secretaireId: SECRETAIRE_ID,
  creeLe: '2026-09-18T10:00:00Z',
  secretaireNom: 'Nadia Saidi',
  secretaireEmail: EMAIL,
};
/** Rattachement ancien, sans nom ni e-mail connus : un identifiant abrege est affiche. */
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
    const champ: HTMLInputElement = fixture.nativeElement.querySelector('input[name="email"]');
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    await afficher();
  }

  function soumettre() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  function bouton(ligne: HTMLElement, libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(ligne.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim() === libelle);
  }

  it('liste les secretaires rattachees, les plus anciens rattachements d abord, avec l explication du champ', async () => {
    await afficher();

    expect(texte()).toContain('Adresse e-mail du compte Ndawik de votre secrétaire');
    expect(texte()).toContain("Elle reçoit une invitation à accepter depuis ses notifications.");
    expect(fixture.nativeElement.querySelector('input[name="email"]').getAttribute('type')).toBe('email');
    const items = lignes();
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Secrétaire 66666666');
    expect(items[0].textContent).not.toContain('66666666-6666');
    expect(items[0].textContent).toContain('Rattachée le 1 septembre 2026');
    expect(items[1].textContent).toContain('Nadia Saidi');
    expect(items[1].textContent).toContain(EMAIL);
    expect(items[1].textContent).not.toContain(SECRETAIRE_ID);
    expect(items[1].querySelector('button')?.textContent).toContain('Retirer');
  });

  it('refuse cote client une adresse e-mail invalide, sans appeler l API', async () => {
    await afficher();

    await saisir('secretaire.demo');
    soumettre();
    await afficher();

    expect(service.rattacherSecretaire).not.toHaveBeenCalled();
    expect(texte()).toContain("Indiquez l'adresse e-mail du compte Ndawik de votre secrétaire.");
  });

  it('rattache la secretaire par e-mail (nettoye), confirme, vide le champ et recharge', async () => {
    service.rattacherSecretaire.and.returnValue(of(RATTACHEMENT));
    await afficher();

    await saisir(`  ${EMAIL.toUpperCase()} `);
    soumettre();
    await afficher();

    expect(service.rattacherSecretaire).toHaveBeenCalledWith(EMAIL);
    expect(texte()).toContain('Invitation envoyée');
    expect(fixture.nativeElement.querySelector('input[name="email"]').value).toBe('');
    expect(service.secretaires).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 409 (deja rattachee) et recharge la liste', async () => {
    service.rattacherSecretaire.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Cette secretaire est deja rattachee a votre cabinet.' } })),
    );
    await afficher();

    await saisir(EMAIL);
    soumettre();
    await afficher();

    expect(texte()).toContain('Cette secretaire est deja rattachee a votre cabinet.');
    expect(service.secretaires).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 400 (aucun compte avec cet e-mail) sans recharger', async () => {
    service.rattacherSecretaire.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: "Aucun compte Ndawik n'utilise cette adresse e-mail : nadia@exemple.dz" } })),
    );
    await afficher();

    await saisir(EMAIL);
    soumettre();
    await afficher();

    expect(texte()).toContain("Aucun compte Ndawik n'utilise cette adresse e-mail : nadia@exemple.dz");
    expect(service.secretaires).toHaveBeenCalledTimes(1);
  });

  it('retire une secretaire apres confirmation dans la page puis recharge ; « Non » ne fait rien', async () => {
    service.retirerSecretaire.and.returnValue(of(void 0));
    await afficher();

    bouton(lignes()[0], 'Retirer')!.click();
    await afficher();
    expect(lignes()[0].textContent).toContain('Retirer cette secrétaire ?');
    bouton(lignes()[0], 'Non')!.click();
    await afficher();
    expect(service.retirerSecretaire).not.toHaveBeenCalled();

    bouton(lignes()[0], 'Retirer')!.click();
    await afficher();
    bouton(lignes()[0], 'Oui')!.click();
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
