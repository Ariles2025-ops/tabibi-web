import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { MesOrdonnancesComponent } from './mes-ordonnances.component';
import { Ordonnance, OrdonnanceService } from './ordonnance.service';

const ANNULEE: Ordonnance = {
  id: 'o1', medecinId: 'm1', patientId: 'p1', rendezVousId: null, lignes: [],
  emiseLe: '2026-09-18T10:00:00Z', codeVerification: 'ABC123', statut: 'ANNULEE', motifAnnulation: 'Erreur de dosage',
};
const DELIVREE: Ordonnance = {
  id: 'o2', medecinId: 'm1', patientId: 'p1', rendezVousId: null, lignes: [],
  emiseLe: '2026-09-10T10:00:00Z', codeVerification: 'XYZ789', statut: 'DELIVREE', delivreeLe: '2026-09-12T10:00:00Z',
};

describe('MesOrdonnancesComponent', () => {
  let fixture: ComponentFixture<MesOrdonnancesComponent>;
  let service: jasmine.SpyObj<OrdonnanceService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['mes']);
    service.mes.and.returnValue(of([DELIVREE, ANNULEE]));
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of({ nomComplet: 'Dr Amina Belkacem' } as unknown as Medecin));
    TestBed.configureTestingModule({
      imports: [MesOrdonnancesComponent],
      providers: [
        provideRouter([]),
        { provide: OrdonnanceService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: () => undefined } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesOrdonnancesComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('affiche la liste en français par défaut', async () => {
    await afficher();
    const texte: string = fixture.nativeElement.textContent;
    expect(texte).toContain('Mes ordonnances');
    expect(texte).toContain('Annulée par le médecin : Erreur de dosage');
    expect(texte).toContain('Délivrée en pharmacie le 12 septembre 2026');
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBeNull();
  });

  it('affiche la liste en arabe (de droite à gauche), avec les mêmes mots que l appli', async () => {
    TestBed.inject(LangueService).ar.set(true);
    try {
      await afficher();
      const texte: string = fixture.nativeElement.textContent;
      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      expect(texte).toContain('وصفاتي الطبية');
      expect(texte).toContain('ملغاة');
      expect(texte).toContain('مُسلَّمة');
      expect(texte).toContain('ألغاها الطبيب : Erreur de dosage');
      expect(texte).toContain('صُرفت في الصيدلية في 12/09/2026');
      expect(texte).not.toContain('Délivrée');
      expect(texte).not.toContain('Annulée');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('affiche le message de liste vide en arabe', async () => {
    service.mes.and.returnValue(of([]));
    TestBed.inject(LangueService).ar.set(true);
    try {
      await afficher();
      expect(fixture.nativeElement.textContent).toContain('لا توجد وصفات طبية حاليًا.');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('une ordonnance sans date lisible affiche « Date inconnue » et passe en fin de liste, comme dans l appli', async () => {
    service.mes.and.returnValue(of([{ ...DELIVREE, id: 'o3', emiseLe: 'illisible' }, DELIVREE, ANNULEE]));
    await afficher();
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(3);
    expect(items[0].textContent).not.toContain('Date inconnue');
    expect(items[2].textContent).toContain('Date inconnue');
  });

  it('un praticien dont la fiche est indisponible s affiche « Médecin » + identifiant abrégé (jamais vide), en français et en arabe', async () => {
    service.mes.and.returnValue(of([{ ...DELIVREE, medecinId: 'abcdef12-0000-0000-0000-000000000000' }]));
    const annuaire = TestBed.inject(AnnuaireService) as jasmine.SpyObj<AnnuaireService>;
    annuaire.medecin.and.returnValue(throwError(() => new Error('indisponible')));
    await afficher();
    expect(fixture.nativeElement.textContent).toContain('Médecin abcdef12');
    TestBed.inject(LangueService).ar.set(true);
    try {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('طبيب abcdef12');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('affiche le motif d\'annulation même si le statut est en minuscules, comme l\'appli', async () => {
    service.mes.and.returnValue(of([{ ...ANNULEE, statut: 'annulee' }]));
    await afficher();

    expect(fixture.nativeElement.textContent).toContain('Annulée par le médecin : Erreur de dosage');
  });
});
