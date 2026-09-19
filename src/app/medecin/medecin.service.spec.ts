import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Candidature, DemandeCandidature } from '../admin/admin.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { Rattachement } from '../secretaire/secretaire.service';
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

const RATTACHEMENT: Rattachement = { id: 'ra1', medecinId: 'm1', secretaireId: '55555555-5555-5555-5555-555555555555', creeLe: '2026-09-18T10:00:00Z' };

const CONFIRME: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };

/** Candidature a l'annuaire et cabinet (les autres appels de MedecinService datent de l'espace medecin). */
describe('MedecinService (candidature et cabinet)', () => {
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

  it('annule un rendez-vous par POST /api/medecin/rendezvous/{id}/annuler sans corps', () => {
    let recu: RendezVous | undefined;
    service.annulerRendezVous('r1').subscribe((r) => (recu = r));

    const requete = http.expectOne(`${BASE}/api/medecin/rendezvous/r1/annuler`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush({ ...CONFIRME, statut: 'ANNULE' });

    expect(recu?.statut).toBe('ANNULE');
  });

  it('transmet le { erreur } d un 409 a l annulation (rendez-vous non confirme)', () => {
    let statut = 0;
    let message = '';
    service.annulerRendezVous('r1').subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/medecin/rendezvous/r1/annuler`)
      .flush({ erreur: 'Seul un rendez-vous confirme peut etre annule.' }, { status: 409, statusText: 'Conflict' });

    expect(statut).toBe(409);
    expect(message).toBe('Seul un rendez-vous confirme peut etre annule.');
  });

  it('liste mes secretaires sur GET /api/medecin/secretaires', () => {
    let recu: Rattachement[] | undefined;
    service.secretaires().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/medecin/secretaires`);
    expect(requete.request.method).toBe('GET');
    requete.flush([RATTACHEMENT]);

    expect(recu).toEqual([RATTACHEMENT]);
  });

  it('rattache une secretaire par POST /api/medecin/secretaires avec { secretaireId }', () => {
    let recu: Rattachement | undefined;
    service.rattacherSecretaire('55555555-5555-5555-5555-555555555555').subscribe((r) => (recu = r));

    const requete = http.expectOne(`${BASE}/api/medecin/secretaires`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ secretaireId: '55555555-5555-5555-5555-555555555555' });
    requete.flush(RATTACHEMENT, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(RATTACHEMENT);
  });

  it('retire une secretaire par POST /api/medecin/secretaires/{id}/retirer sans corps (204)', () => {
    let termine = false;
    service.retirerSecretaire('ra1').subscribe({ complete: () => (termine = true) });

    const requete = http.expectOne(`${BASE}/api/medecin/secretaires/ra1/retirer`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush(null, { status: 204, statusText: 'No Content' });

    expect(termine).toBeTrue();
  });
});
