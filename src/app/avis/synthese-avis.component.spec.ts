import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { of, throwError } from 'rxjs';
import { AvisService, SyntheseAvis } from './avis.service';
import { SyntheseAvisComponent } from './synthese-avis.component';

const SYNTHESE: SyntheseAvis = {
  moyenne: 4.5,
  nombre: 2,
  avis: [
    { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
    { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
  ],
};

describe('SyntheseAvisComponent', () => {
  let fixture: ComponentFixture<SyntheseAvisComponent>;
  let service: jasmine.SpyObj<AvisService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<AvisService>('AvisService', ['synthese']);
    service.synthese.and.returnValue(of(SYNTHESE));

    TestBed.configureTestingModule({
      imports: [SyntheseAvisComponent],
      providers: [
        { provide: AvisService, useValue: service },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(SyntheseAvisComponent);
    fixture.componentRef.setInput('medecinId', 'm1');
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  it('affiche la moyenne au format francais et les derniers avis, les plus recents d abord', () => {
    fixture.detectChanges();

    expect(service.synthese).toHaveBeenCalledWith('m1');
    expect(texte()).toContain('4,5 / 5 (2 avis)');
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('5 / 5');
    expect(items[0].textContent).toContain('18 septembre 2026');
    expect(items[0].textContent).toContain('Très bon accueil.');
    expect(items[1].textContent).toContain('4 / 5');
  });

  it('indique qu il n y a aucun avis quand la moyenne est absente', () => {
    service.synthese.and.returnValue(of({ moyenne: null, nombre: 0, avis: [] }));
    fixture.detectChanges();

    expect(texte()).toContain('Aucun avis pour le moment');
    expect(fixture.nativeElement.querySelector('li')).toBeNull();
  });

  it('recharge la synthese quand l identifiant du medecin change et affiche une erreur de l API', () => {
    fixture.detectChanges();
    service.synthese.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { erreur: 'Service indisponible.' } })));

    fixture.componentRef.setInput('medecinId', 'm2');
    fixture.detectChanges();

    expect(service.synthese).toHaveBeenCalledWith('m2');
    expect(texte()).toContain('Service indisponible.');
    expect(texte()).not.toContain('4,5 / 5');
  });
});
