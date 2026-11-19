import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LangueService } from '../partage/langue.service';
import { CompteIndisponibleComponent } from './compte-indisponible.component';

describe('CompteIndisponibleComponent', () => {
  beforeEach(() => {
    localStorage.removeItem('tabibi.langue');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => localStorage.removeItem('tabibi.langue'));

  it('affiche le message en français par défaut', () => {
    const f = TestBed.createComponent(CompteIndisponibleComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Impossible de vérifier votre compte');
    expect(f.nativeElement.textContent).toContain('Réessayer');
  });

  it('affiche le message en arabe (RTL) quand la langue choisie est l’arabe', () => {
    TestBed.inject(LangueService).definir(true);
    const f = TestBed.createComponent(CompteIndisponibleComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(el.textContent).toContain('تعذّر التحقق من حسابك');
    expect(el.textContent).toContain('إعادة المحاولة');
    expect(el.textContent).not.toContain('Réessayer');
  });
});
