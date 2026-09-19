import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigService } from '../config/config.service';
import { Moi, MoiService } from './moi.service';

const PROFIL: Moi = { sujet: 'u1', nom: 'demo', roles: ['PATIENT'] };

/** Les services construisent leurs URL sur ConfigService.apiUrl (assets/config.json), plus sur une origine codee en dur. */
describe('MoiService', () => {
  let http: HttpTestingController;

  function configurer(apiUrl?: string): MoiService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(apiUrl === undefined ? [] : [{ provide: ConfigService, useValue: { apiUrl } }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(MoiService);
  }

  afterEach(() => http.verify());

  it('appelle GET /api/moi sur l origine de la configuration', () => {
    const service = configurer('https://api.tabibi.dz');
    let recu: Moi | undefined;
    service.moi().subscribe((m) => (recu = m));

    const requete = http.expectOne('https://api.tabibi.dz/api/moi');
    expect(requete.request.method).toBe('GET');
    requete.flush(PROFIL);

    expect(recu).toEqual(PROFIL);
  });

  it('utilise l origine localhost par defaut tant que la configuration n est pas chargee', () => {
    const service = configurer();
    service.moi().subscribe();

    http.expectOne('http://localhost:8080/api/moi').flush(PROFIL);
  });
});
