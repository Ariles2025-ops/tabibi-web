import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
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
    localStorage.removeItem('tabibi.langue'); // la langue memorisee par un autre test ne doit pas fuiter
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

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim() === libelle);
  }

  /** « Clôturer la demande » puis « Oui, clôturer » (confirmation dans la page). */
  async function confirmerCloture() {
    boutonCloturer()!.click();
    await afficher();
    expect(texte()).toContain('Clôturer cette demande ?');
    bouton('Oui, clôturer')!.click();
    await afficher();
  }

  function boutonCloturer(): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes('Clôturer la demande'));
  }

  it('affiche la demande, les reponses (pharmacie, disponibilite, prix, commentaire, date) les plus anciennes d abord', async () => {
    await afficher();

    expect(service.reponses).toHaveBeenCalledWith('b1');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Amoxicilline 1 g');
    expect(texte()).toContain('Ouverte · Alger · Bab Ezzouar');
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

  it('une reponse sans date lisible affiche « date inconnue » et passe en fin de liste, sans erreur (comme l\'appli)', async () => {
    service.reponses.and.returnValue(of([
      { ...DISPONIBLE, id: 'rp3', nomPharmacie: 'Pharmacie Sans Date', repondueLe: 'xx' },
      DISPONIBLE,
      INDISPONIBLE,
    ]));
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.map((li) => li.textContent)).toEqual([
      jasmine.stringContaining('Pharmacie du Centre'),
      jasmine.stringContaining('Pharmacie El Amel'),
      jasmine.stringContaining('Pharmacie Sans Date'),
    ]);
    expect(items[2].textContent).toContain('date inconnue');
    expect(items[0].textContent).not.toContain('date inconnue');
  });

  it('une demande sans date de publication lisible affiche « date inconnue », et une clôture illisible est omise', async () => {
    service.mesBesoins.and.returnValue(of([{ ...CLOTUREE, publieLe: 'pas une date', clotureLe: 'xx' }]));
    await afficher();

    expect(texte()).toContain('date inconnue');
    expect(texte()).not.toContain('publiée le');
    expect(texte()).not.toContain('clôturée le');
  });

  it('cloture la demande, confirme et retire le bouton', async () => {
    service.cloturer.and.returnValue(of(CLOTUREE));
    await afficher();

    await confirmerCloture();

    expect(service.cloturer).toHaveBeenCalledWith('b1');
    expect(texte()).toContain('Demande clôturée');
    expect(texte()).toContain('Clôturée');
    expect(boutonCloturer()).toBeUndefined();
  });

  it('ne cloture rien tant que la confirmation n est pas donnee, et « Non » annule', async () => {
    await afficher();

    boutonCloturer()!.click();
    await afficher();
    expect(service.cloturer).not.toHaveBeenCalled();
    bouton('Non')!.click();
    await afficher();

    expect(service.cloturer).not.toHaveBeenCalled();
    expect(texte()).not.toContain('Clôturer cette demande ?');
    expect(boutonCloturer()).toBeDefined();
  });

  it('affiche le { erreur } d un 409 (deja cloturee) et recharge la demande', async () => {
    service.cloturer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Ce besoin est deja cloture.' } })));
    await afficher();
    service.mesBesoins.and.returnValue(of([CLOTUREE]));

    await confirmerCloture();

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

  it('s affiche en arabe (comme l\'appli) : statut, disponibilité, clôture et confirmation', async () => {
    const langue = TestBed.inject(LangueService);
    langue.ar.set(true);
    try {
      await afficher();

      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      expect(texte()).toContain('مفتوح · الجزائر');
      expect(texte()).toContain('ردود الصيدليات');
      const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
      expect(items[0].textContent).toContain('غير متوفر');
      expect(items[1].textContent).toContain('متوفر');
      expect(items[1].textContent).not.toContain('Disponible ·');
      expect(items[1].textContent).toContain('1 250 دج');
      expect(items[1].textContent).not.toContain('DA');
      expect(texte()).not.toContain('Indisponible');
      const bouton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes('إغلاق الطلب'));
      expect(bouton).toBeDefined();
      bouton!.click();
      await afficher();
      expect(texte()).toContain('نعم، أغلق');
    } finally {
      langue.ar.set(false);
    }
  });
});
