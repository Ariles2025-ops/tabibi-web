import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Moi, MoiService } from '../moi/moi.service';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let connecte: boolean;
  let moiService: jasmine.SpyObj<MoiService>;

  function profil(roles: string[]): Moi {
    return { sujet: 'u1', nom: 'demo', roles };
  }

  beforeEach(() => {
    connecte = true;
    moiService = jasmine.createSpyObj<MoiService>('MoiService', ['moi']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => connecte } },
        { provide: MoiService, useValue: moiService },
      ],
    });
  });

  it('reconnait le role ADMIN (estAdmin) et pas MEDECIN', async () => {
    moiService.moi.and.returnValue(of(profil(['ADMIN'])));
    const service = TestBed.inject(RoleService);

    expect(service.estAdmin()).toBeFalse();
    await service.charger();

    expect(service.estAdmin()).toBeTrue();
    expect(service.estMedecin()).toBeFalse();
    expect(service.roles()).toEqual(['ADMIN']);
  });

  it('reconnait le role MEDECIN (estMedecin) et pas ADMIN', async () => {
    moiService.moi.and.returnValue(of(profil(['MEDECIN'])));
    const service = TestBed.inject(RoleService);

    await service.charger();

    expect(service.estMedecin()).toBeTrue();
    expect(service.estAdmin()).toBeFalse();
  });

  it('ne lit le profil qu une seule fois', async () => {
    moiService.moi.and.returnValue(of(profil(['PATIENT'])));
    const service = TestBed.inject(RoleService);

    await service.charger();
    await service.charger();

    expect(moiService.moi).toHaveBeenCalledTimes(1);
    expect(service.moi()?.nom).toBe('demo');
  });

  it('n appelle pas /api/moi si l utilisateur n est pas connecte', async () => {
    connecte = false;
    const service = TestBed.inject(RoleService);

    expect(await service.charger()).toBeNull();
    expect(moiService.moi).not.toHaveBeenCalled();
    expect(service.roles()).toEqual([]);
  });

  it('resout null si /api/moi echoue et reessaie a l appel suivant', async () => {
    moiService.moi.and.returnValues(throwError(() => new Error('API indisponible')), of(profil(['ADMIN'])));
    spyOn(console, 'error');
    const service = TestBed.inject(RoleService);

    expect(await service.charger()).toBeNull();
    expect(service.estAdmin()).toBeFalse();

    await service.charger();
    expect(service.estAdmin()).toBeTrue();
    expect(moiService.moi).toHaveBeenCalledTimes(2);
  });
});
