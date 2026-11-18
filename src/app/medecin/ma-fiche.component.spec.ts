import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { MaFicheComponent } from './ma-fiche.component';
import { MedecinService } from './medecin.service';

describe('MaFicheComponent', () => {
  let fixture: ComponentFixture<MaFicheComponent>;
  let service: jasmine.SpyObj<MedecinService>;
  let router: { navigateByUrl: jasmine.Spy };

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue');
    service = jasmine.createSpyObj<MedecinService>('MedecinService', ['maFiche', 'enregistrerFiche']);
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
    TestBed.configureTestingModule({
      imports: [MaFicheComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MedecinService, useValue: service },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: { seConnecter: () => undefined } },
      ],
    });
  });

  function creer() {
    fixture = TestBed.createComponent(MaFicheComponent);
    fixture.detectChanges();
  }

  it('charge la fiche et l affiche', () => {
    service.maFiche.and.returnValue(of({ adresse: '12 rue Didouche', langues: ['fr', 'ar'] }));
    creer();
    const c = fixture.componentInstance;
    expect(c.adresse).toBe('12 rue Didouche');
    expect(c.choisies()).toEqual(['fr', 'ar']);
    expect(TestBed.inject(ApiDisponibleService).ficheMedecin()).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ma fiche');
  });

  it('reste cachee et renvoie vers l agenda sur un 404', () => {
    service.maFiche.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    creer();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/medecin/agenda');
    expect(TestBed.inject(ApiDisponibleService).ficheMedecin()).toBeFalse();
  });

  it('affiche une erreur avec Reessayer sur un 500, sans toucher au menu ni naviguer', () => {
    service.maFiche.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 500 })),
      of({ adresse: '12 rue Didouche' }),
    );
    TestBed.inject(ApiDisponibleService).ficheMedecin.set(true);
    creer();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Impossible de charger');
    expect(TestBed.inject(ApiDisponibleService).ficheMedecin()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.componentInstance.adresse).toBe('12 rue Didouche');
  });

  it('traite un 404 avec corps (medecin introuvable) comme une erreur recuperable', () => {
    service.maFiche.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Médecin introuvable' } })));
    creer();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Réessayer');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('refuse un telephone invalide puis enregistre une fiche valide', () => {
    service.maFiche.and.returnValue(of({}));
    service.enregistrerFiche.and.callFake((f) => of(f));
    creer();
    const c = fixture.componentInstance;
    c.telephone = '12';
    c.enregistrer();
    expect(service.enregistrerFiche).not.toHaveBeenCalled();
    expect(c.erreur()).toContain('invalide');
    c.telephone = '021 12 34 56';
    c.horaires = 'Dim–Jeu 9h–16h';
    c.basculer('ar');
    c.enregistrer();
    expect(service.enregistrerFiche).toHaveBeenCalledWith({
      adresse: '', telephoneCabinet: '021 12 34 56', horaires: 'Dim–Jeu 9h–16h', presentation: '', langues: ['ar'],
    });
    expect(c.succes()).toBeTrue();
  });

  it('affiche l erreur de validation de l API', () => {
    service.maFiche.and.returnValue(of({}));
    service.enregistrerFiche.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Adresse trop longue' } })));
    creer();
    fixture.componentInstance.enregistrer();
    expect(fixture.componentInstance.erreur()).toBe('Adresse trop longue');
  });
});
