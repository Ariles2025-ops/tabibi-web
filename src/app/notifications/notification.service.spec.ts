import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Notification, NotificationService } from './notification.service';

const BASE = 'http://localhost:8080';

const NOTIFICATION: Notification = {
  id: 'n1',
  destinataireId: 'u1',
  canal: 'INTERNE',
  sujet: 'Rendez-vous confirme',
  message: 'Votre rendez-vous du 07/12/2026 a 10:00 est confirme.',
  lue: false,
  creeLe: '2026-09-18T10:00:00Z',
};

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit mes notifications sur GET /api/notifications/mes', () => {
    let recu: Notification[] | undefined;
    service.mesNotifications().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/notifications/mes`);
    expect(requete.request.method).toBe('GET');
    requete.flush([NOTIFICATION]);

    expect(recu).toEqual([NOTIFICATION]);
  });

  it('lit le nombre de non lues sur GET /api/notifications/non-lues/nombre et renvoie le nombre', () => {
    let recu: number | undefined;
    service.nombreNonLues().subscribe((n) => (recu = n));

    const requete = http.expectOne(`${BASE}/api/notifications/non-lues/nombre`);
    expect(requete.request.method).toBe('GET');
    requete.flush({ nombre: 3 });

    expect(recu).toBe(3);
  });

  it('marque une notification lue par POST /api/notifications/{id}/lue sans corps', () => {
    let recu: Notification | undefined;
    service.marquerLue('n1').subscribe((n) => (recu = n));

    const requete = http.expectOne(`${BASE}/api/notifications/n1/lue`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush({ ...NOTIFICATION, lue: true });

    expect(recu?.lue).toBeTrue();
  });

  it('marque tout lu par POST /api/notifications/toutes-lues et renvoie le nombre', () => {
    let recu: number | undefined;
    service.toutMarquerLu().subscribe((n) => (recu = n));

    const requete = http.expectOne(`${BASE}/api/notifications/toutes-lues`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toBeNull();
    requete.flush({ nombre: 2 });

    expect(recu).toBe(2);
  });

  it('signale un changement apres chaque marquage lu reussi, pas en cas d echec', () => {
    let signaux = 0;
    service.changements$.subscribe(() => signaux++);

    service.marquerLue('n1').subscribe();
    http.expectOne(`${BASE}/api/notifications/n1/lue`).flush({ ...NOTIFICATION, lue: true });
    expect(signaux).toBe(1);

    service.toutMarquerLu().subscribe();
    http.expectOne(`${BASE}/api/notifications/toutes-lues`).flush({ nombre: 0 });
    expect(signaux).toBe(2);

    service.marquerLue('inconnue').subscribe({ error: () => undefined });
    http.expectOne(`${BASE}/api/notifications/inconnue/lue`).flush({ erreur: 'Notification introuvable.' }, { status: 404, statusText: 'Not Found' });
    expect(signaux).toBe(2);
  });
});
