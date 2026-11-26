import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { InvitationsComponent } from './invitations.component';
import { Invitation, Rattachement, SecretaireService } from './secretaire.service';

describe('InvitationsComponent', () => {
  it('accepter une invitation relit le jeton PUIS le profil avant d ouvrir l espace secretaire', async () => {
    const ordre: string[] = [];
    const service = jasmine.createSpyObj<SecretaireService>('SecretaireService', ['invitations', 'accepterInvitation']);
    service.invitations.and.returnValue(of([]));
    service.accepterInvitation.and.returnValue(of({} as Rattachement));
    const auth = {
      seConnecter: () => undefined,
      actualiserRoles: () => { ordre.push('jeton'); return Promise.resolve(); },
    };
    const roles = { recharger: () => { ordre.push('profil'); return Promise.resolve(null); } };
    TestBed.configureTestingModule({
      imports: [InvitationsComponent],
      providers: [
        provideRouter([]),
        { provide: SecretaireService, useValue: service },
        { provide: AnnuaireService, useValue: jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']) },
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: roles },
      ],
    });
    const navigation = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const c = TestBed.createComponent(InvitationsComponent).componentInstance;

    c.accepter({ id: 'i1' } as never);
    await new Promise((r) => setTimeout(r));

    expect(ordre).toEqual(['jeton', 'profil']);
    expect(navigation).toHaveBeenCalledWith('/secretaire', { state: { invitationAcceptee: true } });
  });

  describe('langue', () => {
    function creer(arabe: boolean, liste: Invitation[] = []) {
      localStorage.setItem('tabibi.langue', arabe ? 'ar' : 'fr');
      const service = jasmine.createSpyObj<SecretaireService>('SecretaireService', ['invitations', 'refuserInvitation']);
      service.invitations.and.returnValue(of(liste as Invitation[]));
      service.refuserInvitation.and.returnValue(of(undefined));
      const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
      annuaire.medecin.and.returnValue(throwError(() => new Error('x')));
      TestBed.configureTestingModule({
        imports: [InvitationsComponent],
        providers: [
          provideRouter([]),
          { provide: SecretaireService, useValue: service },
          { provide: AnnuaireService, useValue: annuaire },
          { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: () => undefined } },
          { provide: RoleService, useValue: {} },
        ],
      });
      const fixture = TestBed.createComponent(InvitationsComponent);
      return { fixture, service };
    }
    afterEach(() => localStorage.removeItem('tabibi.langue'));

    it('en arabe : titre, vide et sens RTL, sans texte français', async () => {
      const { fixture } = creer(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('main')?.getAttribute('dir')).toBe('rtl');
      expect(el.textContent).toContain('دعوات العيادات');
      expect(el.textContent).toContain('لا توجد دعوات في الانتظار.');
      expect(el.textContent).not.toContain('Aucune invitation');
    });

    it('en français : textes français, pas de RTL', async () => {
      const { fixture } = creer(false);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('main')?.getAttribute('dir')).toBeNull();
      expect(el.textContent).toContain('Aucune invitation en attente.');
    });

    it('une date d\'invitation absente ou illisible n\'est pas affichee (ni vide, ni erreur), comme dans l\'appli', async () => {
      const { fixture } = creer(false, [
        { id: 'i1', medecinId: 'm1', creeLe: '2026-09-18T10:00:00Z' } as Invitation,
        { id: 'i2', medecinId: 'm2', creeLe: 'pas-une-date' } as Invitation,
        { id: 'i3', medecinId: 'm3' } as Invitation,
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const dates = (fixture.nativeElement as HTMLElement).querySelectorAll('.date-invitation');
      expect(dates.length).toBe(1);
      expect(fixture.nativeElement.textContent).not.toContain('Invalid');
    });

    it('en arabe : refuser affiche la confirmation en arabe', async () => {
      const { fixture } = creer(true);
      fixture.detectChanges();
      const c = fixture.componentInstance;
      c.refuser({ id: 'i1' } as never);
      expect(c.succes()).toBe('تم رفض الدعوة وتم إعلام الطبيب.');
    });

    for (const action of ['accepter', 'refuser'] as const) {
      it(`${action} : un echec (500) garde son message affiche pendant le rechargement de la liste`, async () => {
        const { fixture, service } = creer(false);
        service.accepterInvitation = jasmine.createSpy().and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        service.refuserInvitation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Invitation introuvable.' } })));
        fixture.detectChanges();
        await fixture.whenStable(); // fin du ngOnInit (premier chargement)
        service.invitations.calls.reset();
        const c = fixture.componentInstance;
        c[action]({ id: 'i1' } as never);
        await fixture.whenStable();
        fixture.detectChanges();
        expect(c.erreur()).toBe(action === 'accepter' ? "L'opération a échoué, veuillez réessayer." : 'Invitation introuvable.');
        expect(service.invitations).toHaveBeenCalledTimes(1);
        expect(fixture.nativeElement.textContent).toContain(c.erreur());
      });
    }

    it('un echec en arabe garde le message arabe', async () => {
      const { fixture, service } = creer(true);
      service.refuserInvitation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.refuser({ id: 'i1' } as never);
      await fixture.whenStable();
      expect(fixture.componentInstance.erreur()).toBe('فشلت العملية، يرجى المحاولة مرة أخرى.');
    });
  });
});
