import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MesNotificationsComponent } from './mes-notifications.component';
import { Notification, NotificationService } from './notification.service';

const NON_LUE: Notification = {
  id: 'n1',
  destinataireId: 'u1',
  canal: 'INTERNE',
  sujet: 'Rendez-vous confirme',
  message: 'Votre rendez-vous du 07/12/2026 a 10:00 est confirme.',
  lue: false,
  creeLe: '2026-09-18T10:00:00Z',
};

const LUE: Notification = {
  id: 'n2',
  destinataireId: 'u1',
  canal: 'INTERNE',
  sujet: 'Nouveau rendez-vous',
  message: 'Un patient a reserve un creneau.',
  lue: true,
  creeLe: '2026-09-17T09:00:00Z',
};

describe('MesNotificationsComponent', () => {
  let fixture: ComponentFixture<MesNotificationsComponent>;
  let service: jasmine.SpyObj<NotificationService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'mesNotifications', 'nombreNonLues', 'marquerLue', 'toutMarquerLu',
    ]);
    service.mesNotifications.and.returnValue(of([LUE, NON_LUE]));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesNotificationsComponent],
      providers: [
        { provide: NotificationService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesNotificationsComponent);
  });

  /** Lance ngOnInit (attente de l'etat de connexion) puis rafraichit la vue. */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function lignes(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  function bouton(texte: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes(texte));
  }

  it('affiche la liste, les plus recentes d abord, avec sujet, message, date et etat lue / non lue', async () => {
    await afficher();

    const items = lignes();
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Rendez-vous confirme');
    expect(items[0].textContent).toContain('Votre rendez-vous du 07/12/2026 a 10:00 est confirme.');
    expect(items[0].textContent).toContain('18 septembre 2026');
    expect(items[0].classList).toContain('notification-non-lue');
    expect(items[1].textContent).toContain('Nouveau rendez-vous');
    expect(items[1].classList).toContain('notification-lue');
    expect(fixture.nativeElement.textContent).not.toContain('Aucune notification pour le moment.');
  });

  it('propose « Marquer comme lue » seulement sur les non lues et appelle le service au clic', async () => {
    service.marquerLue.and.returnValue(of({ ...NON_LUE, lue: true }));
    await afficher();

    expect(lignes()[0].querySelector('button')?.textContent).toContain('Marquer comme lue');
    expect(lignes()[1].querySelector('button')).toBeNull();

    bouton('Marquer comme lue')!.click();
    fixture.detectChanges();

    expect(service.marquerLue).toHaveBeenCalledWith('n1');
    expect(lignes()[0].classList).toContain('notification-lue');
    expect(bouton('Marquer comme lue')).toBeUndefined();
  });

  it('« Tout marquer comme lu » appelle le service puis recharge la liste', async () => {
    service.toutMarquerLu.and.returnValue(of(1));
    await afficher();

    bouton('Tout marquer comme lu')!.click();
    fixture.detectChanges();

    expect(service.toutMarquerLu).toHaveBeenCalledTimes(1);
    expect(service.mesNotifications).toHaveBeenCalledTimes(2);
  });

  it('affiche un message quand il n y a aucune notification', async () => {
    service.mesNotifications.and.returnValue(of([]));
    await afficher();

    expect(lignes().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Aucune notification pour le moment.');
    expect(bouton('Tout marquer comme lu')!.disabled).toBeTrue();
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mesNotifications).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Redirection vers la page de connexion');
  });
});
