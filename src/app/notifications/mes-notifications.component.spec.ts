import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { of } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { LangueService } from '../partage/langue.service';
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
        provideRouter([]),
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

  it('« Tout marquer comme lu » confirme le nombre de notifications marquees, comme l\'appli', async () => {
    service.toutMarquerLu.and.returnValue(of(2));
    await afficher();

    bouton('Tout marquer comme lu')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 notification(s) marquée(s) lue(s)');
  });

  it('« Tout marquer comme lu » sans rien a marquer affiche « Aucune notification à marquer »', async () => {
    service.toutMarquerLu.and.returnValue(of(0));
    await afficher();

    bouton('Tout marquer comme lu')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucune notification à marquer');
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
  });

  it('une notification avec lien est cliquable : elle est marquee lue puis ouvre la page', async () => {
    const avecLien: Notification = { ...NON_LUE, lien: '/mes-rendez-vous' };
    service.mesNotifications.and.returnValue(of([avecLien, LUE]));
    service.marquerLue.and.returnValue(of({ ...avecLien, lue: true }));
    const router = TestBed.inject(Router);
    const navigation = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    await afficher();

    expect(lignes()[0].textContent).toContain('Voir');
    expect(lignes()[1].textContent).not.toContain('Voir');

    lignes()[0].click();
    fixture.detectChanges();

    expect(service.marquerLue).toHaveBeenCalledWith('n1');
    expect(navigation).toHaveBeenCalledWith('/mes-rendez-vous');

    // Sans lien, le clic ne navigue pas.
    navigation.calls.reset();
    lignes()[1].click();
    expect(navigation).not.toHaveBeenCalled();
  });

  it('un lien externe ou mal forme n est pas propose : pas de « Voir », pas de navigation', async () => {
    const externe: Notification = { ...NON_LUE, lien: 'https://exemple.org/page' };
    const relatif: Notification = { ...LUE, id: 'n3', lien: '//exemple.org' };
    service.mesNotifications.and.returnValue(of([externe, relatif]));
    const navigation = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    await afficher();

    expect(lignes()[0].textContent).not.toContain('Voir');
    expect(lignes()[1].textContent).not.toContain('Voir');
    lignes()[0].click();
    lignes()[1].click();
    expect(navigation).not.toHaveBeenCalled();
    expect(service.marquerLue).not.toHaveBeenCalled();
  });

  it('« /ordonnances » ouvre Mes ordonnances ; un lien sans page du site n\'a pas de « Voir »', async () => {
    const liste: Notification = { ...NON_LUE, lien: '/ordonnances' };
    const inconnu: Notification = { ...LUE, id: 'n3', lien: '/page-inexistante' };
    service.mesNotifications.and.returnValue(of([liste, inconnu]));
    service.marquerLue.and.returnValue(of({ ...liste, lue: true }));
    const navigation = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    await afficher();

    expect(lignes()[0].textContent).toContain('Voir');
    expect(lignes()[1].textContent).not.toContain('Voir');
    lignes()[0].click();
    lignes()[1].click();
    expect(navigation).toHaveBeenCalledOnceWith('/mes-ordonnances');
  });

  describe('en arabe (comme l\'appli)', () => {
    afterEach(() => TestBed.inject(LangueService).definir(false));

    it('traduit titre, boutons, date et lien « Voir », en RTL, sans texte français', async () => {
      TestBed.inject(LangueService).definir(true);
      service.mesNotifications.and.returnValue(of([{ ...NON_LUE, lien: '/mes-rendez-vous' }]));
      await afficher();

      const texte: string = fixture.nativeElement.textContent;
      expect(texte).toContain('إشعاراتي');
      expect(texte).toContain('تعليم الكل كمقروء');
      expect(texte).toContain('تعليم كمقروء');
      expect(texte).toContain('عرض');
      expect(texte).toContain('18/09/2026');
      expect(texte).not.toContain('Mes notifications');
      expect(texte).not.toContain('Marquer comme lue');
      expect(texte).not.toContain('Voir');
      expect(texte).not.toContain('septembre');
      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
    });

    it('traduit l\'état vide et la confirmation « Tout marquer comme lu »', async () => {
      TestBed.inject(LangueService).definir(true);
      service.mesNotifications.and.returnValue(of([]));
      await afficher();
      expect(fixture.nativeElement.textContent).toContain('لا توجد إشعارات حاليًا.');

      service.mesNotifications.and.returnValue(of([NON_LUE]));
      service.toutMarquerLu.and.returnValue(of(2));
      fixture.componentInstance.charger();
      fixture.detectChanges();
      bouton('تعليم الكل كمقروء')!.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('تم تعليم 2 إشعار(ات) كمقروءة');
    });
  });

  it('une notification sans date lisible affiche « date inconnue » et passe en fin de liste, comme dans l appli', async () => {
    service.mesNotifications.and.returnValue(of([{ ...LUE, id: 'n3', creeLe: 'pas une date' }, LUE, NON_LUE]));
    await afficher();
    const items = lignes();
    expect(items.length).toBe(3);
    expect(items[2].textContent).toContain('date inconnue');
    expect(items[0].textContent).not.toContain('date inconnue');
    expect(items[1].textContent).not.toContain('date inconnue');
  });

  it('en arabe, une notification sans date affiche « تاريخ غير معروف »', async () => {
    service.mesNotifications.and.returnValue(of([{ ...LUE, creeLe: '' }]));
    TestBed.inject(LangueService).ar.set(true);
    try {
      await afficher();
      expect(fixture.nativeElement.textContent).toContain('تاريخ غير معروف');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });
});
