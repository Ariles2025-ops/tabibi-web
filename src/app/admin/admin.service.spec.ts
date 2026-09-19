import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService, Candidature, StatistiquesAdministration, libelleStatutCandidature } from './admin.service';

const BASE = 'http://localhost:8080';

const EN_ATTENTE: Candidature = {
  id: 'c1',
  medecinId: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste les candidatures d un statut sur GET /api/admin/candidatures?statut=', () => {
    let recu: Candidature[] | undefined;
    service.candidatures('EN_ATTENTE').subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/admin/candidatures?statut=EN_ATTENTE`);
    expect(requete.request.method).toBe('GET');
    requete.flush([EN_ATTENTE]);

    expect(recu).toEqual([EN_ATTENTE]);
  });

  it('liste toutes les candidatures sans parametre quand aucun statut n est donne', () => {
    service.candidatures().subscribe();

    const requete = http.expectOne(`${BASE}/api/admin/candidatures`);
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush([]);
  });

  it('valide par POST /api/admin/candidatures/{id}/valider sans corps', () => {
    let recu: Candidature | undefined;
    service.valider('c1').subscribe((c) => (recu = c));

    const requete = http.expectOne(`${BASE}/api/admin/candidatures/c1/valider`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush({ ...EN_ATTENTE, statut: 'VALIDEE', traiteeLe: '2026-09-18T12:00:00Z' });

    expect(recu?.statut).toBe('VALIDEE');
  });

  it('refuse par POST /api/admin/candidatures/{id}/refuser avec { motif }', () => {
    let recu: Candidature | undefined;
    service.refuser('c1', 'Numéro d’ordre invalide').subscribe((c) => (recu = c));

    const requete = http.expectOne(`${BASE}/api/admin/candidatures/c1/refuser`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ motif: 'Numéro d’ordre invalide' });
    requete.flush({ ...EN_ATTENTE, statut: 'REFUSEE', motifRefus: 'Numéro d’ordre invalide', traiteeLe: '2026-09-18T12:00:00Z' });

    expect(recu?.statut).toBe('REFUSEE');
    expect(recu?.motifRefus).toBe('Numéro d’ordre invalide');
  });

  it('lit les statistiques sur GET /api/admin/statistiques', () => {
    let recu: StatistiquesAdministration | undefined;
    service.statistiques().subscribe((s) => (recu = s));

    const requete = http.expectOne(`${BASE}/api/admin/statistiques`);
    expect(requete.request.method).toBe('GET');
    requete.flush({ candidaturesEnAttente: 2, candidaturesValidees: 5, candidaturesRefusees: 1 });

    expect(recu).toEqual({ candidaturesEnAttente: 2, candidaturesValidees: 5, candidaturesRefusees: 1 });
  });

  it('transmet le { erreur } d un 409 (candidature deja traitee)', () => {
    let statut = 0;
    let message = '';
    service.valider('c1').subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/admin/candidatures/c1/valider`)
      .flush({ erreur: 'Seule une candidature en attente peut etre validee.' }, { status: 409, statusText: 'Conflict' });

    expect(statut).toBe(409);
    expect(message).toBe('Seule une candidature en attente peut etre validee.');
  });

  describe('libelleStatutCandidature', () => {
    it('traduit les statuts connus et affiche tel quel un statut inconnu', () => {
      expect(libelleStatutCandidature('EN_ATTENTE')).toBe('En attente');
      expect(libelleStatutCandidature('VALIDEE')).toBe('Validée');
      expect(libelleStatutCandidature('REFUSEE')).toBe('Refusée');
      expect(libelleStatutCandidature('ARCHIVEE')).toBe('ARCHIVEE');
      expect(libelleStatutCandidature(null)).toBe('');
    });
  });
});
