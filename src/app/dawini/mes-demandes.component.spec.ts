import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService } from './dawini.service';
import { MesDemandesComponent } from './mes-demandes.component';

const OUVERTE: Besoin = {
  id: 'b1',
  patientId: 'p1',
  medicament: 'Amoxicilline 1 g',
  wilayaCode: '16',
  commune: 'Bab Ezzouar',
  precision: null,
  statut: 'OUVERT',
  publieLe: '2026-09-18T10:00:00Z',
  clotureLe: null,
  nombreReponses: 3,
};

const CLOTUREE: Besoin = {
  ...OUVERTE,
  id: 'b2',
  medicament: 'Insuline',
  commune: null,
  statut: 'CLOTURE',
  publieLe: '2026-09-10T10:00:00Z',
  clotureLe: '2026-09-11T10:00:00Z',
  nombreReponses: 1,
};

describe('MesDemandesComponent', () => {
  let fixture: ComponentFixture<MesDemandesComponent>;
  let service: jasmine.SpyObj<DawiniService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<DawiniService>('DawiniService', ['mesBesoins', 'publier']);
    service.mesBesoins.and.returnValue(of([CLOTUREE, OUVERTE]));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesDemandesComponent],
      providers: [
        provideRouter([]),
        { provide: DawiniService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesDemandesComponent);
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

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[name="${nom}"]`);
  }

  async function saisir(valeurs: Record<string, string>) {
    for (const [nom, valeur] of Object.entries(valeurs)) {
      const c = champ(nom);
      c.value = valeur;
      c.dispatchEvent(new Event('input'));
    }
    await afficher();
  }

  function soumettre() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  it('liste mes demandes, les plus recentes d abord, avec statut et nombre de reponses', async () => {
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Amoxicilline 1 g');
    expect(items[0].textContent).toContain('Ouverte');
    expect(items[0].textContent).toContain('Wilaya 16 · Bab Ezzouar');
    expect(items[0].textContent).toContain('3 réponses');
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('/dawini/b1');
    expect(items[1].textContent).toContain('Insuline');
    expect(items[1].textContent).toContain('Clôturée');
    expect(items[1].textContent).toContain('1 réponse');
  });

  it('refuse cote client une demande sans medicament ou sans wilaya', async () => {
    await afficher();

    await saisir({ wilayaCode: '16' });
    soumettre();
    await afficher();

    expect(service.publier).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez le médicament recherché et le code de votre wilaya.');
  });

  it('publie la demande (champs nettoyes, facultatifs omis s ils sont vides), confirme, vide le formulaire et recharge', async () => {
    service.publier.and.returnValue(of(OUVERTE));
    await afficher();

    await saisir({ medicament: '  Amoxicilline 1 g ', wilayaCode: ' 16 ', commune: 'Bab Ezzouar', precision: '   ' });
    soumettre();
    await afficher();

    expect(service.publier).toHaveBeenCalledWith({ medicament: 'Amoxicilline 1 g', wilayaCode: '16', commune: 'Bab Ezzouar' });
    expect(texte()).toContain('Demande publiée');
    expect(champ('medicament').value).toBe('');
    expect(service.mesBesoins).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 400 sans recharger', async () => {
    service.publier.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Le code de wilaya ne peut pas depasser 4 caracteres.' } })),
    );
    await afficher();

    await saisir({ medicament: 'Insuline', wilayaCode: '16000' });
    soumettre();
    await afficher();

    expect(texte()).toContain('Le code de wilaya ne peut pas depasser 4 caracteres.');
    expect(service.mesBesoins).toHaveBeenCalledTimes(1);
  });

  it('affiche un message quand il n y a aucune demande et redirige si non connecte', async () => {
    service.mesBesoins.and.returnValue(of([]));
    await afficher();
    expect(texte()).toContain('Aucune demande pour le moment.');

    auth.estConnecte = () => false;
    fixture = TestBed.createComponent(MesDemandesComponent);
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mesBesoins).toHaveBeenCalledTimes(1);
  });
});
