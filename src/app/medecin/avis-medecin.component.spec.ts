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
import { LangueService } from '../partage/langue.service';
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
  let confirmation: jasmine.Spy;

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue'); // la langue memorisee par un autre test ne doit pas fuiter
    registerLocaleData(localeFr);
    confirmation = spyOn(window, 'confirm').and.returnValue(true); // « Signaler cet avis ? » accepte par defaut
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
    return Array.from(fixture.nativeElement.querySelectorAll('li button'));
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

  it('signale un avis : il reste visible, marque « Signalé », sans bouton', async () => {
    service.signaler.and.returnValue(of({ id: 'a1', rendezVousId: 'r1', medecinId: MEDECIN_ID, note: 5, commentaire: 'Très bon accueil.', statut: 'SIGNALE', deposeLe: '2026-09-18T10:00:00Z' }));
    await afficher();

    boutonsSignaler()[0].click();
    await afficher();

    expect(confirmation).toHaveBeenCalledWith(jasmine.stringContaining('Signaler cet avis ?'));
    expect(service.signaler).toHaveBeenCalledWith('a1');
    expect(texte()).toContain("Avis signalé : il reste visible jusqu'à la décision de l'équipe Ndawik.");
    expect(texte()).not.toContain('retiré');
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Signalé');
    expect(items[0].querySelector('button')).toBeNull();
    expect(boutonsSignaler().length).toBe(1);
  });

  it('ne signale rien si le médecin refuse la confirmation', async () => {
    confirmation.and.returnValue(false);
    await afficher();

    boutonsSignaler()[0].click();
    await afficher();

    expect(service.signaler).not.toHaveBeenCalled();
    expect(boutonsSignaler().length).toBe(2);
    expect(texte()).not.toContain('Avis signalé');
  });

  it('affiche le motif { erreur } d un 409 (deja signale) et marque l avis « Signalé »', async () => {
    service.signaler.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Seul un avis publie peut etre signale.' } })),
    );
    await afficher();

    boutonsSignaler()[0].click();
    await afficher();

    expect(texte()).toContain('Seul un avis publie peut etre signale.');
    expect(boutonsSignaler().length).toBe(1);
  });

  it('après rechargement, un avis déjà signalé (signale: true) reste « Signalé » et sans bouton', async () => {
    service.synthese.and.returnValue(of({ ...SYNTHESE, avis: SYNTHESE.avis.map((a) => (a.id === 'a1' ? { ...a, signale: true } : a)) }));
    await afficher();

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items[0].textContent).toContain('Signalé');
    expect(items[0].querySelector('button')).toBeNull();
    expect(boutonsSignaler().length).toBe(1);
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

  it('s\'affiche en arabe (titre, moyenne, « Signaler ») quand la langue est l\'arabe, sans texte francais', async () => {
    TestBed.inject(LangueService).ar.set(true);
    await afficher();

    expect(texte()).toContain('آراء المرضى');
    expect(texte()).toContain('4,5 / 5 (2 رأي)');
    expect(boutonsSignaler().some((b) => b.textContent?.trim() === 'إبلاغ')).toBeTrue();
    expect(texte()).not.toContain('Signaler');
    expect(texte()).not.toContain('Avis des patients');

    boutonsSignaler()[0].click();
    expect(confirmation).toHaveBeenCalledWith('الإبلاغ عن هذا الرأي؟ يبقى ظاهرًا حتى قرار فريق نداويك.');
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
  });
});
