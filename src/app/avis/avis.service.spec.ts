import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Avis, AvisAdmin, AvisService, SyntheseAvis, formaterMoyenne, libelleStatutAvis } from './avis.service';

const BASE = 'http://localhost:8080';

const AVIS: Avis = {
  id: 'a1',
  rendezVousId: 'r1',
  medecinId: 'm1',
  note: 5,
  commentaire: 'Très bon accueil.',
  statut: 'PUBLIE',
  deposeLe: '2026-09-18T10:00:00Z',
};

const AVIS_ADMIN: AvisAdmin = { ...AVIS, patientId: 'p1', statut: 'SIGNALE' };

const SYNTHESE: SyntheseAvis = {
  moyenne: 4.5,
  nombre: 2,
  avis: [
    { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
    { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
  ],
};

describe('AvisService', () => {
  let service: AvisService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AvisService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('depose un avis par POST /api/avis avec { rendezVousId, note, commentaire }', () => {
    let recu: Avis | undefined;
    service.deposer('r1', 5, 'Très bon accueil.').subscribe((a) => (recu = a));

    const requete = http.expectOne(`${BASE}/api/avis`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ rendezVousId: 'r1', note: 5, commentaire: 'Très bon accueil.' });
    requete.flush(AVIS, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(AVIS);
  });

  it('envoie un commentaire null quand il n est pas renseigne', () => {
    service.deposer('r1', 4).subscribe();

    const requete = http.expectOne(`${BASE}/api/avis`);
    expect(requete.request.body).toEqual({ rendezVousId: 'r1', note: 4, commentaire: null });
    requete.flush({ ...AVIS, note: 4, commentaire: null }, { status: 201, statusText: 'Created' });
  });

  it('lit mes avis sur GET /api/avis/mes', () => {
    let recu: Avis[] | undefined;
    service.mes().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/avis/mes`);
    expect(requete.request.method).toBe('GET');
    requete.flush([AVIS]);

    expect(recu).toEqual([AVIS]);
  });

  it('lit la synthese publique sur GET /api/medecins/{id}/avis', () => {
    let recu: SyntheseAvis | undefined;
    service.synthese('m1').subscribe((s) => (recu = s));

    const requete = http.expectOne(`${BASE}/api/medecins/m1/avis`);
    expect(requete.request.method).toBe('GET');
    requete.flush(SYNTHESE);

    expect(recu).toEqual(SYNTHESE);
  });

  it('signale par POST /api/avis/{id}/signaler sans corps', () => {
    let recu: Avis | undefined;
    service.signaler('a1').subscribe((a) => (recu = a));

    const requete = http.expectOne(`${BASE}/api/avis/a1/signaler`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush({ ...AVIS, statut: 'SIGNALE' });

    expect(recu?.statut).toBe('SIGNALE');
  });

  it('liste les avis a moderer sur GET /api/admin/avis?statut=, sans parametre si aucun statut', () => {
    let recu: AvisAdmin[] | undefined;
    service.pourModeration('SIGNALE').subscribe((liste) => (recu = liste));
    const filtree = http.expectOne(`${BASE}/api/admin/avis?statut=SIGNALE`);
    expect(filtree.request.method).toBe('GET');
    filtree.flush([AVIS_ADMIN]);
    expect(recu).toEqual([AVIS_ADMIN]);

    service.pourModeration().subscribe();
    const toutes = http.expectOne(`${BASE}/api/admin/avis`);
    expect(toutes.request.params.keys()).toEqual([]);
    toutes.flush([]);
  });

  it('masque et retablit par POST /api/admin/avis/{id}/... sans corps', () => {
    service.masquer('a1').subscribe();
    const masquer = http.expectOne(`${BASE}/api/admin/avis/a1/masquer`);
    expect(masquer.request.method).toBe('POST');
    expect(masquer.request.body).toBeNull();
    masquer.flush({ ...AVIS_ADMIN, statut: 'MASQUE' });

    service.retablir('a1').subscribe();
    const retablir = http.expectOne(`${BASE}/api/admin/avis/a1/retablir`);
    expect(retablir.request.method).toBe('POST');
    expect(retablir.request.body).toBeNull();
    retablir.flush({ ...AVIS_ADMIN, statut: 'PUBLIE' });
  });

  it('transmet le { erreur } d un 409 (avis deja donne)', () => {
    let statut = 0;
    let message = '';
    service.deposer('r1', 5).subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });

    http.expectOne(`${BASE}/api/avis`)
      .flush({ erreur: 'Un avis a deja ete depose pour ce rendez-vous.' }, { status: 409, statusText: 'Conflict' });

    expect(statut).toBe(409);
    expect(message).toBe('Un avis a deja ete depose pour ce rendez-vous.');
  });

  describe('formaterMoyenne', () => {
    it('affiche la moyenne avec une virgule, sur 5, et le nombre d avis', () => {
      expect(formaterMoyenne(4.5, 12)).toBe('4,5 / 5 (12 avis)');
      expect(formaterMoyenne(5, 1)).toBe('5,0 / 5 (1 avis)');
      expect(formaterMoyenne(3.75, 4)).toBe('3,8 / 5 (4 avis)');
    });

    it('indique qu il n y a aucun avis quand la moyenne est absente', () => {
      expect(formaterMoyenne(null, 0)).toBe('Aucun avis pour le moment');
      expect(formaterMoyenne(4, 0)).toBe('Aucun avis pour le moment');
    });
  });

  describe('libelleStatutAvis', () => {
    it('traduit les statuts connus et affiche tel quel un statut inconnu', () => {
      expect(libelleStatutAvis('PUBLIE')).toBe('Publié');
      expect(libelleStatutAvis('SIGNALE')).toBe('Signalé');
      expect(libelleStatutAvis('MASQUE')).toBe('Masqué');
      expect(libelleStatutAvis('ARCHIVE')).toBe('ARCHIVE');
      expect(libelleStatutAvis(null)).toBe('');
    });
  });
});
