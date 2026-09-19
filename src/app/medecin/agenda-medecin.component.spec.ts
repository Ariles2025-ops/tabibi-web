import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { Teleconsultation, TeleconsultationService } from '../teleconsultation/teleconsultation.service';
import { AgendaMedecinComponent } from './agenda-medecin.component';
import { MedecinService } from './medecin.service';

const CONFIRME: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };
const HONORE: RendezVous = { ...CONFIRME, id: 'r2', debut: '2026-09-01T09:00:00Z', statut: 'HONORE' };

const PLANIFIEE: Teleconsultation = {
  id: 't1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  statut: 'PLANIFIEE',
  consentementPatientLe: null,
  lienSalle: 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef',
  creeLe: '2026-09-18T10:00:00Z',
  demarreeLe: null,
  termineeLe: null,
};

/** Agenda du medecin : proposition d'une teleconsultation sur un rendez-vous confirme. */
describe('AgendaMedecinComponent', () => {
  let fixture: ComponentFixture<AgendaMedecinComponent>;
  let medecinService: jasmine.SpyObj<MedecinService>;
  let teleconsultations: jasmine.SpyObj<TeleconsultationService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    medecinService = jasmine.createSpyObj<MedecinService>('MedecinService', ['agenda', 'honorer']);
    medecinService.agenda.and.returnValue(of([CONFIRME, HONORE]));
    teleconsultations = jasmine.createSpyObj<TeleconsultationService>('TeleconsultationService', ['planifier']);

    TestBed.configureTestingModule({
      imports: [AgendaMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: medecinService },
        { provide: TeleconsultationService, useValue: teleconsultations },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(AgendaMedecinComponent);
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function boutonsProposer(): HTMLButtonElement[] {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.filter((b) => b.textContent?.includes('Proposer une téléconsultation'));
  }

  it('propose une teleconsultation uniquement sur les rendez-vous confirmes', () => {
    fixture.detectChanges();

    const lignes: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(lignes.length).toBe(2);
    expect(boutonsProposer().length).toBe(1);
    // Tri chronologique : le rendez-vous honore (septembre) precede le confirme (decembre).
    expect(lignes[0].textContent).toContain('Honoré');
    expect(lignes[0].querySelector('button')).toBeNull();
    expect(lignes[1].textContent).toContain('Confirmé');
  });

  it('planifie la teleconsultation puis affiche une confirmation avec la date du rendez-vous', () => {
    teleconsultations.planifier.and.returnValue(of(PLANIFIEE));
    fixture.detectChanges();

    boutonsProposer()[0].click();
    fixture.detectChanges();

    expect(teleconsultations.planifier).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('Téléconsultation proposée au patient pour le rendez-vous du');
    expect(texte()).toContain('7 décembre');
    expect(fixture.nativeElement.querySelector('a[href="/medecin/teleconsultations"]')).not.toBeNull();
  });

  it('affiche le motif { erreur } d un 409 (deja planifiee ou rendez-vous non confirme)', () => {
    teleconsultations.planifier.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Une teleconsultation est deja planifiee sur ce rendez-vous.' } })),
    );
    fixture.detectChanges();

    boutonsProposer()[0].click();
    fixture.detectChanges();

    expect(texte()).toContain('Une teleconsultation est deja planifiee sur ce rendez-vous.');
    expect(texte()).not.toContain('Téléconsultation proposée au patient');
    expect(boutonsProposer()[0].disabled).toBeFalse();
  });
});
