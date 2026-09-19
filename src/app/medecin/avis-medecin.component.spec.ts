import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { AvisService, SyntheseAvis } from '../avis/avis.service';
import { Moi } from '../moi/moi.service';
import { AvisMedecinComponent } from './avis-medecin.component';

const MEDECIN_ID = '33333333-3333-3333-3333-333333333333';

const SYNTHESE: SyntheseAvis = {
  moyenne: 4.5,
  nombre: 2,
  avis: [
    { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
    { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
  ],
};

describe('AvisMedecinComponent', () => {
  let fixture: ComponentFixture<AvisMedecinComponent>;
  let service: jasmine.SpyObj<AvisService>;
  let profil: Moi | null;

  beforeEach(() => {
    registerLocaleData(localeFr);
    profil = { sujet: MEDECIN_ID, nom: 'medecin.demo', roles: ['MEDECIN'] };
    service = jasmine.createSpyObj<AvisService>('AvisService', ['synthese', 'signaler']);
    service.synthese.and.returnValue(of(SYNTHESE));

    TestBed.configureTestingModule({
      imports: [AvisMedecinComponent],
      providers: [
        { provide: AvisService, useValue: service },
        { provide: RoleService, useValue: { charger: () => Promise.resolve(profil) } },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(AvisMedecinComponent);
  });

  /** Lance ngOnInit (lecture du profil) puis rafraichit la vue. */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function boutonsSignaler(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  it('lit mes avis publics avec mon identifiant et propose « Signaler » sur chacun', async () => {
    await afficher();

    expect(service.synthese).toHaveBeenCalledWith(MEDECIN_ID);
    expect(texte()).toContain('4,5 / 5 (2 avis)');
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('5 / 5');
    expect(items[0].textContent).toContain('Très bon accueil.');
    expect(boutonsSignaler().length).toBe(2);
    expect(boutonsSignaler()[0].textContent).toContain('Signaler');
  });

  it('signale un avis, confirme et recharge la liste', async () => {
    service.signaler.and.returnValue(of({ id: 'a1', rendezVousId: 'r1', medecinId: MEDECIN_ID, note: 5, commentaire: 'Très bon accueil.', statut: 'SIGNALE', deposeLe: '2026-09-18T10:00:00Z' }));
    await afficher();

    boutonsSignaler()[0].click();
    await afficher();

    expect(service.signaler).toHaveBeenCalledWith('a1');
    expect(texte()).toContain('Avis signalé');
    expect(service.synthese).toHaveBeenCalledTimes(2);
  });

  it('affiche le motif { erreur } d un 409 (deja signale) et recharge', async () => {
    service.signaler.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Seul un avis publie peut etre signale.' } })),
    );
    await afficher();

    boutonsSignaler()[0].click();
    await afficher();

    expect(texte()).toContain('Seul un avis publie peut etre signale.');
    expect(service.synthese).toHaveBeenCalledTimes(2);
  });

  it('indique qu il n y a aucun avis et signale un profil illisible', async () => {
    service.synthese.and.returnValue(of({ moyenne: null, nombre: 0, avis: [] }));
    await afficher();
    expect(texte()).toContain('Aucun avis pour le moment');
    expect(boutonsSignaler().length).toBe(0);

    profil = null;
    fixture = TestBed.createComponent(AvisMedecinComponent);
    await afficher();
    expect(texte()).toContain('Impossible de lire votre profil');
    expect(service.synthese).toHaveBeenCalledTimes(1);
  });
});
