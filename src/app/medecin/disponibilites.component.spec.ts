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
import { instantAlger, valeurDateHeureLocale } from './agenda-utils';

describe('DisponibilitesComponent', () => {
  let fixture: ComponentFixture<DisponibilitesComponent>;
  let service: jasmine.SpyObj<MedecinService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<MedecinService>('MedecinService', ['ouvrirCreneau', 'creneaux', 'supprimerCreneau']);
    service.creneaux.and.returnValue(of([]));
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

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim().startsWith(libelle));
  }

  function envoyer() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    return afficher();
  }

  /** Date (heure d'Algerie) dans un an, au format du champ datetime-local, et son equivalent ISO 8601 UTC. */
  function dansUnAn(): { local: string; iso: string } {
    // Jour d'Algerie (UTC+1) dans un an ; l'heure saisie est interpretee en heure d'Algerie.
    const jour = valeurDateHeureLocale(new Date()).slice(0, 10);
    const date = `${Number(jour.slice(0, 4)) + 1}${jour.slice(4)}`;
    return { local: `${date}T09:30`, iso: new Date(instantAlger(date, '09:30')).toISOString() };
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
    // La liste des creneaux est rechargee.
    expect(service.creneaux).toHaveBeenCalledTimes(2);
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

  it('interdit de choisir une date passee (attribut min)', async () => {
    await afficher();
    const min = champ('debut').getAttribute('min')!;
    expect(min).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const [jour, heure] = min.split('T');
    expect(instantAlger(jour, heure)).toBeLessThanOrEqual(Date.now());
    expect(instantAlger(jour, heure)).toBeGreaterThan(Date.now() - 5 * 60_000);
  });

  describe('liste des creneaux a venir', () => {
    // Demain 09:00 en heure d'Algerie (UTC+1), quel que soit le fuseau du navigateur.
    const jourDemain = valeurDateHeureLocale(new Date(Date.now() + 24 * 3600_000)).slice(0, 10);
    const demain = new Date(instantAlger(jourDemain, '09:00'));
    const LIBRE = { id: 'c1', medecinId: 'm1', debut: demain.toISOString(), dureeMinutes: 30, disponible: true };
    const RESERVE = { ...LIBRE, id: 'c2', debut: new Date(demain.getTime() + 30 * 60_000).toISOString(), disponible: false };

    function creneaux(): HTMLLIElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('li.creneau'));
    }

    it('regroupe les creneaux par jour avec heure, duree et badge Libre / Réservé ; seuls les libres se suppriment', async () => {
      service.creneaux.and.returnValue(of([RESERVE, LIBRE]));
      await afficher();

      const items = creneaux();
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('09:00');
      expect(items[0].textContent).toContain('30 min');
      expect(items[0].textContent).toContain('Libre');
      expect(items[0].querySelector('button')?.textContent).toContain('Supprimer');
      expect(items[1].textContent).toContain('Réservé');
      expect(items[1].querySelector('button')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('h3').length).toBe(1);
    });

    it('supprime un creneau libre apres « Oui » et recharge ; « Non » annule', async () => {
      service.creneaux.and.returnValue(of([LIBRE]));
      service.supprimerCreneau.and.returnValue(of(undefined));
      await afficher();

      bouton('Supprimer')!.click();
      await afficher();
      expect(texte()).toContain('Supprimer ce créneau ?');
      bouton('Non')!.click();
      await afficher();
      expect(service.supprimerCreneau).not.toHaveBeenCalled();

      bouton('Supprimer')!.click();
      await afficher();
      bouton('Oui')!.click();
      await afficher();

      expect(service.supprimerCreneau).toHaveBeenCalledWith('c1');
      expect(service.creneaux).toHaveBeenCalledTimes(2);
      // Comme « Créneau supprimé » dans l'appli : le médecin voit que la suppression a bien eu lieu.
      expect(texte()).toContain('Créneau supprimé.');
    });

    it('affiche le { erreur } d un 409 (creneau reserve entre-temps)', async () => {
      service.creneaux.and.returnValue(of([LIBRE]));
      service.supprimerCreneau.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: "Ce créneau est réservé : annulez d'abord le rendez-vous." } })),
      );
      await afficher();

      bouton('Supprimer')!.click();
      await afficher();
      bouton('Oui')!.click();
      await afficher();

      expect(texte()).toContain("Ce créneau est réservé : annulez d'abord le rendez-vous.");
    });
  });

  describe('serie de creneaux', () => {
    function dateDansUnAn(): string {
      return dansUnAn().local.slice(0, 10);
    }

    async function remplirSerie(date: string, de: string, a: string, duree: string) {
      bouton('Une série')!.click();
      await afficher();
      await saisir('serieDate', date);
      await saisir('serieDebut', de);
      await saisir('serieFin', a);
      await saisir('serieDuree', duree);
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      await afficher();
    }

    it('ouvre des creneaux consecutifs de l heure de debut a l heure de fin', async () => {
      service.ouvrirCreneau.and.callFake((debut: string, duree: number) => of({ id: debut, medecinId: 'm1', debut, dureeMinutes: duree, disponible: true }));
      const date = dateDansUnAn();
      await afficher();

      await remplirSerie(date, '09:00', '10:30', '30');

      expect(service.ouvrirCreneau).toHaveBeenCalledTimes(3);
      expect(service.ouvrirCreneau.calls.argsFor(0)).toEqual([new Date(instantAlger(date, '09:00')).toISOString(), 30]);
      expect(service.ouvrirCreneau.calls.argsFor(2)).toEqual([new Date(instantAlger(date, '10:00')).toISOString(), 30]);
      expect(texte()).toContain('3 créneaux ouverts.');
    });

    it('s arrete a une erreur autre qu un chevauchement et l explique', async () => {
      let appels = 0;
      service.ouvrirCreneau.and.callFake((debut: string, duree: number) =>
        ++appels === 2
          ? throwError(() => new HttpErrorResponse({ status: 500, error: { erreur: 'Erreur serveur.' } }))
          : of({ id: debut, medecinId: 'm1', debut, dureeMinutes: duree, disponible: true }),
      );
      await afficher();

      await remplirSerie(dateDansUnAn(), '09:00', '11:00', '30');

      expect(service.ouvrirCreneau).toHaveBeenCalledTimes(2);
      expect(texte()).toContain("1 créneau ouvert avant l'arrêt.");
      expect(texte()).toContain('Arrêt au créneau de 09:30 : Erreur serveur.');
    });

    it('ignore un chevauchement (400), ouvre les suivants et resume', async () => {
      let appels = 0;
      service.ouvrirCreneau.and.callFake((debut: string, duree: number) =>
        ++appels === 2
          ? throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Ce créneau chevauche un créneau déjà ouvert à cette heure-là.' } }))
          : of({ id: debut, medecinId: 'm1', debut, dureeMinutes: duree, disponible: true }),
      );
      await afficher();

      await remplirSerie(dateDansUnAn(), '09:00', '11:00', '30');

      expect(service.ouvrirCreneau).toHaveBeenCalledTimes(4);
      expect(texte()).toContain('3 créneaux ouverts, 1 ignoré (déjà pris).');
    });
  });
});
