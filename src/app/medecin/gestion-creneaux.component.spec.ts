import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { GestionCreneauxComponent, SourceCreneaux } from './gestion-creneaux.component';

describe('GestionCreneauxComponent : RDV pris au téléphone', () => {
  let fixture: ComponentFixture<GestionCreneauxComponent>;
  let langue: LangueService;
  let pris: number;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GestionCreneauxComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { seConnecter: () => undefined } }],
    });
    langue = TestBed.inject(LangueService);
    langue.ar.set(false);
    fixture = TestBed.createComponent(GestionCreneauxComponent);
    const source: SourceCreneaux = { lister: () => of([]), ouvrir: () => of(), supprimer: () => of(undefined) };
    fixture.componentRef.setInput('source', source);
    pris = 0;
    fixture.componentInstance.rdvPris.subscribe(() => pris++);
    fixture.detectChanges();
  });

  afterEach(() => langue.ar.set(false));

  it('confirme « Rendez-vous enregistré. » une fois le rendez-vous pris, comme l\'appli', () => {
    fixture.componentInstance.rdvPour.set('c1');
    fixture.componentInstance.erreur.set('ancienne erreur');
    fixture.componentInstance.rdvEnregistre();
    fixture.detectChanges();
    const texte: string = fixture.nativeElement.textContent;
    expect(texte).toContain('Rendez-vous enregistré.');
    expect(texte).not.toContain('ancienne erreur');
    expect(fixture.componentInstance.rdvPour()).toBeNull();
    expect(pris).toBe(1);
  });

  it('confirme en arabe « تم تسجيل الموعد. »', () => {
    langue.ar.set(true);
    fixture.componentInstance.rdvEnregistre();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('تم تسجيل الموعد.');
  });
});

describe('GestionCreneauxComponent : mise en page arabe', () => {
  it('espace les pastilles « Libre » / « Réservé » avec une marge logique (valable en arabe), pas margin-left', () => {
    TestBed.configureTestingModule({
      imports: [GestionCreneauxComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { seConnecter: () => undefined } }],
    });
    const f = TestBed.createComponent(GestionCreneauxComponent);
    const creneaux = [
      { id: 'c1', medecinId: 'm1', debut: '2099-01-05T09:00:00Z', dureeMinutes: 30, disponible: true },
      { id: 'c2', medecinId: 'm1', debut: '2099-01-05T10:00:00Z', dureeMinutes: 30, disponible: false },
    ];
    const source: SourceCreneaux = { lister: () => of(creneaux), ouvrir: () => of(), supprimer: () => of(undefined) };
    f.componentRef.setInput('source', source);
    f.detectChanges();
    const html: string = f.nativeElement.innerHTML;
    expect(html).toContain('margin-inline-start');
    expect(html).not.toContain('margin-left');
  });
});
