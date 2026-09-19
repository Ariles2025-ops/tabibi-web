import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DisponibilitesComponent } from './disponibilites.component';
import { MedecinService } from './medecin.service';

describe('DisponibilitesComponent', () => {
  let fixture: ComponentFixture<DisponibilitesComponent>;
  let service: jasmine.SpyObj<MedecinService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<MedecinService>('MedecinService', ['ouvrirCreneau']);
    auth = { seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [DisponibilitesComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(DisponibilitesComponent);
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

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[name="${nom}"]`);
  }

  async function saisir(nom: string, valeur: string) {
    const c = champ(nom);
    c.value = valeur;
    c.dispatchEvent(new Event('input'));
    await afficher();
  }

  function envoyer() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    return afficher();
  }

  /** Date locale dans un an, au format du champ datetime-local, et son equivalent ISO 8601 UTC. */
  function dansUnAn(): { local: string; iso: string } {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    d.setHours(9, 30, 0, 0);
    const deux = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T09:30`;
    return { local, iso: d.toISOString() };
  }

  it('borne la duree du champ a 5..120 minutes, comme l API, et l explique dans le libelle', async () => {
    await afficher();

    expect(champ('dureeMinutes').getAttribute('min')).toBe('5');
    expect(champ('dureeMinutes').getAttribute('max')).toBe('120');
    expect(texte()).toContain('Durée (minutes, de 5 à 120)');
  });

  it('refuse cote client une duree hors de 5..120 minutes, sans appeler l API', async () => {
    const { local } = dansUnAn();
    await afficher();

    await saisir('debut', local);
    await saisir('dureeMinutes', '180');
    await envoyer();

    expect(service.ouvrirCreneau).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez une durée entre 5 et 120 minutes.');
  });

  it('ouvre un creneau de 120 minutes (heure locale convertie en ISO 8601 UTC) puis confirme', async () => {
    service.ouvrirCreneau.and.returnValue(of({ id: 'c1', medecinId: 'm1', debut: '2027-01-01T08:30:00Z', dureeMinutes: 120, disponible: true }));
    const { local, iso } = dansUnAn();
    await afficher();

    await saisir('debut', local);
    await saisir('dureeMinutes', '120');
    await envoyer();

    expect(service.ouvrirCreneau).toHaveBeenCalledWith(iso, 120);
    expect(texte()).toContain('Créneau ouvert le');
    expect(texte()).toContain('(120 min)');
  });

  it('affiche le motif { erreur } d un 400 de l API', async () => {
    service.ouvrirCreneau.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La duree doit etre comprise entre 5 et 120 minutes.' } })),
    );
    const { local } = dansUnAn();
    await afficher();

    await saisir('debut', local);
    await saisir('dureeMinutes', '30');
    await envoyer();

    expect(service.ouvrirCreneau).toHaveBeenCalledTimes(1);
    expect(texte()).toContain('La duree doit etre comprise entre 5 et 120 minutes.');
  });
});
