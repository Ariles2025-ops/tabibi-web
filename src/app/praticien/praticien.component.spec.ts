import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { PraticienComponent } from './praticien.component';
import { AuthService } from '../auth/auth.service';

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
