import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ProfilComponent } from './profil.component';
import { Profil, ProfilService } from './profil.service';

const PROFIL: Profil = {
  utilisateurId: 'u1',
  nomComplet: 'Amina Belkacem',
  telephone: '0550123456',
  dateNaissance: '1990-05-12',
  wilayaCode: '16',
  langue: 'ar',
  misAJourLe: '2026-09-18T10:00:00Z',
};

const NON_RENSEIGNE = () => throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Profil non renseigne.' } }));

describe('ProfilComponent', () => {
  let fixture: ComponentFixture<ProfilComponent>;
  let service: jasmine.SpyObj<ProfilService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<ProfilService>('ProfilService', ['monProfil', 'enregistrer']);
    service.monProfil.and.returnValue(NON_RENSEIGNE());
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [ProfilComponent],
      providers: [
        provideRouter([]),
        { provide: ProfilService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(ProfilComponent);
  });

  /** Lance ngOnInit (attente de l'etat de connexion) puis stabilise les ngModel (asynchrones). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function formulaire(): HTMLFormElement | null {
    return fixture.nativeElement.querySelector('form');
  }

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[name="${nom}"]`);
  }

  function langue(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('select[name="langue"]');
  }

  async function saisir(valeurs: Record<string, string>) {
    for (const [nom, valeur] of Object.entries(valeurs)) {
      const c = champ(nom);
      c.value = valeur;
      c.dispatchEvent(new Event('input'));
    }
    await afficher();
  }

  async function choisirLangue(code: string) {
    const s = langue();
    s.value = code;
    s.dispatchEvent(new Event('change'));
    await afficher();
  }

  function soumettre() {
    formulaire()!.dispatchEvent(new Event('submit'));
  }

  it('propose un formulaire vide (langue Français par défaut) quand le profil n est pas renseigne (404)', async () => {
    await afficher();

    expect(formulaire()).not.toBeNull();
    expect(champ('nomComplet').value).toBe('');
    expect(champ('telephone').value).toBe('');
    expect(champ('dateNaissance').value).toBe('');
    expect(champ('wilayaCode').value).toBe('');
    expect(langue().value).toBe('fr');
    const options = Array.from(langue().options).map((o) => `${o.value}:${o.textContent?.trim()}`);
    expect(options).toEqual(['fr:Français', 'ar:العربية', 'kab:Taqbaylit', 'en:English']);
    expect(texte()).not.toContain('Profil non renseigne.');
    expect(texte()).not.toContain('Dernière mise à jour');
  });

  it('preremplit le formulaire avec le profil enregistre', async () => {
    service.monProfil.and.returnValue(of(PROFIL));
    await afficher();

    expect(champ('nomComplet').value).toBe('Amina Belkacem');
    expect(champ('telephone').value).toBe('0550123456');
    expect(champ('dateNaissance').value).toBe('1990-05-12');
    expect(champ('wilayaCode').value).toBe('16');
    expect(langue().value).toBe('ar');
    expect(texte()).toContain('Dernière mise à jour le 18 septembre 2026');
  });

  it('refuse cote client un profil invalide (nom trop court, telephone mal forme) sans appeler l API', async () => {
    await afficher();

    await saisir({ nomComplet: 'A' });
    soumettre();
    await afficher();
    expect(texte()).toContain('Le nom complet doit compter de 2 à 120 caractères.');

    await saisir({ nomComplet: 'Amina Belkacem', telephone: '12345' });
    soumettre();
    await afficher();
    expect(texte()).toContain('Le téléphone doit être un numéro algérien');

    expect(service.enregistrer).not.toHaveBeenCalled();
  });

  it('enregistre le profil par PUT (champs nettoyes, facultatifs vides envoyes null) puis confirme « Profil enregistré. »', async () => {
    service.enregistrer.and.returnValue(of({ ...PROFIL, telephone: null, dateNaissance: null, wilayaCode: null, langue: 'kab' }));
    await afficher();

    await saisir({ nomComplet: '  Amina Belkacem ', telephone: '', dateNaissance: '', wilayaCode: ' ' });
    await choisirLangue('kab');
    soumettre();
    await afficher();

    expect(service.enregistrer).toHaveBeenCalledWith({ nomComplet: 'Amina Belkacem', telephone: null, dateNaissance: null, wilayaCode: null, langue: 'kab' });
    expect(texte()).toContain('Profil enregistré.');
    expect(texte()).toContain('Dernière mise à jour le 18 septembre 2026');
    expect(langue().value).toBe('kab');
  });

  it('envoie le telephone sans espaces et la date de naissance saisie', async () => {
    service.enregistrer.and.returnValue(of(PROFIL));
    await afficher();

    await saisir({ nomComplet: 'Amina Belkacem', telephone: '0550 12 34 56', dateNaissance: '1990-05-12', wilayaCode: '16' });
    await choisirLangue('ar');
    soumettre();
    await afficher();

    expect(service.enregistrer).toHaveBeenCalledWith({ nomComplet: 'Amina Belkacem', telephone: '0550123456', dateNaissance: '1990-05-12', wilayaCode: '16', langue: 'ar' });
  });

  it('affiche le { erreur } d un 400 et garde la saisie', async () => {
    service.enregistrer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La date de naissance doit etre dans le passe.' } })),
    );
    await afficher();

    await saisir({ nomComplet: 'Amina Belkacem', dateNaissance: '1990-05-12' });
    soumettre();
    await afficher();

    expect(texte()).toContain('La date de naissance doit etre dans le passe.');
    expect(texte()).not.toContain('Profil enregistré.');
    expect(champ('nomComplet').value).toBe('Amina Belkacem');
  });

  it('affiche le motif d une erreur de chargement autre que 404 sans formulaire', async () => {
    service.monProfil.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { erreur: 'Service indisponible.' } })));
    await afficher();

    expect(texte()).toContain('Service indisponible.');
    expect(formulaire()).toBeNull();
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.monProfil).not.toHaveBeenCalled();
    expect(texte()).toContain('Redirection vers la page de connexion');
  });
});
