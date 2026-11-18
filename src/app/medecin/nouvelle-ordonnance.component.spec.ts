import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Ordonnance, OrdonnanceService } from '../ordonnances/ordonnance.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { MedecinService } from './medecin.service';
import { NouvelleOrdonnanceComponent } from './nouvelle-ordonnance.component';
import { PatientResume, PatientsService } from './patients.service';

const YASMINE: PatientResume = { patientId: 'p1', nomComplet: 'Yasmine Benali', telephone: '0550123456', email: null };
const KARIM: PatientResume = { patientId: 'p2', nomComplet: 'Karim Ouali', telephone: null, email: null };
const RDV_P1: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-09-18T09:00:00Z', statut: 'HONORE', creneauId: 'c1' };
const RDV_P2: RendezVous = { ...RDV_P1, id: 'r2', patientId: 'p2' };
const ANNULE_P1: RendezVous = { ...RDV_P1, id: 'r3', statut: 'ANNULE' };
const ABSENT_P1: RendezVous = { ...RDV_P1, id: 'r4', statut: 'ABSENT' };

describe('NouvelleOrdonnanceComponent', () => {
  let fixture: ComponentFixture<NouvelleOrdonnanceComponent>;
  let ordonnances: jasmine.SpyObj<OrdonnanceService>;
  let patients: jasmine.SpyObj<PatientsService>;
  let medecin: jasmine.SpyObj<MedecinService>;
  let query: Record<string, string>;

  function creer() {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } });
    fixture = TestBed.createComponent(NouvelleOrdonnanceComponent);
  }

  beforeEach(() => {
    registerLocaleData(localeFr);
    query = {};
    ordonnances = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['emettre']);
    patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['patientsDuMedecin']);
    patients.patientsDuMedecin.and.returnValue(of(new Map([[YASMINE.patientId, YASMINE], [KARIM.patientId, KARIM]])));
    medecin = jasmine.createSpyObj<MedecinService>('MedecinService', ['agenda']);
    medecin.agenda.and.returnValue(of([RDV_P1, RDV_P2, ANNULE_P1, ABSENT_P1]));

    TestBed.configureTestingModule({
      imports: [NouvelleOrdonnanceComponent],
      providers: [
        provideRouter([]),
        { provide: OrdonnanceService, useValue: ordonnances },
        { provide: PatientsService, useValue: patients },
        { provide: MedecinService, useValue: medecin },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function select(nom: string): HTMLSelectElement {
    return fixture.nativeElement.querySelector(`select[name="${nom}"]`);
  }

  function libelles(s: HTMLSelectElement): string[] {
    return Array.from(s.options).map((o) => o.textContent!.trim());
  }

  it('propose les patients du medecin par nom, puis les rendez-vous (confirmes ou honores) du patient choisi', async () => {
    creer();
    await afficher();

    expect(fixture.nativeElement.querySelector('input[name="patientId"]')).toBeNull();
    expect(libelles(select('patientId'))).toEqual(['Choisir un patient', 'Karim Ouali', 'Yasmine Benali · 0550123456']);
    expect(select('rendezVousId')).toBeNull();

    select('patientId').value = 'p1';
    select('patientId').dispatchEvent(new Event('change'));
    await afficher();

    const rdv = select('rendezVousId');
    expect(rdv.options.length).toBe(2);
    expect(libelles(rdv)[0]).toBe('Aucun');
    expect(libelles(rdv)[1]).toContain('18 septembre 2026');
  });

  it("ne propose pas un patient seulement en liste d'attente ou dont les RDV sont annules/absents", async () => {
    const attente: PatientResume = { patientId: 'p3', nomComplet: 'Amel Attente', telephone: null, email: null };
    const annule: PatientResume = { patientId: 'p4', nomComplet: 'Nadir Annule', telephone: null, email: null };
    patients.patientsDuMedecin.and.returnValue(
      of(new Map([YASMINE, KARIM, attente, annule].map((p) => [p.patientId, p] as [string, PatientResume]))),
    );
    medecin.agenda.and.returnValue(of([RDV_P1, { ...RDV_P1, id: 'r9', patientId: 'p4', statut: 'ANNULE' }]));
    creer();
    await afficher();

    expect(libelles(select('patientId'))).toEqual(['Choisir un patient', 'Yasmine Benali · 0550123456']);
  });

  it('prerempli depuis l agenda (?patientId=&rendezVousId=) et emet avec un medicament seul', async () => {
    query = { patientId: 'p1', rendezVousId: 'r1' };
    ordonnances.emettre.and.returnValue(of({ id: 'o1' } as Ordonnance));
    creer();
    const navigation = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    await afficher();

    expect(select('patientId').value).toBe('p1');
    expect(select('rendezVousId').value).toBe('r1');

    const medicament: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Ex. Paracétamol 1 g"]');
    medicament.value = 'Paracétamol 1 g';
    medicament.dispatchEvent(new Event('input'));
    await afficher();
    const envoyer: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(envoyer.disabled).toBeFalse();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();

    expect(ordonnances.emettre).toHaveBeenCalledWith({
      patientId: 'p1',
      rendezVousId: 'r1',
      lignes: [{ medicament: 'Paracétamol 1 g', posologie: '', duree: '' }],
    });
    expect(navigation).toHaveBeenCalledWith(['/ordonnances', 'o1']);
  });

  it("affiche le message de l'API (403 ou 409) au lieu d'un texte generique", async () => {
    query = { patientId: 'p1' };
    ordonnances.emettre.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Rendez-vous absent.' } })));
    creer();
    await afficher();
    const medicament: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Ex. Paracétamol 1 g"]');
    medicament.value = 'Doliprane';
    medicament.dispatchEvent(new Event('input'));
    await afficher();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Rendez-vous absent.');
  });
});
