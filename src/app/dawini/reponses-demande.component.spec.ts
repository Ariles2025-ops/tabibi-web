import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, Reponse } from './dawini.service';
import { ReponsesDemandeComponent } from './reponses-demande.component';

const OUVERTE: Besoin = {
  id: 'b1',
  patientId: 'p1',
  medicament: 'Amoxicilline 1 g',
  wilayaCode: '16',
  commune: 'Bab Ezzouar',
  precision: 'Boîte de 14 comprimés',
  statut: 'OUVERT',
  publieLe: '2026-09-18T10:00:00Z',
  clotureLe: null,
  nombreReponses: 2,
};

const CLOTUREE: Besoin = { ...OUVERTE, statut: 'CLOTURE', clotureLe: '2026-09-18T12:00:00Z' };

const DISPONIBLE: Reponse = {
  id: 'rp1',
  besoinId: 'b1',
  pharmacieId: 'ph1',
  nomPharmacie: 'Pharmacie El Amel',
  disponible: true,
  prixDa: 1250,
  commentaire: 'Disponible jusqu à 19 h.',
  repondueLe: '2026-09-18T11:00:00Z',
};

const INDISPONIBLE: Reponse = {
  ...DISPONIBLE,
  id: 'rp2',
  pharmacieId: 'ph2',
  nomPharmacie: 'Pharmacie du Centre',
  disponible: false,
  prixDa: null,
  commentaire: null,
  repondueLe: '2026-09-18T10:30:00Z',
};

describe('ReponsesDemandeComponent', () => {
  let fixture: ComponentFixture<ReponsesDemandeComponent>;
  let service: jasmine.SpyObj<DawiniService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<DawiniService>('DawiniService', ['mesBesoins', 'reponses', 'cloturer']);
    service.mesBesoins.and.returnValue(of([OUVERTE]));
    service.reponses.and.returnValue(of([DISPONIBLE, INDISPONIBLE]));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [ReponsesDemandeComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'b1' }) } } },
        { provide: DawiniService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(ReponsesDemandeComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function boutonCloturer(): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes('Clôturer la demande'));
  }

  it('affiche la demande, les reponses (pharmacie, disponibilite, prix, commentaire, date) les plus anciennes d abord', async () => {
    await afficher();

    expect(service.reponses).toHaveBeenCalledWith('b1');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Amoxicilline 1 g');
    expect(texte()).toContain('Ouverte · Wilaya 16 · Bab Ezzouar');
    expect(texte()).toContain('Boîte de 14 comprimés');
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Pharmacie du Centre');
    expect(items[0].textContent).toContain('Indisponible');
    expect(items[0].textContent).not.toContain('DA');
    expect(items[1].textContent).toContain('Pharmacie El Amel');
    expect(items[1].textContent).toContain('Disponible');
    expect(items[1].textContent).toContain('1 250 DA');
    expect(items[1].textContent).toContain('Disponible jusqu à 19 h.');
    expect(items[1].textContent).toContain('18 septembre');
    expect(boutonCloturer()).toBeDefined();
  });

  it('cloture la demande, confirme et retire le bouton', async () => {
    service.cloturer.and.returnValue(of(CLOTUREE));
    await afficher();

    boutonCloturer()!.click();
    await afficher();

    expect(service.cloturer).toHaveBeenCalledWith('b1');
    expect(texte()).toContain('Demande clôturée');
    expect(texte()).toContain('Clôturée');
    expect(boutonCloturer()).toBeUndefined();
  });

  it('affiche le { erreur } d un 409 (deja cloturee) et recharge la demande', async () => {
    service.cloturer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Ce besoin est deja cloture.' } })));
    await afficher();
    service.mesBesoins.and.returnValue(of([CLOTUREE]));

    boutonCloturer()!.click();
    await afficher();

    expect(texte()).toContain('Ce besoin est deja cloture.');
    expect(service.mesBesoins).toHaveBeenCalledTimes(2);
    expect(boutonCloturer()).toBeUndefined();
  });

  it('ne propose pas la cloture d une demande deja cloturee et signale l absence de reponse', async () => {
    service.mesBesoins.and.returnValue(of([CLOTUREE]));
    service.reponses.and.returnValue(of([]));
    await afficher();

    expect(boutonCloturer()).toBeUndefined();
    expect(texte()).toContain('Aucune réponse pour le moment.');
  });

  it('indique qu une demande ne m appartient pas sur un 403 et redirige si non connecte', async () => {
    service.reponses.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();
    expect(texte()).toContain('Cette demande ne vous appartient pas.');

    auth.estConnecte = () => false;
    fixture = TestBed.createComponent(ReponsesDemandeComponent);
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.reponses).toHaveBeenCalledTimes(1);
  });
});
