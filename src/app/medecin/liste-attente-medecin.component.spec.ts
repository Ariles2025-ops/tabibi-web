import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { InscriptionAttente, ListeAttenteService } from '../liste-attente/liste-attente.service';
import { LangueService } from '../partage/langue.service';
import { ListeAttenteMedecinComponent } from './liste-attente-medecin.component';
import { PatientsService } from './patients.service';

const RECENTE: InscriptionAttente = { id: 'i1', patientId: '11111111-1111-1111-1111-111111111111', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' };
const ANCIENNE: InscriptionAttente = { id: 'i2', patientId: '22222222-2222-2222-2222-222222222222', medecinId: 'm1', inscritLe: '2026-09-10T08:30:00Z' };

describe('ListeAttenteMedecinComponent', () => {
  let fixture: ComponentFixture<ListeAttenteMedecinComponent>;
  let service: jasmine.SpyObj<ListeAttenteService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue'); // la langue memorisee par un autre test ne doit pas fuiter
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<ListeAttenteService>('ListeAttenteService', ['duMedecin']);
    auth = { seConnecter: jasmine.createSpy('seConnecter') };
    const patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['patientsDuMedecin']);
    patients.patientsDuMedecin.and.returnValue(
      of(new Map([[ANCIENNE.patientId, { patientId: ANCIENNE.patientId, nomComplet: 'Karim Ouali', telephone: '0661000000', email: null }]])),
    );
    TestBed.configureTestingModule({
      imports: [ListeAttenteMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: ListeAttenteService, useValue: service },
        { provide: PatientsService, useValue: patients },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(ListeAttenteMedecinComponent);
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  it('liste les patients en attente, du plus ancien au plus recent, avec leur nom (a defaut « Patient ») et la date', () => {
    service.duMedecin.and.returnValue(of([RECENTE, ANCIENNE]));
    fixture.detectChanges();

    const lignes: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(lignes.length).toBe(2);
    expect(lignes[0].textContent).toContain('Karim Ouali');
    expect(lignes[0].textContent).toContain('0661000000');
    expect(lignes[0].textContent).not.toContain('22222222');
    expect(lignes[0].textContent).toContain('Inscrit le 10 septembre 2026');
    expect(lignes[1].textContent).toContain('Patient 11111111');
    expect(lignes[1].textContent).not.toContain('11111111-');
    expect(lignes[1].textContent).toContain('Inscrit le 18 septembre 2026');
  });

  it('affiche un etat vide avec le lien vers les disponibilites', () => {
    service.duMedecin.and.returnValue(of([]));
    fixture.detectChanges();

    expect(texte()).toContain("Aucun patient en liste d'attente pour le moment.");
    expect(fixture.nativeElement.querySelector('a[href="/medecin/disponibilites"]')).not.toBeNull();
  });

  it('indique que la page est reservee aux medecins sur un 403 et renvoie vers la connexion sur un 401', () => {
    service.duMedecin.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    fixture.detectChanges();
    expect(texte()).toContain('Cette page est réservée aux médecins.');

    service.duMedecin.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    fixture = TestBed.createComponent(ListeAttenteMedecinComponent);
    fixture.detectChanges();
    expect(auth.seConnecter).toHaveBeenCalled();
  });

  it('s\'affiche en arabe (titre, « مريض » a defaut de nom, date) quand la langue est l\'arabe', () => {
    TestBed.inject(LangueService).ar.set(true);
    service.duMedecin.and.returnValue(of([RECENTE, ANCIENNE]));
    fixture.detectChanges();

    expect(texte()).toContain('قائمة الانتظار');
    expect(texte()).toContain('مريض');
    expect(texte()).toContain('Karim Ouali');
    expect(texte()).toContain('سُجّل في');
    expect(texte()).toContain('10/09/2026');
    expect(texte()).not.toContain('Inscrit le');
    expect(texte()).not.toContain('Patient');
  });

  it('en arabe, la liste vide et la page reservee aux medecins sont en arabe', () => {
    TestBed.inject(LangueService).ar.set(true);
    service.duMedecin.and.returnValue(of([]));
    fixture.detectChanges();
    expect(texte()).toContain('لا يوجد مرضى في قائمة الانتظار حاليًا.');
    expect(texte()).not.toContain("Aucun patient");
  });

  it("sans date d'inscription : « Date d'inscription inconnue » (jamais « Inscrit le » vide), en dernier dans la file", () => {
    service.duMedecin.and.returnValue(of([{ id: 'i3', patientId: '33333333-3333-3333-3333-333333333333', medecinId: 'm1' }, ANCIENNE]));
    fixture.detectChanges();
    const lignes: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));

    expect(lignes[0].textContent).toContain('Inscrit le');
    expect(lignes[1].textContent).toContain("Date d'inscription inconnue");
    expect(lignes[1].textContent).not.toContain('Inscrit le');
  });

  it("en arabe, sans date d'inscription : « تاريخ التسجيل غير معروف »", () => {
    TestBed.inject(LangueService).ar.set(true);
    service.duMedecin.and.returnValue(of([{ id: 'i3', patientId: '33333333-3333-3333-3333-333333333333', medecinId: 'm1' }]));
    fixture.detectChanges();

    expect(texte()).toContain('تاريخ التسجيل غير معروف');
  });
});
