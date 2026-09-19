import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Candidature, DemandeCandidature } from '../admin/admin.service';
import { MedecinService } from './medecin.service';

const BASE = 'http://localhost:8080';

const DEMANDE: DemandeCandidature = {
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
};

const CANDIDATURE: Candidature = {
  id: 'c1',
  medecinId: 'm1',
  ...DEMANDE,
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

/** Candidature a l'annuaire (les autres appels de MedecinService datent de l'espace medecin). */
describe('MedecinService (candidature)', () => {
  let service: MedecinService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedecinService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('depose la candidature par POST /api/medecin/candidature avec tous les champs', () => {
    let recu: Candidature | undefined;
    service.deposerCandidature(DEMANDE).subscribe((c) => (recu = c));

    const requete = http.expectOne(`${BASE}/api/medecin/candidature`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(DEMANDE);
    requete.flush(CANDIDATURE, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(CANDIDATURE);
  });

  it('lit ma candidature sur GET /api/medecin/candidature', () => {
    let recu: Candidature | undefined;
    service.maCandidature().subscribe((c) => (recu = c));

    const requete = http.expectOne(`${BASE}/api/medecin/candidature`);
    expect(requete.request.method).toBe('GET');
    requete.flush(CANDIDATURE);

    expect(recu).toEqual(CANDIDATURE);
  });

  it('transmet le 404 quand aucune candidature n a ete deposee', () => {
    let statut = 0;
    service.maCandidature().subscribe({ error: (e) => (statut = e.status) });

    http.expectOne(`${BASE}/api/medecin/candidature`)
      .flush({ erreur: 'Aucune candidature deposee.' }, { status: 404, statusText: 'Not Found' });

    expect(statut).toBe(404);
  });
});
