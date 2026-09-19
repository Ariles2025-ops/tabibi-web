import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { InscriptionAttente, ListeAttenteService } from './liste-attente.service';
import { MesListesAttenteComponent } from './mes-listes-attente.component';

const RECENTE: InscriptionAttente = { id: 'i1', patientId: 'p1', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' };
const ANCIENNE: InscriptionAttente = { id: 'i2', patientId: 'p1', medecinId: 'm2', inscritLe: '2026-09-10T08:30:00Z' };

const MEDECINS: Record<string, Medecin> = {
  m1: { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
  m2: { id: 'm2', nomComplet: 'Dr Karim Haddad', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue', wilayaCode: '31', wilayaFr: 'Oran', ville: 'Oran' },
};

describe('MesListesAttenteComponent', () => {
  let fixture: ComponentFixture<MesListesAttenteComponent>;
  let service: jasmine.SpyObj<ListeAttenteService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<ListeAttenteService>('ListeAttenteService', ['mes', 'retirer']);
    service.mes.and.returnValue(of([RECENTE, ANCIENNE]));
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.callFake((id: string) => of(MEDECINS[id]));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesListesAttenteComponent],
      providers: [
        provideRouter([]),
        { provide: ListeAttenteService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesListesAttenteComponent);
  });

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function lignes(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  it('liste mes inscriptions, les plus anciennes d abord, avec le nom du praticien et la date', async () => {
    await afficher();

    const items = lignes();
    expect(items.length).toBe(2);
    expect(items[0].querySelector('a[href="/medecins/m2"]')?.textContent).toContain('Dr Karim Haddad');
    expect(items[0].textContent).toContain('Inscrit le 10 septembre 2026');
    expect(items[1].querySelector('a[href="/medecins/m1"]')?.textContent).toContain('Dr Amina Belkacem');
    expect(items[1].querySelector('button')?.textContent).toContain('Me retirer');
    expect(annuaire.medecin).toHaveBeenCalledTimes(2);
  });

  it('retire l inscription puis la retire de la liste', async () => {
    service.retirer.and.returnValue(of(void 0));
    await afficher();

    lignes()[0].querySelector('button')!.click();
    await afficher();

    expect(service.retirer).toHaveBeenCalledWith('i2');
    expect(lignes().length).toBe(1);
    expect(texte()).not.toContain('Dr Karim Haddad');
    expect(service.mes).toHaveBeenCalledTimes(1);
  });

  it('affiche le { erreur } d un echec de retrait et garde la ligne', async () => {
    service.retirer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Cette inscription est a un autre patient.' } })));
    await afficher();

    lignes()[0].querySelector('button')!.click();
    await afficher();

    expect(texte()).toContain('Cette inscription est a un autre patient.');
    expect(lignes().length).toBe(2);
  });

  it('affiche un message quand je ne suis inscrit nulle part, et redirige si non connecte', async () => {
    service.mes.and.returnValue(of([]));
    await afficher();
    expect(texte()).toContain("Vous n'êtes inscrit sur aucune liste d'attente.");

    auth.estConnecte = () => false;
    fixture = TestBed.createComponent(MesListesAttenteComponent);
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mes).toHaveBeenCalledTimes(1);
  });

  it('indique que la page est reservee aux patients sur un 403', async () => {
    service.mes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Cette page est réservée aux patients.');
    expect(lignes().length).toBe(0);
  });
});
