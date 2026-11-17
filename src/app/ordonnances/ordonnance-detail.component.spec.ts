import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { ProfilService } from '../moi/profil.service';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';
import { OrdonnanceDetailComponent } from './ordonnance-detail.component';

/** Detail d'ordonnance : meme message que l'appli quand l'ordonnance n'a aucun medicament. */
describe('OrdonnanceDetailComponent', () => {
  async function afficher(lignes: Ordonnance['lignes']) {
    const ordonnance = {
      id: 'o1', patientId: 'p1', medecinId: 'm1', emiseLe: '2026-12-04T09:00:00Z',
      statut: 'EMISE', codeVerification: 'AB12CD34', lignes,
    } as Ordonnance;
    const service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['parId']);
    service.parId.and.returnValue(of(ordonnance));
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of({ id: 'm1', nomComplet: 'Dr Test' } as any));
    const profils = jasmine.createSpyObj<ProfilService>('ProfilService', ['monProfil']);
    profils.monProfil.and.returnValue(of({ utilisateurId: 'p1', nomComplet: 'Test' } as any));
    TestBed.configureTestingModule({
      imports: [OrdonnanceDetailComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: OrdonnanceService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: ProfilService, useValue: profils },
        { provide: AuthService, useValue: { pret: async () => {}, estConnecte: () => true, seConnecter: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(OrdonnanceDetailComponent);
    fixture.componentInstance['charger']('o1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche « Aucun médicament sur cette ordonnance. » et pas de tableau vide', async () => {
    const el = await afficher([]);
    expect(el.textContent).toContain('Aucun médicament sur cette ordonnance.');
    expect(el.querySelector('table')).toBeNull();
  });

  it('affiche le tableau quand l\'ordonnance a des médicaments', async () => {
    const el = await afficher([{ medicament: 'Doliprane', posologie: '1 par jour', duree: '5 jours' }]);
    expect(el.textContent).not.toContain('Aucun médicament');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });
});
