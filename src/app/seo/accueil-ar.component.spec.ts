import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccueilArComponent } from './accueil-ar.component';

/** Garde : la recherche de l'accueil arabe mene aux pages ARABES de l'annuaire, et la page est en arabe (RTL). */
describe('AccueilArComponent', () => {
  it('mene a la bonne page arabe selon la specialite et la wilaya choisies', () => {
    TestBed.configureTestingModule({ imports: [AccueilArComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AccueilArComponent);
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.specialite = 'cardiologue'; c.wilaya = 'oran'; c.rechercher();
    expect(nav).toHaveBeenCalledWith(['/ar/specialites', 'cardiologue', 'oran']);
    c.specialite = ''; c.wilaya = 'alger'; c.rechercher();
    expect(nav).toHaveBeenCalledWith(['/ar/wilayas', 'alger']);

    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;
    expect(main.getAttribute('dir')).toBe('rtl');
    expect(main.textContent).toContain('احجز موعدك');
  });
});
