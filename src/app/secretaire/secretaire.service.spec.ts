import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Creneau } from '../annuaire/annuaire.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { DUREE_MAX_MINUTES, DUREE_MIN_MINUTES, Rattachement, SecretaireService, estUuid } from './secretaire.service';

const BASE = 'http://localhost:8080';

const RATTACHEMENT: Rattachement = { id: 'ra1', medecinId: 'm1', secretaireId: 's1', creeLe: '2026-09-18T10:00:00Z' };

const CONFIRME: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };

const CRENEAU: Creneau = { id: 'c2', medecinId: 'm1', debut: '2026-12-08T09:00:00Z', dureeMinutes: 30, disponible: true };

describe('SecretaireService', () => {
  let service: SecretaireService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SecretaireService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit mes cabinets sur GET /api/secretaire/medecins', () => {
    let recu: Rattachement[] | undefined;
    service.mesMedecins().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/secretaire/medecins`);
    expect(requete.request.method).toBe('GET');
    requete.flush([RATTACHEMENT]);

    expect(recu).toEqual([RATTACHEMENT]);
  });

  it('lit l agenda d un medecin sur GET /api/secretaire/medecins/{medecinId}/rendezvous', () => {
    let recu: RendezVous[] | undefined;
    service.agenda('m1').subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/secretaire/medecins/m1/rendezvous`);
    expect(requete.request.method).toBe('GET');
    requete.flush([CONFIRME]);

    expect(recu).toEqual([CONFIRME]);
  });

  it('ouvre un creneau par POST /api/secretaire/medecins/{medecinId}/creneaux avec { debut, dureeMinutes }', () => {
    let recu: Creneau | undefined;
    service.ouvrirCreneau('m1', '2026-12-08T09:00:00.000Z', 30).subscribe((c) => (recu = c));

    const requete = http.expectOne(`${BASE}/api/secretaire/medecins/m1/creneaux`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ debut: '2026-12-08T09:00:00.000Z', dureeMinutes: 30 });
    requete.flush(CRENEAU, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(CRENEAU);
  });

  it('honore et annule par POST /api/secretaire/rendezvous/{id}/honorer | annuler sans corps', () => {
    let honore: RendezVous | undefined;
    service.honorer('r1').subscribe((r) => (honore = r));
    const requeteHonorer = http.expectOne(`${BASE}/api/secretaire/rendezvous/r1/honorer`);
    expect(requeteHonorer.request.method).toBe('POST');
    expect(requeteHonorer.request.body).toBeNull();
    requeteHonorer.flush({ ...CONFIRME, statut: 'HONORE' });
    expect(honore?.statut).toBe('HONORE');

    let annule: RendezVous | undefined;
    service.annuler('r1').subscribe((r) => (annule = r));
    const requeteAnnuler = http.expectOne(`${BASE}/api/secretaire/rendezvous/r1/annuler`);
    expect(requeteAnnuler.request.method).toBe('POST');
    expect(requeteAnnuler.request.body).toBeNull();
    requeteAnnuler.flush({ ...CONFIRME, statut: 'ANNULE' });
    expect(annule?.statut).toBe('ANNULE');
  });

  it('transmet le { erreur } d un 403 (cabinet non rattache) et d un 409 (rendez-vous non confirme)', () => {
    let statuts: number[] = [];
    let messages: string[] = [];
    const collecter = { error: (e: { status: number; error: { erreur: string } }) => { statuts.push(e.status); messages.push(e.error.erreur); } };

    service.agenda('m9').subscribe(collecter);
    http.expectOne(`${BASE}/api/secretaire/medecins/m9/rendezvous`)
      .flush({ erreur: 'Cette secretaire n est pas rattachee a ce medecin.' }, { status: 403, statusText: 'Forbidden' });

    service.honorer('r1').subscribe(collecter);
    http.expectOne(`${BASE}/api/secretaire/rendezvous/r1/honorer`)
      .flush({ erreur: 'Seul un rendez-vous confirme peut etre honore.' }, { status: 409, statusText: 'Conflict' });

    expect(statuts).toEqual([403, 409]);
    expect(messages).toEqual(['Cette secretaire n est pas rattachee a ce medecin.', 'Seul un rendez-vous confirme peut etre honore.']);
  });

  it('reconnait un identifiant Keycloak (UUID) et expose les bornes de duree du backend', () => {
    expect(estUuid('55555555-5555-5555-5555-555555555555')).toBeTrue();
    expect(estUuid('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBeTrue();
    expect(estUuid('secretaire.demo')).toBeFalse();
    expect(estUuid('55555555-5555-5555-5555')).toBeFalse();
    expect(estUuid('')).toBeFalse();
    expect(DUREE_MIN_MINUTES).toBe(5);
    expect(DUREE_MAX_MINUTES).toBe(120);
  });
});
