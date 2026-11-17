import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OrdonnanceService } from './ordonnance.service';
import { VerifierOrdonnanceComponent } from './verifier-ordonnance.component';

describe('VerifierOrdonnanceComponent', () => {
  async function verifier(statut: string) {
    const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['verifier']);
    service.verifier.and.returnValue(of({ valide: true, emiseLe: '2026-01-18T10:00:00Z', statut }));
    TestBed.configureTestingModule({
      imports: [VerifierOrdonnanceComponent],
      providers: [provideRouter([]), { provide: OrdonnanceService, useValue: service }],
    });
    const fixture = TestBed.createComponent(VerifierOrdonnanceComponent);
    fixture.componentInstance.code = 'AB12CD34';
    fixture.componentInstance.verifier();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('une ordonnance expirée n\'est pas déclarée authentique et ne doit pas être délivrée', async () => {
    const texte = await verifier('EXPIREE');
    expect(texte).toContain('Expirée');
    expect(texte).toContain('ne doit pas être délivrée');
    expect(texte).not.toContain('Ordonnance authentique');
  });

  it('une ordonnance émise reste authentique', async () => {
    expect(await verifier('EMISE')).toContain('Ordonnance authentique');
  });
});
