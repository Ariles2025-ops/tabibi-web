import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { PraticienComponent } from './praticien.component';
import { AuthService } from '../auth/auth.service';

/**
 * Garde « aucune fausse promesse » : la page praticien ne doit pas annoncer ce qui n'existe pas encore
 * (rappels par SMS, WhatsApp, paiement en ligne). Les rappels sont des notifications dans l'espace Tabibi.
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
});
