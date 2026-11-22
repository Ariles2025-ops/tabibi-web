import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { LangueService } from '../partage/langue.service';
import { SemaineTypeComponent } from './semaine-type.component';
import { SemaineType } from './semaine-type';

describe('SemaineTypeComponent', () => {
  let fixture: ComponentFixture<SemaineTypeComponent>;
  let appel: jasmine.Spy;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue');
    appel = jasmine.createSpy('appel').and.returnValue(of({ crees: 12, ignores: 2 }));
    auth = { seConnecter: jasmine.createSpy('seConnecter') };
    TestBed.configureTestingModule({
      imports: [SemaineTypeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: auth }],
    });
    fixture = TestBed.createComponent(SemaineTypeComponent);
    fixture.componentRef.setInput('appel', appel);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('refuse un envoi sans jour coche', async () => {
    await afficher();
    fixture.componentInstance.aPartirDu = '2026-11-23';
    fixture.componentInstance.envoyer();
    expect(appel).not.toHaveBeenCalled();
    expect(fixture.componentInstance.erreur()).toContain('au moins un jour');
  });

  it('envoie le contrat attendu et affiche « n créneaux créés, m ignorés »', async () => {
    await afficher();
    const c = fixture.componentInstance;
    c.basculer('LUNDI');
    c.basculer('MERCREDI');
    c.aPartirDu = '2026-11-23';
    c.envoyer();
    const corps: SemaineType = appel.calls.mostRecent().args[0];
    expect(corps).toEqual({ jours: ['LUNDI', 'MERCREDI'], debut: '09:00', fin: '12:30', dureeMinutes: 20, aPartirDu: '2026-11-23', nombreSemaines: 4 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12 créneaux créés ; 2 ignorés (horaire déjà passé ou créneau déjà ouvert à ce moment).');
  });

  it('affiche le resultat en arabe quand la langue est l arabe', async () => {
    TestBed.inject(LangueService).ar.set(true);
    await afficher();
    fixture.componentInstance.basculer('LUNDI');
    fixture.componentInstance.aPartirDu = '2026-11-23';
    fixture.componentInstance.envoyer();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('تم إنشاء 12 موعدًا');
    expect(fixture.nativeElement.querySelector('form').getAttribute('dir')).toBe('rtl');
  });

  it('refuse plus de 8 semaines', async () => {
    await afficher();
    const c = fixture.componentInstance;
    c.basculer('LUNDI');
    c.aPartirDu = '2026-11-23';
    c.nombreSemaines = 9;
    c.envoyer();
    expect(appel).not.toHaveBeenCalled();
    expect(c.erreur()).toContain('8');
  });

  it('se masque sans erreur visible sur un 404', async () => {
    appel.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await afficher();
    const c = fixture.componentInstance;
    c.basculer('LUNDI');
    c.aPartirDu = '2026-11-23';
    c.envoyer();
    fixture.detectChanges();
    expect(TestBed.inject(ApiDisponibleService).semaineType()).toBeFalse();
    expect(c.erreur()).toBe('');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('affiche l erreur de l API sur un 400', async () => {
    appel.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Plage invalide' } })));
    await afficher();
    const c = fixture.componentInstance;
    c.basculer('LUNDI');
    c.aPartirDu = '2026-11-23';
    c.envoyer();
    expect(c.erreur()).toBe('Plage invalide');
  });
});
