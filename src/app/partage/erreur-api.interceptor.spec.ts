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

  it('400 en français : inchangé quand la langue est le français', () => {
    expect(erreur('/api/k', { erreur: 'Données invalides' }, { status: 400, statusText: 'B' }).error.erreur).toBe('Données invalides');
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

    it('rendez-vous à venir : même texte arabe avec ou sans accent, comme l’appli', () => {
      const attendu = 'لديك بالفعل موعد قادم مع هذا الطبيب: ألغِه لاختيار موعد آخر.';
      expect(erreur('/api/h', { erreur: 'Vous avez déjà un rendez-vous à venir avec ce médecin.' }, { status: 409, statusText: 'C' }).error.erreur).toBe(attendu);
      expect(erreur('/api/i', { erreur: 'Vous avez deja un rendez-vous a venir avec ce medecin.' }, { status: 409, statusText: 'C' }).error.erreur).toBe(attendu);
    });

    it('409 du cabinet : créneau réservé à annuler, créneau déjà ouvert, rendez-vous par téléphone (comme l’appli)', () => {
      const e409 = (url: string, texte: string) => erreur(url, { erreur: texte }, { status: 409, statusText: 'C' }).error.erreur;
      expect(e409('/api/k', 'Ce créneau est réservé : annulez d\'abord le rendez-vous.')).toBe('هذا الموعد محجوز: ألغِ الحجز أولًا.');
      expect(e409('/api/l', 'Un créneau existe déjà à cette heure-là.')).toBe('يوجد موعد في هذا الوقت بالفعل.');
      expect(e409('/api/m', 'Un créneau existe déjà sur cet horaire.')).toBe('يوجد موعد في هذا الوقت بالفعل.');
      expect(e409('/api/n', 'Ce rendez-vous a été pris par téléphone : le patient n\'a pas de compte.')).toBe('هذا الموعد حُجز عبر الهاتف: ليس للمريض حساب.');
    });

    it('autre 409 : texte générique arabe, jamais le français', () => {
      expect(erreur('/api/d', { erreur: 'Avis déjà signalé.' }, { status: 409, statusText: 'C' }).error.erreur).toBe('تعذّر الإجراء: تغيّر الوضع في الأثناء');
    });

    it('400 et 403 en français : message retiré (repli arabe de l’écran), 404 : texte arabe générique', () => {
      expect(erreur('/api/f', { erreur: 'Aucun compte Ndawik n\'utilise cette adresse e-mail.' }, { status: 400, statusText: 'B' }).error.erreur).toBeUndefined();
      expect(erreur('/api/h', { erreur: 'Accès refusé' }, { status: 403, statusText: 'F' }).error.erreur).toBeUndefined();
      expect(erreur('/api/i', { erreur: 'Introuvable' }, { status: 404, statusText: 'N' }).error.erreur).toBe('العنصر المطلوب غير موجود.');
    });

    it('400 « chevauche » : texte d’origine conservé pour que la série de créneaux ignore le créneau existant', () => {
      expect(erreur('/api/c', { erreur: 'Créneaux qui se chevauchent' }, { status: 400, statusText: 'B' }).error.erreur).toBe('Créneaux qui se chevauchent');
    });

    it('409 sans message et message déjà en arabe : inchangés', () => {
      expect(erreur('/api/e', null, { status: 409, statusText: 'C' }).error).toBeNull();
      expect(erreur('/api/j', { erreur: 'موعد' }, { status: 400, statusText: 'B' }).error.erreur).toBe('موعد');
      expect(erreur('/api/g', { erreur: 'موعد' }, { status: 409, statusText: 'C' }).error.erreur).toBe('موعد');
    });
  });

  it('ne touche pas aux appels hors /api/', () => {
    const e = erreur('/assets/config.json', null, { status: 500, statusText: 'KO' });
    expect(e.error).toBeNull();
  });
});
