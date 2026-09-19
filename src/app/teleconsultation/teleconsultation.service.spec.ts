import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Teleconsultation, TeleconsultationService, salleAccessible } from './teleconsultation.service';

const BASE = 'http://localhost:8080';

const PLANIFIEE: Teleconsultation = {
  id: 't1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  statut: 'PLANIFIEE',
  consentementPatientLe: null,
  lienSalle: null,
  creeLe: '2026-09-18T10:00:00Z',
  demarreeLe: null,
  termineeLe: null,
};

const CONSENTIE: Teleconsultation = {
  ...PLANIFIEE,
  consentementPatientLe: '2026-09-18T10:05:00Z',
  lienSalle: 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef',
};

describe('TeleconsultationService', () => {
  let service: TeleconsultationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeleconsultationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit mes teleconsultations sur GET /api/teleconsultations/mes', () => {
    let recu: Teleconsultation[] | undefined;
    service.mes().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/teleconsultations/mes`);
    expect(requete.request.method).toBe('GET');
    requete.flush([PLANIFIEE]);

    expect(recu).toEqual([PLANIFIEE]);
  });

  it('lit une teleconsultation sur GET /api/teleconsultations/{id}', () => {
    let recu: Teleconsultation | undefined;
    service.parId('t1').subscribe((t) => (recu = t));

    const requete = http.expectOne(`${BASE}/api/teleconsultations/t1`);
    expect(requete.request.method).toBe('GET');
    requete.flush(CONSENTIE);

    expect(recu).toEqual(CONSENTIE);
  });

  it('consent par POST /api/teleconsultations/{id}/consentir sans corps et recoit le lien de salle', () => {
    let recu: Teleconsultation | undefined;
    service.consentir('t1').subscribe((t) => (recu = t));

    const requete = http.expectOne(`${BASE}/api/teleconsultations/t1/consentir`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush(CONSENTIE);

    expect(recu?.lienSalle).toBe(CONSENTIE.lienSalle);
    expect(recu?.consentementPatientLe).toBe('2026-09-18T10:05:00Z');
  });

  it('planifie par POST /api/medecin/teleconsultations avec { rendezVousId }', () => {
    let recu: Teleconsultation | undefined;
    service.planifier('r1').subscribe((t) => (recu = t));

    const requete = http.expectOne(`${BASE}/api/medecin/teleconsultations`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ rendezVousId: 'r1' });
    requete.flush(PLANIFIEE, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(PLANIFIEE);
  });

  it('lit les teleconsultations du medecin sur GET /api/medecin/teleconsultations', () => {
    let recu: Teleconsultation[] | undefined;
    service.duMedecin().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/medecin/teleconsultations`);
    expect(requete.request.method).toBe('GET');
    requete.flush([CONSENTIE]);

    expect(recu).toEqual([CONSENTIE]);
  });

  it('demarre, termine et annule par POST /api/teleconsultations/{id}/... sans corps', () => {
    service.demarrer('t1').subscribe();
    const demarrer = http.expectOne(`${BASE}/api/teleconsultations/t1/demarrer`);
    expect(demarrer.request.method).toBe('POST');
    expect(demarrer.request.body).toBeNull();
    demarrer.flush({ ...CONSENTIE, statut: 'EN_COURS' });

    service.terminer('t1').subscribe();
    const terminer = http.expectOne(`${BASE}/api/teleconsultations/t1/terminer`);
    expect(terminer.request.method).toBe('POST');
    terminer.flush({ ...CONSENTIE, statut: 'TERMINEE' });

    service.annuler('t1').subscribe();
    const annuler = http.expectOne(`${BASE}/api/teleconsultations/t1/annuler`);
    expect(annuler.request.method).toBe('POST');
    annuler.flush({ ...PLANIFIEE, statut: 'ANNULEE' });
  });

  it('transmet l erreur { erreur } d un 409 (demarrage sans consentement)', () => {
    let statut = 0;
    let message = '';
    service.demarrer('t1').subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/teleconsultations/t1/demarrer`)
      .flush({ erreur: "Le patient n'a pas consenti." }, { status: 409, statusText: 'Conflict' });

    expect(statut).toBe(409);
    expect(message).toBe("Le patient n'a pas consenti.");
  });

  describe('salleAccessible', () => {
    it('exige un lien et un statut planifiee ou en cours', () => {
      expect(salleAccessible(PLANIFIEE)).toBeFalse();
      expect(salleAccessible(CONSENTIE)).toBeTrue();
      expect(salleAccessible({ ...CONSENTIE, statut: 'EN_COURS' })).toBeTrue();
      expect(salleAccessible({ ...CONSENTIE, statut: 'TERMINEE' })).toBeFalse();
      expect(salleAccessible({ ...CONSENTIE, statut: 'ANNULEE' })).toBeFalse();
      expect(salleAccessible({ ...CONSENTIE, lienSalle: '' })).toBeFalse();
    });
  });
});
