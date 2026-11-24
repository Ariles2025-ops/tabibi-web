import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PatientResume, PatientsService, RepertoirePatients, nomPatient, telephonePatient } from './patients.service';

const BASE = 'http://localhost:8080';
const P1: PatientResume = { patientId: 'p1', nomComplet: 'Yasmine Benali', telephone: '0550123456', email: 'y@exemple.dz' };

describe('PatientsService', () => {
  let service: PatientsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PatientsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('indexe les patients du medecin (GET /api/medecin/patients) par identifiant', () => {
    let recu: RepertoirePatients | undefined;
    service.patientsDuMedecin().subscribe((r) => (recu = r));
    http.expectOne(`${BASE}/api/medecin/patients`).flush([P1]);

    expect(recu!.get('p1')).toEqual(P1);
    expect(nomPatient(recu!, 'p1')).toBe('Yasmine Benali');
    expect(telephonePatient(recu!, 'p1')).toBe('0550123456');
    expect(nomPatient(recu!, 'inconnu')).toBe('Patient inconnu');
    expect(nomPatient(recu!, 'inconnu', true)).toBe('مريض inconnu');
    // Sans nom connu : « Patient » + huit premiers caracteres de l'identifiant, comme dans l'appli.
    expect(nomPatient(recu!, '11111111-2222-3333-4444-555555555555')).toBe('Patient 11111111');
    expect(nomPatient(recu!, '11111111-2222-3333-4444-555555555555', true)).toBe('مريض 11111111');
    expect(nomPatient(recu!, '')).toBe('Patient');
    expect(telephonePatient(recu!, 'inconnu')).toBe('');
  });

  it('lit les patients d un cabinet rattache (GET /api/secretaire/medecins/{id}/patients)', () => {
    let recu: RepertoirePatients | undefined;
    service.patientsDuCabinet('m1').subscribe((r) => (recu = r));
    http.expectOne(`${BASE}/api/secretaire/medecins/m1/patients`).flush([P1]);
    expect(recu!.size).toBe(1);
  });

  it('administrateur : GET /api/admin/patients?ids=a,b (sans doublon), aucun appel pour une liste vide', () => {
    service.patientsParIds(['a', 'b', 'a']).subscribe();
    const requete = http.expectOne((r) => r.url === `${BASE}/api/admin/patients`);
    expect(requete.request.params.get('ids')).toBe('a,b');
    requete.flush([]);

    let recu: RepertoirePatients | undefined;
    service.patientsParIds([]).subscribe((r) => (recu = r));
    http.expectNone(`${BASE}/api/admin/patients`);
    expect(recu!.size).toBe(0);
  });
});
