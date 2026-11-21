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
