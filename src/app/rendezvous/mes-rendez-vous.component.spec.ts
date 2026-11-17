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

    // A venir : r1 (decembre, confirme). Passes, du plus recent au plus ancien : r2 (septembre), r3 (aout, deja note).
    const items = lignes();
    expect(items.length).toBe(3);
    expect(items[0].textContent).not.toContain('Donner mon avis');
    expect(items[0].querySelector('button')?.textContent).toContain('Annuler');
    expect(items[1].querySelector('a[href="/avis/nouveau/r2"]')?.textContent).toContain('Donner mon avis');
    expect(items[1].textContent).not.toContain('Avis donné');
    expect(items[2].textContent).toContain('Avis donné');
    expect(items[2].querySelector('a[href="/avis/nouveau/r3"]')).toBeNull();
    expect(avis.mes).toHaveBeenCalledTimes(1);
  });

  it('demande une confirmation dans la page avant d annuler, et n annule rien sur « Non, garder »', async () => {
    rendezVous.mes.and.returnValue(of([CONFIRME]));
    rendezVous.annuler.and.returnValue(of(void 0) as any);
    await afficher();

    const bouton = (texte: string) =>
      (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(texte));
    bouton('Annuler')!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Annuler ce rendez-vous ?');
    bouton('Non, garder')!.click();
    fixture.detectChanges();
    expect(rendezVous.annuler).not.toHaveBeenCalled();

    bouton('Annuler')!.click();
    fixture.detectChanges();
    bouton('Oui, annuler')!.click();
    expect(rendezVous.annuler).toHaveBeenCalledWith('r1');
  });

  it('affiche « Terminé » (et non « Confirmé ») pour un rendez-vous confirme deja passe', async () => {
    rendezVous.mes.and.returnValue(of([{ ...CONFIRME, id: 'r9', debut: '2020-01-06T09:00:00Z' }]));
    await afficher();

    const statut = fixture.nativeElement.querySelector('li .mr-statut') as HTMLElement;
    expect(statut.textContent?.trim()).toBe('Terminé');
    expect(statut.classList).not.toContain('mr-statut--ok');
  });

  it('affiche « Confirmé » (comme l appli) pour un rendez-vous RESERVE a venir, et « Terminé » une fois passe', async () => {
    rendezVous.mes.and.returnValue(of([
      { ...CONFIRME, id: 'r7', statut: 'RESERVE', debut: '2099-01-06T09:00:00Z' },
      { ...CONFIRME, id: 'r8', statut: 'RESERVE', debut: '2020-01-06T09:00:00Z' },
    ]));
    await afficher();

    const textes = Array.from(fixture.nativeElement.querySelectorAll('li .mr-statut') as NodeListOf<HTMLElement>)
      .map((e) => e.textContent?.trim());
    expect(textes).toContain('Confirmé');
    expect(textes).toContain('Terminé');
    expect(textes).not.toContain('Réservé');
  });

  it('ne lit pas mes avis quand aucun rendez-vous n est honore', async () => {
    rendezVous.mes.and.returnValue(of([CONFIRME]));
    await afficher();

    expect(avis.mes).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Donner mon avis');
  });

  it('range un rendez-vous ABSENT dans « Passés », libelle « Non honoré », meme a une date future', async () => {
    rendezVous.mes.and.returnValue(of([{ ...CONFIRME, id: 'r8', debut: '2099-01-06T09:00:00Z', statut: 'ABSENT' }]));
    await afficher();

    expect(fixture.nativeElement.textContent).toContain('Passés');
    const statut = fixture.nativeElement.querySelector('li.mr-carte--passe .mr-statut') as HTMLElement;
    expect(statut.textContent?.trim()).toBe('Non honoré');
  });

  it('affiche « Terminé » (et non « Honoré ») pour un rendez-vous HONORE', async () => {
    rendezVous.mes.and.returnValue(of([HONORE]));
    await afficher();

    const statut = fixture.nativeElement.querySelector('li.mr-carte--passe .mr-statut') as HTMLElement;
    expect(statut.textContent?.trim()).toBe('Terminé');
    expect(fixture.nativeElement.textContent).not.toContain('Honoré');
  });
});
