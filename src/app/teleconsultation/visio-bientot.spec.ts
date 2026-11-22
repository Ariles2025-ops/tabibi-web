import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LangueService } from '../partage/langue.service';
import { VISIO_ACTIVE } from '../lancement';
import { routes } from '../app.routes';
import { VisioBientotComponent } from './visio-bientot.component';

/** Garde : tant que la visio n'est pas ouverte, ses pages affichent « Bientôt » (aucune fausse promesse). */
describe('Téléconsultation « Bientôt »', () => {
  it('les pages téléconsultation patient et médecin mènent au message « Bientôt »', async () => {
    expect(VISIO_ACTIVE).toBeFalse();
    const patient = routes.find((r) => r.path === 'teleconsultations');
    const medecin = routes.find((r) => r.path === 'medecin')?.children?.find((r) => r.path === 'teleconsultations');
    expect(await (patient?.loadComponent as () => Promise<unknown>)()).toBe(VisioBientotComponent);
    expect(await (medecin?.loadComponent as () => Promise<unknown>)()).toBe(VisioBientotComponent);
  });
});

describe('VisioBientotComponent : langue', () => {
  beforeEach(() => {
    localStorage.removeItem('tabibi.langue');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => localStorage.removeItem('tabibi.langue'));

  it('affiche « Bientôt » en français par défaut', () => {
    const f = TestBed.createComponent(VisioBientotComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.visio-badge')?.textContent).toContain('Bientôt');
    expect(el.querySelector('main')?.getAttribute('dir')).toBeNull();
  });

  it('affiche « قريبًا » en arabe, de droite à gauche, sans texte français', () => {
    TestBed.inject(LangueService).definir(true);
    const f = TestBed.createComponent(VisioBientotComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.visio-badge')?.textContent).toContain('قريبًا');
    expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(el.querySelector('.visio-texte')?.textContent).toContain('نداويك');
    expect(el.textContent).not.toContain('Téléconsultation');
  });
});
