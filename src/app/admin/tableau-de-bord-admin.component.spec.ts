import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AdminService } from './admin.service';
import { TableauDeBordAdminComponent } from './tableau-de-bord-admin.component';

describe('TableauDeBordAdminComponent', () => {
  let fixture: ComponentFixture<TableauDeBordAdminComponent>;
  let service: jasmine.SpyObj<AdminService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminService>('AdminService', ['statistiques']);
    auth = { seConnecter: jasmine.createSpy('seConnecter') };
    TestBed.configureTestingModule({
      imports: [TableauDeBordAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: service },
        { provide: AuthService, useValue: auth },
      ],
    });
    fixture = TestBed.createComponent(TableauDeBordAdminComponent);
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  it('affiche les trois compteurs et le lien vers les candidatures', () => {
    service.statistiques.and.returnValue(of({ candidaturesEnAttente: 2, candidaturesValidees: 5, candidaturesRefusees: 1 }));
    fixture.detectChanges();

    const tuiles: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(tuiles.length).toBe(3);
    expect(tuiles[0].textContent).toContain('Candidatures en attente');
    expect(tuiles[0].querySelector('strong')?.textContent?.trim()).toBe('2');
    expect(tuiles[1].textContent).toContain('Candidatures validées');
    expect(tuiles[1].querySelector('strong')?.textContent?.trim()).toBe('5');
    expect(tuiles[2].textContent).toContain('Candidatures refusées');
    expect(tuiles[2].querySelector('strong')?.textContent?.trim()).toBe('1');
    expect(fixture.nativeElement.querySelector('a[href="/admin/candidatures"]')).not.toBeNull();
  });

  it('affiche zero dans chaque tuile quand il n y a aucune candidature', () => {
    service.statistiques.and.returnValue(of({ candidaturesEnAttente: 0, candidaturesValidees: 0, candidaturesRefusees: 0 }));
    fixture.detectChanges();

    const valeurs = Array.from(fixture.nativeElement.querySelectorAll('li strong')).map((e) => (e as HTMLElement).textContent?.trim());
    expect(valeurs).toEqual(['0', '0', '0']);
  });

  it("indique que la page est reservee a l'administrateur sur un 403", () => {
    service.statistiques.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    fixture.detectChanges();

    expect(texte()).toContain("Cette page est réservée à l'administrateur.");
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(0);
  });

  it('renvoie vers la connexion sur un 401', () => {
    service.statistiques.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    fixture.detectChanges();

    expect(auth.seConnecter).toHaveBeenCalled();
  });
});
