import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { RdvTelephoneComponent } from './rdv-telephone.component';

describe('RdvTelephoneComponent', () => {
  let fixture: ComponentFixture<RdvTelephoneComponent>;
  let appel: jasmine.Spy;

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue');
    appel = jasmine.createSpy('appel').and.returnValue(of({ id: 'r1' }));
    TestBed.configureTestingModule({
      imports: [RdvTelephoneComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { seConnecter: () => undefined } }],
    });
    fixture = TestBed.createComponent(RdvTelephoneComponent);
    fixture.componentRef.setInput('creneauId', 'c1');
    fixture.componentRef.setInput('appel', appel);
    fixture.detectChanges();
  });

  it('exige un nom et un telephone algerien valide', () => {
    const c = fixture.componentInstance;
    c.envoyer();
    expect(appel).not.toHaveBeenCalled();
    c.nom = 'Amine B.';
    c.telephone = '123';
    c.envoyer();
    expect(appel).not.toHaveBeenCalled();
    expect(c.erreur()).toContain('numéro');
  });

  it('envoie nom, telephone et motif, sans motif vide', () => {
    const c = fixture.componentInstance;
    const fait = jasmine.createSpy('fait');
    c.fait.subscribe(fait);
    c.nom = ' Amine B. ';
    c.telephone = '0550 12 34 56';
    c.envoyer();
    expect(appel).toHaveBeenCalledWith({ creneauId: 'c1', nomPatient: 'Amine B.', telephonePatient: '0550 12 34 56' });
    expect(fait).toHaveBeenCalled();
    c.motif = 'Contrôle';
    c.envoyer();
    expect(appel.calls.mostRecent().args[0].motif).toBe('Contrôle');
  });

  it('signale un creneau deja pris (409)', () => {
    appel.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Créneau déjà réservé' } })));
    const c = fixture.componentInstance;
    c.nom = 'Amine';
    c.telephone = '0550123456';
    c.envoyer();
    expect(c.erreur()).toBe('Créneau déjà réservé');
  });

  it('se masque sans erreur sur un 404', () => {
    appel.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const c = fixture.componentInstance;
    c.nom = 'Amine';
    c.telephone = '0550123456';
    c.envoyer();
    fixture.detectChanges();
    expect(TestBed.inject(ApiDisponibleService).rdvTelephone()).toBeFalse();
    expect(c.erreur()).toBe('');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('un 404 avec { erreur } (creneau disparu) emet le message sans masquer le bouton', () => {
    appel.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Ce créneau n’existe plus' } })));
    const c = fixture.componentInstance;
    const disparu = jasmine.createSpy('disparu');
    c.disparu.subscribe(disparu);
    c.nom = 'Amine';
    c.telephone = '0550123456';
    c.envoyer();
    expect(disparu).toHaveBeenCalledWith('Ce créneau n’existe plus');
    expect(TestBed.inject(ApiDisponibleService).rdvTelephone()).toBeTrue();
  });

  it('un 409 avec { erreur } (creneau pris) emet disparu pour recharger la liste', () => {
    appel.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Ce créneau vient d’être pris.' } })));
    const c = fixture.componentInstance;
    const disparu = jasmine.createSpy('disparu');
    c.disparu.subscribe(disparu);
    c.nom = 'Amine';
    c.telephone = '0550123456';
    c.envoyer();
    expect(disparu).toHaveBeenCalledWith('Ce créneau vient d’être pris.');
  });
});
