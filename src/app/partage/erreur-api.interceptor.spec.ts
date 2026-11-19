import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { erreurApiInterceptor } from './erreur-api.interceptor';
import { LangueService } from './langue.service';

describe('erreurApiInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let langue: LangueService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([erreurApiInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    langue = TestBed.inject(LangueService);
    langue.ar.set(false);
  });

  function erreur(url: string, corps: object | null, init: { status: number; statusText: string }): HttpErrorResponse {
    let recu!: HttpErrorResponse;
    http.get(url).subscribe({ error: (e) => (recu = e) });
    ctrl.expectOne(url).flush(corps, init);
    return recu;
  }

  it('reseau coupe (statut 0) : message de connexion', () => {
    let recu!: HttpErrorResponse;
    http.get('/api/rdv').subscribe({ error: (e) => (recu = e) });
    ctrl.expectOne('/api/rdv').error(new ProgressEvent('error'), { status: 0 });
    expect(recu.error.erreur).toBe('Pas de connexion. Vérifiez votre réseau.');
  });

  it('429 : trop de demandes, meme avec un message technique du serveur', () => {
    const e = erreur('/api/x', { message: 'Rate limit' }, { status: 429, statusText: 'Too Many' });
    expect(e.status).toBe(429);
    expect(e.error.erreur).toBe('Trop de demandes, réessayez dans une minute.');
  });

  it('5xx : message serveur, jamais le texte technique', () => {
    const e = erreur('/api/x', { erreur: 'NullPointerException' }, { status: 503, statusText: 'KO' });
    expect(e.error.erreur).toBe('Le serveur rencontre un problème. Réessayez plus tard.');
  });

  it('arabe quand la langue est l’arabe', () => {
    langue.ar.set(true);
    const e = erreur('/api/x', null, { status: 500, statusText: 'KO' });
    expect(e.error.erreur).toBe('يواجه الخادم مشكلة. حاول لاحقًا.');
  });

  it('409 et 401 gardent le message de l’API', () => {
    expect(erreur('/api/a', { erreur: 'Créneau pris' }, { status: 409, statusText: 'C' }).error.erreur).toBe('Créneau pris');
    expect(erreur('/api/b', { erreur: 'Non' }, { status: 401, statusText: 'U' }).status).toBe(401);
  });

  describe('409 en arabe (comme traduireErreurServeur de l’appli)', () => {
    beforeEach(() => langue.ar.set(true));

    it('créneau pris, passé ou indisponible : texte arabe précis', () => {
      expect(erreur('/api/a', { erreur: 'Ce créneau vient d\'être pris.' }, { status: 409, statusText: 'C' }).error.erreur).toBe('هذا الموعد حُجز للتوّ.');
      expect(erreur('/api/b', { erreur: 'Ce créneau est déjà passé.' }, { status: 409, statusText: 'C' }).error.erreur).toBe('هذا الموعد قد مضى بالفعل.');
      expect(erreur('/api/c', { erreur: 'Créneau indisponible.' }, { status: 409, statusText: 'C' }).error.erreur).toBe('هذا الموعد لم يعد متاحًا.');
    });

    it('autre 409 : texte générique arabe, jamais le français', () => {
      expect(erreur('/api/d', { erreur: 'Avis déjà signalé.' }, { status: 409, statusText: 'C' }).error.erreur).toBe('تعذّر الإجراء: تغيّر الوضع في الأثناء');
    });

    it('409 sans message, 400 et message déjà en arabe : inchangés', () => {
      expect(erreur('/api/e', null, { status: 409, statusText: 'C' }).error).toBeNull();
      expect(erreur('/api/f', { erreur: 'Créneaux qui se chevauchent' }, { status: 400, statusText: 'B' }).error.erreur).toBe('Créneaux qui se chevauchent');
      expect(erreur('/api/g', { erreur: 'موعد' }, { status: 409, statusText: 'C' }).error.erreur).toBe('موعد');
    });
  });

  it('ne touche pas aux appels hors /api/', () => {
    const e = erreur('/assets/config.json', null, { status: 500, statusText: 'KO' });
    expect(e.error).toBeNull();
  });
});
