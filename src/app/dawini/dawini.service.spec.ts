import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Besoin, DawiniService, DemandeReponse, Reponse, formaterPrix, libelleReponses, libelleStatutBesoin } from './dawini.service';

const BASE = 'http://localhost:8080';

const BESOIN: Besoin = {
  id: 'b1',
  patientId: 'p1',
  medicament: 'Amoxicilline 1 g',
  wilayaCode: '16',
  commune: 'Bab Ezzouar',
  precision: 'Boîte de 14 comprimés',
  statut: 'OUVERT',
  publieLe: '2026-09-18T10:00:00Z',
  clotureLe: null,
  nombreReponses: 0,
};

const REPONSE: Reponse = {
  id: 'rp1',
  besoinId: 'b1',
  pharmacieId: 'ph1',
  nomPharmacie: 'Pharmacie El Amel',
  disponible: true,
  prixDa: 850,
  commentaire: 'Disponible jusqu à 19 h.',
  repondueLe: '2026-09-18T11:00:00Z',
};

describe('DawiniService', () => {
  let service: DawiniService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DawiniService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('publie un besoin par POST /api/dawini/besoins avec { medicament, wilayaCode, commune, precision }', () => {
    let recu: Besoin | undefined;
    const demande = { medicament: 'Amoxicilline 1 g', wilayaCode: '16', commune: 'Bab Ezzouar', precision: 'Boîte de 14 comprimés' };
    service.publier(demande).subscribe((b) => (recu = b));

    const requete = http.expectOne(`${BASE}/api/dawini/besoins`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(demande);
    requete.flush(BESOIN, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(BESOIN);
  });

  it('lit mes besoins sur GET /api/dawini/besoins/mes', () => {
    let recu: Besoin[] | undefined;
    service.mesBesoins().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/dawini/besoins/mes`);
    expect(requete.request.method).toBe('GET');
    requete.flush([BESOIN]);

    expect(recu).toEqual([BESOIN]);
  });

  it('cloture par POST /api/dawini/besoins/{id}/cloturer sans corps', () => {
    let recu: Besoin | undefined;
    service.cloturer('b1').subscribe((b) => (recu = b));

    const requete = http.expectOne(`${BASE}/api/dawini/besoins/b1/cloturer`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush({ ...BESOIN, statut: 'CLOTURE', clotureLe: '2026-09-18T12:00:00Z' });

    expect(recu?.statut).toBe('CLOTURE');
  });

  it('lit les reponses sur GET /api/dawini/besoins/{id}/reponses', () => {
    let recu: Reponse[] | undefined;
    service.reponses('b1').subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/dawini/besoins/b1/reponses`);
    expect(requete.request.method).toBe('GET');
    requete.flush([REPONSE]);

    expect(recu).toEqual([REPONSE]);
  });

  it('lit les besoins ouverts d une wilaya sur GET /api/dawini/besoins?wilaya=', () => {
    let recu: Besoin[] | undefined;
    service.besoinsOuverts('16').subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/dawini/besoins?wilaya=16`);
    expect(requete.request.method).toBe('GET');
    requete.flush([{ ...BESOIN, patientId: null }]);

    expect(recu?.[0].patientId).toBeNull();
  });

  it('repond par POST /api/dawini/besoins/{id}/reponses avec { nomPharmacie, disponible, prixDa, commentaire }', () => {
    let recu: Reponse | undefined;
    const demande: DemandeReponse = { nomPharmacie: 'Pharmacie El Amel', disponible: true, prixDa: 850, commentaire: 'Disponible jusqu à 19 h.' };
    service.repondre('b1', demande).subscribe((r) => (recu = r));

    const requete = http.expectOne(`${BASE}/api/dawini/besoins/b1/reponses`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(demande);
    requete.flush(REPONSE, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(REPONSE);
  });

  it('transmet le { erreur } d un 409 (besoin cloture ou deja repondu)', () => {
    let statut = 0;
    let message = '';
    service.repondre('b1', { nomPharmacie: 'Pharmacie El Amel', disponible: false }).subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/dawini/besoins/b1/reponses`)
      .flush({ erreur: 'Cette pharmacie a deja repondu a ce besoin.' }, { status: 409, statusText: 'Conflict' });

    expect(statut).toBe(409);
    expect(message).toBe('Cette pharmacie a deja repondu a ce besoin.');
  });

  describe('formatage', () => {
    it('affiche un prix en dinars avec les milliers separes, rien sans prix', () => {
      expect(formaterPrix(850)).toBe('850 DA');
      expect(formaterPrix(1250)).toBe('1 250 DA');
      expect(formaterPrix(0)).toBe('0 DA');
      expect(formaterPrix(null)).toBe('');
      expect(formaterPrix(undefined)).toBe('');
    });

    it('traduit le statut d un besoin et accorde le nombre de reponses', () => {
      expect(libelleStatutBesoin('OUVERT')).toBe('Ouverte');
      expect(libelleStatutBesoin('CLOTURE')).toBe('Clôturée');
      expect(libelleStatutBesoin('ARCHIVE')).toBe('ARCHIVE');
      expect(libelleStatutBesoin(null)).toBe('');
      expect(libelleReponses(0)).toBe('0 réponse');
      expect(libelleReponses(1)).toBe('1 réponse');
      expect(libelleReponses(3)).toBe('3 réponses');
    });
  });
});
