import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DemandesAdminComponent } from './demandes-admin.component';
import { AuthService } from '../auth/auth.service';
import { DemandePraticien } from './admin.service';

const BASE = 'http://localhost:8080';
const D: DemandePraticien = {
  id: 'd1', nom: 'Dr Amina', specialite: 'Cardiologue', wilaya: 'Alger', ville: null, numeroOrdre: '123',
  telephone: '0550123456', email: 'a@b.dz', message: null, ficheId: null, statut: 'NOUVELLE',
  creeeLe: '2026-11-18T10:00:00Z', traiteeLe: null,
};

describe('DemandesAdminComponent', () => {
  let http: HttpTestingController;

  function creer() {
    TestBed.configureTestingModule({ imports: [DemandesAdminComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { seConnecter: () => undefined } }] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DemandesAdminComponent);
    fixture.detectChanges();
    http.expectOne(`${BASE}/api/admin/demandes-praticien?statut=NOUVELLE`).flush([D]);
    fixture.detectChanges();
    return fixture;
  }

  it('liste les demandes nouvelles', () => {
    const f = creer();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Dr Amina');
    expect((f.nativeElement as HTMLElement).textContent).toContain('Créer le compte');
  });

  it('crée le compte après confirmation puis recharge', () => {
    const f = creer();
    f.componentInstance.demander(D, 'creer-compte');
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.confirmation-demande')).not.toBeNull();
    f.componentInstance.confirmer(D);
    http.expectOne(`${BASE}/api/admin/demandes-praticien/d1/creer-compte`).flush({ ...D, statut: 'TRAITEE' });
    http.expectOne(`${BASE}/api/admin/demandes-praticien?statut=NOUVELLE`).flush([]);
    expect(f.componentInstance.succes()).toContain('créé');
  });

  it('affiche l erreur claire si l e-mail existe déjà (409)', () => {
    const f = creer();
    f.componentInstance.demander(D, 'creer-compte');
    f.componentInstance.confirmer(D);
    http.expectOne(`${BASE}/api/admin/demandes-praticien/d1/creer-compte`)
      .flush({ erreur: 'Un compte existe déjà avec cet e-mail.' }, { status: 409, statusText: 'Conflict' });
    http.expectOne(`${BASE}/api/admin/demandes-praticien?statut=NOUVELLE`).flush([D]);
    expect(f.componentInstance.erreur()).toContain('existe déjà');
  });
});
