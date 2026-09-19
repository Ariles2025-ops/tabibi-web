import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AvisAdmin, AvisService } from '../avis/avis.service';
import { ModerationAvisComponent } from './moderation-avis.component';

const SIGNALE: AvisAdmin = {
  id: 'a1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  note: 1,
  commentaire: 'Commentaire déplacé.',
  statut: 'SIGNALE',
  deposeLe: '2026-09-18T10:00:00Z',
};

const MASQUE: AvisAdmin = { ...SIGNALE, id: 'a2', statut: 'MASQUE', commentaire: null };
const PUBLIE: AvisAdmin = { ...SIGNALE, id: 'a3', statut: 'PUBLIE', note: 5, commentaire: 'Très bon accueil.' };

describe('ModerationAvisComponent', () => {
  let fixture: ComponentFixture<ModerationAvisComponent>;
  let service: jasmine.SpyObj<AvisService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<AvisService>('AvisService', ['pourModeration', 'masquer', 'retablir']);
    service.pourModeration.and.returnValue(of([SIGNALE]));

    TestBed.configureTestingModule({
      imports: [ModerationAvisComponent],
      providers: [
        provideRouter([]),
        { provide: AvisService, useValue: service },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(ModerationAvisComponent);
  });

  /** Premier rendu puis stabilisation des ngModel (asynchrones). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim() === libelle);
  }

  async function filtrer(valeur: string) {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = valeur;
    select.dispatchEvent(new Event('change'));
    await afficher();
  }

  it('liste par defaut les avis signales, avec « Masquer » et « Rétablir »', async () => {
    await afficher();

    expect(service.pourModeration).toHaveBeenCalledWith('SIGNALE');
    expect(texte()).toContain('1 / 5');
    expect(texte()).toContain('Signalé');
    expect(texte()).toContain('Commentaire déplacé.');
    expect(texte()).toContain('18 septembre 2026');
    expect(texte()).toContain('Médecin m1 · Patient p1 · Rendez-vous r1');
    expect(bouton('Masquer')).toBeDefined();
    expect(bouton('Rétablir')).toBeDefined();
  });

  it('ne propose que « Rétablir » sur un avis masque et que « Masquer » sur un avis publie', async () => {
    service.pourModeration.and.returnValue(of([MASQUE]));
    await afficher();
    await filtrer('MASQUE');
    expect(service.pourModeration).toHaveBeenCalledWith('MASQUE');
    expect(texte()).toContain('Sans commentaire.');
    expect(bouton('Masquer')).toBeUndefined();
    expect(bouton('Rétablir')).toBeDefined();

    service.pourModeration.and.returnValue(of([PUBLIE]));
    await filtrer('PUBLIE');
    expect(bouton('Masquer')).toBeDefined();
    expect(bouton('Rétablir')).toBeUndefined();
  });

  it('« Tous » appelle l API sans statut', async () => {
    await afficher();
    await filtrer('');

    expect(service.pourModeration).toHaveBeenCalledWith(undefined);
  });

  it('masque un avis, confirme et recharge la liste', async () => {
    service.masquer.and.returnValue(of({ ...SIGNALE, statut: 'MASQUE' }));
    await afficher();

    bouton('Masquer')!.click();
    await afficher();

    expect(service.masquer).toHaveBeenCalledWith('a1');
    expect(texte()).toContain('Avis masqué');
    expect(service.pourModeration).toHaveBeenCalledTimes(2);
  });

  it('retablit un avis, confirme et recharge la liste', async () => {
    service.retablir.and.returnValue(of({ ...SIGNALE, statut: 'PUBLIE' }));
    await afficher();

    bouton('Rétablir')!.click();
    await afficher();

    expect(service.retablir).toHaveBeenCalledWith('a1');
    expect(texte()).toContain('Avis rétabli');
    expect(service.pourModeration).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 409 (deja traite) et recharge', async () => {
    service.masquer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Cet avis est deja masque.' } })),
    );
    await afficher();

    bouton('Masquer')!.click();
    await afficher();

    expect(texte()).toContain('Cet avis est deja masque.');
    expect(service.pourModeration).toHaveBeenCalledTimes(2);
  });

  it('affiche un message quand aucun avis ne correspond au filtre et signale un 403', async () => {
    service.pourModeration.and.returnValue(of([]));
    await afficher();
    expect(texte()).toContain('Aucun avis pour ce filtre.');

    service.pourModeration.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    fixture = TestBed.createComponent(ModerationAvisComponent);
    await afficher();
    expect(texte()).toContain("Cette page est réservée à l'administrateur.");
  });
});
