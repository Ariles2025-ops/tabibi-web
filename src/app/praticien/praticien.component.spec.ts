import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { PraticienComponent } from './praticien.component';
import { AuthService } from '../auth/auth.service';

describe('PraticienComponent (envoi de la demande)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<PraticienComponent>;
  let comp: PraticienComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PraticienComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => false, sInscrireParEmail: () => undefined } }] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PraticienComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
    Object.assign(comp, { nom: 'Dr A', specialite: 'Cardiologue', wilaya: 'Alger', numeroOrdre: '123', telephone: '0550123456', email: 'a@b.dz', ficheChoisie: 'f1' });
  });

  it('exige l e-mail', () => {
    comp.email = '';
    comp.envoyer();
    http.expectNone((r) => r.url.includes('demandes-praticien'));
    expect(comp.erreur()).toBeTruthy();
  });

  it('envoie au serveur (ficheId, champ piege vide), sans double envoi, puis confirme', () => {
    comp.envoyer();
    comp.envoyer();
    const req = http.expectOne((r) => r.url.endsWith('/api/public/demandes-praticien'));
    expect(req.request.body.ficheId).toBe('f1');
    expect(req.request.body.siteWeb).toBe('');
    req.flush({ message: 'Demande reçue.' });
    fixture.detectChanges();
    expect(comp.envoye()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('nous vous recontactons sous 48 h');
  });

  it('echec : message d erreur et proposition du mailto en secours', () => {
    comp.envoyer();
    http.expectOne((r) => r.url.endsWith('/api/public/demandes-praticien')).flush({}, { status: 500, statusText: 'KO' });
    fixture.detectChanges();
    expect(comp.envoye()).toBeFalse();
    expect(comp.enCours()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('.prat-mailto')).not.toBeNull();
  });
});

/**
 * Garde « aucune fausse promesse » : la page praticien ne doit pas annoncer ce qui n'existe pas encore
 * (rappels par SMS, WhatsApp, paiement en ligne). Les rappels sont des notifications dans l'espace Ndawik.
 */
describe('PraticienComponent (promesses)', () => {
  it('n annonce ni SMS, ni WhatsApp, ni paiement en ligne', () => {
    TestBed.configureTestingModule({ imports: [PraticienComponent], providers: [provideRouter([]), provideHttpClient(),
      { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => false, sInscrireParEmail: () => undefined } }] });
    const fixture = TestBed.createComponent(PraticienComponent);
    fixture.detectChanges();
    const texte = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(texte).not.toMatch(/SMS/);
    expect(texte).not.toMatch(/WhatsApp/i);
    expect(texte).not.toMatch(/paiement en ligne|payer en ligne/i);
  });

  it('version arabe (data.langue = ar) : textes arabes, dir=rtl, sans français visible', () => {
    TestBed.configureTestingModule({ imports: [PraticienComponent], providers: [provideRouter([]), provideHttpClient(),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { langue: 'ar' } } } },
      { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => false, sInscrireParEmail: () => undefined } }] });
    const fixture = TestBed.createComponent(PraticienComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    const texte = el.textContent || '';
    expect(texte).toContain('فضاء الممارس');
    expect(texte).toContain('إرسال طلبي');
    expect(texte).not.toContain('Envoyer ma demande');
    expect(texte).not.toContain('Tabibi');
  });
});
