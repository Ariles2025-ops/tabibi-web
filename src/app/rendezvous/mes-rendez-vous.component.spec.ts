import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { Avis, AvisService } from '../avis/avis.service';
import { MesRendezVousComponent } from './mes-rendez-vous.component';
import { RendezVous, RendezVousService } from './rendezvous.service';

const CONFIRME: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };
const HONORE: RendezVous = { ...CONFIRME, id: 'r2', debut: '2026-09-01T09:00:00Z', statut: 'HONORE' };
const HONORE_NOTE: RendezVous = { ...CONFIRME, id: 'r3', debut: '2026-08-01T09:00:00Z', statut: 'HONORE' };

const MEDECIN: Medecin = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

const AVIS: Avis = { id: 'a1', rendezVousId: 'r3', medecinId: 'm1', note: 5, commentaire: null, statut: 'PUBLIE', deposeLe: '2026-08-02T10:00:00Z' };

/** Mes rendez-vous : bouton « Donner mon avis » sur les rendez-vous honores (la reservation et l'annulation datent de la v0.3.0). */
describe('MesRendezVousComponent (avis)', () => {
  let fixture: ComponentFixture<MesRendezVousComponent>;
  let rendezVous: jasmine.SpyObj<RendezVousService>;
  let avis: jasmine.SpyObj<AvisService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    rendezVous = jasmine.createSpyObj<RendezVousService>('RendezVousService', ['mes', 'annuler']);
    rendezVous.mes.and.returnValue(of([CONFIRME, HONORE, HONORE_NOTE]));
    avis = jasmine.createSpyObj<AvisService>('AvisService', ['mes']);
    avis.mes.and.returnValue(of([AVIS]));
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of(MEDECIN));

    TestBed.configureTestingModule({
      imports: [MesRendezVousComponent],
      providers: [
        provideRouter([]),
        { provide: RendezVousService, useValue: rendezVous },
        { provide: AvisService, useValue: avis },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesRendezVousComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function lignes(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  it('propose « Donner mon avis » sur les seuls rendez-vous honores sans avis, « Avis donné » sinon', async () => {
    await afficher();

    // Tri chronologique : r3 (aout, deja note), r2 (septembre, honore), r1 (decembre, confirme).
    const items = lignes();
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('Avis donné');
    expect(items[0].querySelector('a[href="/avis/nouveau/r3"]')).toBeNull();
    expect(items[1].querySelector('a[href="/avis/nouveau/r2"]')?.textContent).toContain('Donner mon avis');
    expect(items[1].textContent).not.toContain('Avis donné');
    expect(items[2].textContent).not.toContain('Donner mon avis');
    expect(items[2].querySelector('button')?.textContent).toContain('Annuler');
    expect(avis.mes).toHaveBeenCalledTimes(1);
  });

  it('ne lit pas mes avis quand aucun rendez-vous n est honore', async () => {
    rendezVous.mes.and.returnValue(of([CONFIRME]));
    await afficher();

    expect(avis.mes).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Donner mon avis');
  });
});
