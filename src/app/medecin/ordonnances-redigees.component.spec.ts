import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Ordonnance } from '../ordonnances/ordonnance.service';
import { LangueService } from '../partage/langue.service';
import { MedecinService } from './medecin.service';
import { PatientsService } from './patients.service';
import { OrdonnancesRedigeesComponent } from './ordonnances-redigees.component';

const EMISE = {
  id: 'o1', patientId: 'p1', medecinId: 'm1', statut: 'EMISE', emiseLe: '2026-09-18T10:00:00Z', codeVerification: 'ABC123',
} as unknown as Ordonnance;
const ANNULEE = {
  id: 'o2', patientId: 'p1', medecinId: 'm1', statut: 'ANNULEE', motifAnnulation: 'Erreur de dose', emiseLe: '2026-09-10T10:00:00Z', codeVerification: 'XYZ789',
} as unknown as Ordonnance;

describe('OrdonnancesRedigeesComponent', () => {
  let fixture: ComponentFixture<OrdonnancesRedigeesComponent>;

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue'); // la langue memorisee par un autre test ne doit pas fuiter
    registerLocaleData(localeFr);
    const medecin = jasmine.createSpyObj<MedecinService>('MedecinService', ['ordonnancesRedigees', 'annulerOrdonnance']);
    medecin.ordonnancesRedigees.and.returnValue(of([ANNULEE, EMISE]));
    const patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['patientsDuMedecin']);
    patients.patientsDuMedecin.and.returnValue(of(new Map()));
    TestBed.configureTestingModule({
      imports: [OrdonnancesRedigeesComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: medecin },
        { provide: PatientsService, useValue: patients },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(OrdonnancesRedigeesComponent);
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  it('s\'affiche en francais par defaut, les plus recentes d\'abord', () => {
    fixture.detectChanges();
    expect(texte()).toContain('Mes ordonnances rédigées');
    expect(texte()).toContain('Motif : Erreur de dose');
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items[0].textContent).toContain('ABC123');
  });

  it('s\'affiche en arabe (titre, statut, motif, bouton Annuler) quand la langue est l\'arabe', () => {
    TestBed.inject(LangueService).ar.set(true);
    fixture.detectChanges();
    expect(texte()).toContain('وصفاتي التي حررتها');
    expect(texte()).toContain('السبب: Erreur de dose');
    expect(texte()).toContain('إلغاء');
    expect(texte()).toContain('مريض');
    expect(texte()).not.toContain('Annuler');
    expect(texte()).not.toContain('Patient');
    expect(texte()).not.toContain('Mes ordonnances');
  });

  it('confirme « Ordonnance annulée. » (FR/AR) apres une annulation reussie, comme l\'appli', () => {
    const medecin = TestBed.inject(MedecinService) as jasmine.SpyObj<MedecinService>;
    medecin.annulerOrdonnance.and.returnValue(of({ ...EMISE, statut: 'ANNULEE' } as Ordonnance));
    fixture.detectChanges();
    expect(texte()).not.toContain('Ordonnance annulée.');
    fixture.componentInstance.demanderAnnulation(EMISE);
    fixture.componentInstance.confirmerAnnulation(EMISE);
    fixture.detectChanges();
    expect(texte()).toContain('Ordonnance annulée.');
    TestBed.inject(LangueService).ar.set(true);
    fixture.detectChanges();
    expect(texte()).toContain('تم إلغاء الوصفة.');
    expect(texte()).not.toContain('Ordonnance annulée.');
  });
});
