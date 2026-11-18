import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OrdonnanceService } from './ordonnance.service';
import { VerifierOrdonnanceComponent } from './verifier-ordonnance.component';

describe('VerifierOrdonnanceComponent', () => {
  async function verifier(statut: string, valide = true) {
    const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['verifier']);
    service.verifier.and.returnValue(of({ valide, emiseLe: '2026-01-18T10:00:00Z', statut }));
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

  it('un code inconnu dit qu\'aucune ordonnance ne correspond, comme l\'appli', async () => {
    const texte = await verifier('', false);
    expect(texte).toContain('Code inconnu : aucune ordonnance ne correspond à ce code.');
    expect(texte).not.toContain('Ordonnance authentique');
  });

  it('version arabe (/ar/verifier) : messages en arabe, dir=rtl, lang=ar', async () => {
    const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['verifier']);
    service.verifier.and.returnValue(of({ valide: true, emiseLe: '2026-01-18T10:00:00Z', statut: 'EXPIREE' }));
    TestBed.configureTestingModule({
      imports: [VerifierOrdonnanceComponent],
      providers: [provideRouter([]), { provide: OrdonnanceService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { langue: 'ar' } }, queryParamMap: of({ get: () => null }) } }],
    });
    const fixture = TestBed.createComponent(VerifierOrdonnanceComponent);
    fixture.componentInstance.code = 'AB12CD34';
    fixture.componentInstance.verifier();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(el.textContent).toContain('منتهية الصلاحية');
    expect(el.textContent).not.toContain('Expirée');
  });
});
