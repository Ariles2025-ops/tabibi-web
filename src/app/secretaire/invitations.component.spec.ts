import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { InvitationsComponent } from './invitations.component';
import { Rattachement, SecretaireService } from './secretaire.service';

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
    expect(navigation).toHaveBeenCalledWith('/secretaire');
  });
});
