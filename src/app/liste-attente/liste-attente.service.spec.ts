import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InscriptionAttente, ListeAttenteService, instantInscription, trierParInscription } from './liste-attente.service';

const BASE = 'http://localhost:8080';

const INSCRIPTION: InscriptionAttente = { id: 'i1', patientId: 'p1', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' };

describe('ListeAttenteService', () => {
  let service: ListeAttenteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListeAttenteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inscrit par POST /api/medecins/{id}/liste-attente sans corps', () => {
    let recu: InscriptionAttente | undefined;
    service.inscrire('m1').subscribe((i) => (recu = i));

    const requete = http.expectOne(`${BASE}/api/medecins/m1/liste-attente`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush(INSCRIPTION, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(INSCRIPTION);
  });

  it('lit mes inscriptions sur GET /api/liste-attente/mes', () => {
    let recu: InscriptionAttente[] | undefined;
    service.mes().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/liste-attente/mes`);
    expect(requete.request.method).toBe('GET');
    requete.flush([INSCRIPTION]);

    expect(recu).toEqual([INSCRIPTION]);
  });

  it('retire par POST /api/liste-attente/{id}/retirer sans corps (204)', () => {
    let termine = false;
    service.retirer('i1').subscribe({ complete: () => (termine = true) });

    const requete = http.expectOne(`${BASE}/api/liste-attente/i1/retirer`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush(null, { status: 204, statusText: 'No Content' });

    expect(termine).toBeTrue();
  });

  it('lit la liste d attente du medecin sur GET /api/medecin/liste-attente', () => {
    let recu: InscriptionAttente[] | undefined;
    service.duMedecin().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/medecin/liste-attente`);
    expect(requete.request.method).toBe('GET');
    requete.flush([INSCRIPTION]);

    expect(recu).toEqual([INSCRIPTION]);
  });

  it('transmet le { erreur } d un 409 (deja inscrit)', () => {
    let statut = 0;
    let message = '';
    service.inscrire('m1').subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/medecins/m1/liste-attente`)
      .flush({ erreur: 'Vous etes deja inscrit sur la liste d attente de ce medecin.' }, { status: 409, statusText: 'Conflict' });

    expect(statut).toBe(409);
    expect(message).toBe('Vous etes deja inscrit sur la liste d attente de ce medecin.');
  });
});

describe('trierParInscription', () => {
  const base = { patientId: 'p', medecinId: 'm' };
  const a: InscriptionAttente = { ...base, id: 'a', inscritLe: '2026-09-10T08:30:00Z' };
  const b: InscriptionAttente = { ...base, id: 'b', inscritLe: '2026-09-18T10:00:00Z' };

  it('classe de la plus ancienne a la plus recente, comme l\'appli', () => {
    expect(trierParInscription([b, a]).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('place les dates absentes ou illisibles en fin de liste', () => {
    const sans: InscriptionAttente = { ...base, id: 'sans' };
    const nulle: InscriptionAttente = { ...base, id: 'nulle', inscritLe: null };
    const illisible: InscriptionAttente = { ...base, id: 'illisible', inscritLe: 'pas une date' };
    expect(trierParInscription([sans, b, nulle, a, illisible]).map((i) => i.id)).toEqual(['a', 'b', 'sans', 'nulle', 'illisible']);
  });

  it('ne modifie pas la liste d\'origine', () => {
    const liste = [b, a];
    trierParInscription(liste);
    expect(liste[0].id).toBe('b');
  });

  it('instantInscription vaut null sans date lisible', () => {
    expect(instantInscription({})).toBeNull();
    expect(instantInscription({ inscritLe: 'x' })).toBeNull();
    expect(instantInscription(a)).toBe(Date.parse('2026-09-10T08:30:00Z'));
  });
});
