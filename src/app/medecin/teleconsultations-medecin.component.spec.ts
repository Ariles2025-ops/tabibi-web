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
import { MedecinService } from './medecin.service';
import { TeleconsultationsMedecinComponent } from './teleconsultations-medecin.component';

const LIEN = 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef';

const SANS_CONSENTEMENT: Teleconsultation = {
  id: 't1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  statut: 'PLANIFIEE',
  consentementPatientLe: null,
  lienSalle: LIEN,
  creeLe: '2026-09-18T10:00:00Z',
  demarreeLe: null,
  termineeLe: null,
};

const CONSENTIE: Teleconsultation = { ...SANS_CONSENTEMENT, id: 't2', rendezVousId: 'r2', consentementPatientLe: '2026-09-18T10:05:00Z' };

const EN_COURS: Teleconsultation = { ...CONSENTIE, id: 't3', rendezVousId: 'r3', statut: 'EN_COURS', demarreeLe: '2026-09-18T11:00:00Z' };

const RENDEZ_VOUS: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };

describe('TeleconsultationsMedecinComponent', () => {
  let fixture: ComponentFixture<TeleconsultationsMedecinComponent>;
  let service: jasmine.SpyObj<TeleconsultationService>;
  let medecinService: jasmine.SpyObj<MedecinService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<TeleconsultationService>('TeleconsultationService', ['duMedecin', 'demarrer', 'terminer', 'annuler']);
    service.duMedecin.and.returnValue(of([SANS_CONSENTEMENT]));
    medecinService = jasmine.createSpyObj<MedecinService>('MedecinService', ['agenda']);
    medecinService.agenda.and.returnValue(of([RENDEZ_VOUS]));
    auth = { seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [TeleconsultationsMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: TeleconsultationService, useValue: service },
        { provide: MedecinService, useValue: medecinService },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(TeleconsultationsMedecinComponent);
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function lignes(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  function bouton(ligne: HTMLElement, libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(ligne.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes(libelle));
  }

  it('desactive « Démarrer » et mentionne l attente du consentement tant que le patient n a pas consenti', () => {
    fixture.detectChanges();

    const ligne = lignes()[0];
    expect(bouton(ligne, 'Démarrer')!.disabled).toBeTrue();
    expect(ligne.textContent).toContain('En attente du consentement du patient');
    expect(bouton(ligne, 'Annuler')!.disabled).toBeFalse();
    expect(bouton(ligne, 'Terminer')).toBeUndefined();
    expect(ligne.textContent).toContain('Rendez-vous du');
    expect(ligne.textContent).toContain('7 décembre');
    expect(ligne.textContent).toContain('Patient : p1');
    expect(ligne.textContent).toContain('Planifiée');
  });

  it('affiche le lien de salle du medecin (nouvel onglet, noopener) et active « Démarrer » apres consentement', () => {
    service.duMedecin.and.returnValue(of([CONSENTIE]));
    service.demarrer.and.returnValue(of({ ...CONSENTIE, statut: 'EN_COURS', demarreeLe: '2026-09-18T11:00:00Z' }));
    fixture.detectChanges();

    const ligne = lignes()[0];
    const lien: HTMLAnchorElement = ligne.querySelector('a[target="_blank"]')!;
    expect(lien.getAttribute('href')).toBe(LIEN);
    expect(lien.getAttribute('rel')).toBe('noopener');
    expect(ligne.textContent).toContain('consentement donné le');
    expect(ligne.textContent).not.toContain('En attente du consentement du patient');
    expect(bouton(ligne, 'Démarrer')!.disabled).toBeFalse();

    bouton(ligne, 'Démarrer')!.click();
    fixture.detectChanges();

    expect(service.demarrer).toHaveBeenCalledWith('t2');
    expect(texte()).toContain('En cours');
    expect(bouton(lignes()[0], 'Terminer')).toBeDefined();
    expect(bouton(lignes()[0], 'Démarrer')).toBeUndefined();
  });

  it('« Terminer » clot une teleconsultation en cours ; la salle n est plus proposee', () => {
    service.duMedecin.and.returnValue(of([EN_COURS]));
    service.terminer.and.returnValue(of({ ...EN_COURS, statut: 'TERMINEE', termineeLe: '2026-09-18T11:20:00Z' }));
    fixture.detectChanges();

    expect(lignes()[0].querySelector('a[target="_blank"]')).not.toBeNull();
    bouton(lignes()[0], 'Terminer')!.click();
    fixture.detectChanges();

    expect(service.terminer).toHaveBeenCalledWith('t3');
    expect(texte()).toContain('Terminée');
    expect(lignes()[0].querySelector('a[target="_blank"]')).toBeNull();
    expect(lignes()[0].querySelectorAll('button').length).toBe(0);
  });

  it('« Annuler » demande confirmation puis annule', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.annuler.and.returnValue(of({ ...SANS_CONSENTEMENT, statut: 'ANNULEE' }));
    fixture.detectChanges();

    bouton(lignes()[0], 'Annuler')!.click();
    fixture.detectChanges();

    expect(service.annuler).toHaveBeenCalledWith('t1');
    expect(texte()).toContain('Annulée');
  });

  it('affiche le motif { erreur } d un 409 et recharge la liste', () => {
    service.duMedecin.and.returnValue(of([CONSENTIE]));
    service.demarrer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: "Le patient n'a pas consenti." } })),
    );
    fixture.detectChanges();

    bouton(lignes()[0], 'Démarrer')!.click();
    fixture.detectChanges();

    expect(texte()).toContain("Le patient n'a pas consenti.");
    expect(service.duMedecin).toHaveBeenCalledTimes(2);
  });

  it('affiche un message et un lien vers l agenda quand il n y a aucune teleconsultation', () => {
    service.duMedecin.and.returnValue(of([]));
    fixture.detectChanges();

    expect(texte()).toContain('Aucune téléconsultation pour le moment.');
    expect(fixture.nativeElement.querySelector('a[href="/medecin/agenda"]')).not.toBeNull();
    expect(medecinService.agenda).not.toHaveBeenCalled();
  });
});
