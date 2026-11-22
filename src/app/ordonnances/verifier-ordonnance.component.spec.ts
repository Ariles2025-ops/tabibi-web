import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OrdonnanceService } from './ordonnance.service';
import { VerifierOrdonnanceComponent } from './verifier-ordonnance.component';

describe('VerifierOrdonnanceComponent', () => {
  async function verifier(statut: string, valide = true, emiseLe: string | null = '2026-01-18T10:00:00Z', delivreeLe: string | null = null) {
    const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['verifier']);
    service.verifier.and.returnValue(of({ valide, emiseLe, statut, delivreeLe }));
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

  it('une date d\'émission absente ou illisible ne laisse ni « émise le » vide ni erreur, comme l\'appli', async () => {
    for (const emiseLe of [null, 'pas-une-date']) {
      TestBed.resetTestingModule();
      const texte = await verifier('EMISE', true, emiseLe);
      expect(texte).toContain('Ordonnance authentique');
      expect(texte).not.toContain('émise le');
    }
  });

  it('une date de délivrance illisible dit seulement « Déjà délivrée »', async () => {
    const texte = await verifier('DELIVREE', true, '2026-01-18T10:00:00Z', 'pas-une-date');
    expect(texte).toContain('Déjà délivrée : cette ordonnance');
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

  it('version arabe : « صرف » (comme l\'appli et l\'espace pharmacie), jamais « تسليم »', async () => {
    for (const statut of ['DELIVREE', 'ANNULEE', 'EXPIREE']) {
      TestBed.resetTestingModule();
      const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['verifier']);
      service.verifier.and.returnValue(of({ valide: true, emiseLe: '2026-01-18T10:00:00Z', statut, delivreeLe: '2026-01-20T10:00:00Z' }));
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
      const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texte).toContain('لا تصرفها');
      expect(texte).not.toMatch(/تسليم|سُلّمت/);
    }
  });
});
