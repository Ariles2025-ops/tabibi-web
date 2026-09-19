import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Ordonnance, OrdonnanceService, Verification } from './ordonnance.service';

const BASE = 'http://localhost:8080';

const ORDONNANCE: Ordonnance = {
  id: 'o1',
  medecinId: 'm1',
  patientId: 'p1',
  rendezVousId: 'r1',
  lignes: [{ medicament: 'Amoxicilline 1 g', posologie: '1 comprime matin et soir', duree: '7 jours' }],
  emiseLe: '2026-09-18T10:00:00Z',
  codeVerification: 'TBB-2026-0001',
  statut: 'EMISE',
};

describe('OrdonnanceService', () => {
  let service: OrdonnanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrdonnanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit mes ordonnances sur GET /api/ordonnances/mes', () => {
    let recu: Ordonnance[] | undefined;
    service.mes().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/ordonnances/mes`);
    expect(requete.request.method).toBe('GET');
    requete.flush([ORDONNANCE]);

    expect(recu).toEqual([ORDONNANCE]);
  });

  it('lit une ordonnance sur GET /api/ordonnances/{id}', () => {
    let recu: Ordonnance | undefined;
    service.parId('o1').subscribe((o) => (recu = o));

    const requete = http.expectOne(`${BASE}/api/ordonnances/o1`);
    expect(requete.request.method).toBe('GET');
    requete.flush(ORDONNANCE);

    expect(recu).toEqual(ORDONNANCE);
  });

  it('demande le PDF sur GET /api/ordonnances/{id}/pdf en responseType blob et renvoie le Blob recu', () => {
    let recu: Blob | undefined;
    service.pdf('o1').subscribe((pdf) => (recu = pdf));

    const requete = http.expectOne(`${BASE}/api/ordonnances/o1/pdf`);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.responseType).toBe('blob');
    requete.flush(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));

    expect(recu).toBeInstanceOf(Blob);
    expect(recu?.type).toBe('application/pdf');
  });

  it('verifie un code sur GET /api/ordonnances/verifier/{code}, code encode', () => {
    let recu: Verification | undefined;
    service.verifier('TBB 2026/0001').subscribe((v) => (recu = v));

    const requete = http.expectOne(`${BASE}/api/ordonnances/verifier/TBB%202026%2F0001`);
    expect(requete.request.method).toBe('GET');
    requete.flush({ valide: true, emiseLe: '2026-09-18T10:00:00Z', statut: 'EMISE' });

    expect(recu?.valide).toBeTrue();
  });

  it('emet une ordonnance par POST /api/ordonnances', () => {
    let recu: Ordonnance | undefined;
    service.emettre({ patientId: 'p1', rendezVousId: 'r1', lignes: ORDONNANCE.lignes }).subscribe((o) => (recu = o));

    const requete = http.expectOne(`${BASE}/api/ordonnances`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ patientId: 'p1', rendezVousId: 'r1', lignes: ORDONNANCE.lignes });
    requete.flush(ORDONNANCE, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(ORDONNANCE);
  });
});
