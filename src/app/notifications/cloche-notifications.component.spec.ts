import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ClocheNotificationsComponent } from './cloche-notifications.component';
import { NotificationService } from './notification.service';

describe('ClocheNotificationsComponent', () => {
  let fixture: ComponentFixture<ClocheNotificationsComponent>;
  let service: jasmine.SpyObj<NotificationService>;
  /** Faux flux NotificationService.changements$ (marquage lu depuis la boite de reception). */
  let changements: Subject<void>;

  beforeEach(() => {
    changements = new Subject<void>();
    service = jasmine.createSpyObj<NotificationService>('NotificationService', ['nombreNonLues'], {
      changements$: changements.asObservable(),
    });
    service.nombreNonLues.and.returnValue(of(3));
    TestBed.configureTestingModule({
      imports: [ClocheNotificationsComponent],
      providers: [
        { provide: NotificationService, useValue: service },
        // Route cible du lien, pour que le clic navigue sans erreur.
        provideRouter([{ path: 'notifications', children: [] }]),
      ],
    });
    fixture = TestBed.createComponent(ClocheNotificationsComponent);
  });

  function lien(): HTMLAnchorElement {
    return fixture.nativeElement.querySelector('a');
  }

  it('affiche « Notifications » avec le nombre de non lues entre parentheses', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(service.nombreNonLues).toHaveBeenCalledTimes(1);
    expect(lien().textContent?.trim()).toBe('Notifications (3)');
    expect(lien().getAttribute('href')).toBe('/notifications');
    expect(lien().getAttribute('aria-label')).toBe('Notifications, 3 non lues');

    fixture.destroy();
  }));

  it('n affiche pas de compteur quand tout est lu', fakeAsync(() => {
    service.nombreNonLues.and.returnValue(of(0));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(lien().textContent?.trim()).toBe('Notifications');
    expect(lien().getAttribute('aria-label')).toBe('Notifications');

    fixture.destroy();
  }));

  it('relit le compteur toutes les 60 secondes et au clic, et s arrete a la destruction', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(service.nombreNonLues).toHaveBeenCalledTimes(1);

    tick(60_000);
    expect(service.nombreNonLues).toHaveBeenCalledTimes(2);

    service.nombreNonLues.and.returnValue(of(5));
    lien().click();
    tick();
    fixture.detectChanges();
    expect(service.nombreNonLues).toHaveBeenCalledTimes(3);
    expect(lien().textContent?.trim()).toBe('Notifications (5)');

    // Apres destruction, plus aucun appel : fakeAsync echouerait si un minuteur periodique restait actif.
    fixture.destroy();
    tick(120_000);
    changements.next();
    expect(service.nombreNonLues).toHaveBeenCalledTimes(3);
  }));

  it('relit le compteur des qu une notification est marquee lue (changements$ du service)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(lien().textContent?.trim()).toBe('Notifications (3)');

    service.nombreNonLues.and.returnValue(of(0));
    changements.next();
    fixture.detectChanges();

    expect(service.nombreNonLues).toHaveBeenCalledTimes(2);
    expect(lien().textContent?.trim()).toBe('Notifications');

    fixture.destroy();
  }));

  it('garde le dernier compteur connu si l API echoue', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(lien().textContent?.trim()).toBe('Notifications (3)');

    service.nombreNonLues.and.returnValue(throwError(() => new Error('API indisponible')));
    tick(60_000);
    fixture.detectChanges();
    expect(lien().textContent?.trim()).toBe('Notifications (3)');

    fixture.destroy();
  }));
});
