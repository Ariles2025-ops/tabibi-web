import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AdminService, Candidature } from './admin.service';
import { CandidaturesAdminComponent } from './candidatures-admin.component';

const EN_ATTENTE: Candidature = {
  id: 'c1',
  medecinId: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

const REFUSEE: Candidature = {
  ...EN_ATTENTE,
  id: 'c2',
  nomComplet: 'Dr Karim Haddad',
  statut: 'REFUSEE',
  motifRefus: 'Numéro d’ordre introuvable.',
  traiteeLe: '2026-09-18T12:00:00Z',
};

describe('CandidaturesAdminComponent', () => {
  let fixture: ComponentFixture<CandidaturesAdminComponent>;
  let service: jasmine.SpyObj<AdminService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<AdminService>('AdminService', ['candidatures', 'valider', 'refuser']);
    service.candidatures.and.returnValue(of([EN_ATTENTE]));

    TestBed.configureTestingModule({
      imports: [CandidaturesAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: service },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(CandidaturesAdminComponent);
  });

  /** Premier rendu puis stabilisation des ngModel (asynchrones). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim() === libelle);
  }

  /** Champ de motif de la premiere candidature (le name dynamique est porte par NgModel, pas par le DOM). */
  function champMotif(): HTMLInputElement {
    return fixture.nativeElement.querySelector('li form input');
  }

  async function saisirMotif(valeur: string) {
    const champ = champMotif();
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    await afficher();
  }

  it('liste par defaut les candidatures en attente, avec « Valider » et un refus motive', async () => {
    await afficher();

    expect(service.candidatures).toHaveBeenCalledWith('EN_ATTENTE');
    expect(texte()).toContain('Dr Amina Belkacem');
    expect(texte()).toContain('En attente');
    expect(texte()).toContain('Cardiologue · Alger (Alger) · N° d\'ordre ORD-123 · 0550000000');
    expect(texte()).toContain('18 septembre 2026');
    expect(bouton('Valider')!.disabled).toBeFalse();
    // Le motif est obligatoire : « Refuser » reste desactive tant qu'il est vide.
    expect(bouton('Refuser')!.disabled).toBeTrue();
  });

  it('filtre par statut : les refusees affichent le motif, sans bouton', async () => {
    service.candidatures.and.returnValue(of([REFUSEE]));
    await afficher();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'REFUSEE';
    select.dispatchEvent(new Event('change'));
    await afficher();

    expect(service.candidatures).toHaveBeenCalledWith('REFUSEE');
    expect(texte()).toContain('Dr Karim Haddad');
    expect(texte()).toContain('Refusée');
    expect(texte()).toContain('Motif du refus : Numéro d’ordre introuvable.');
    expect(texte()).toContain('traitée le');
    expect(bouton('Valider')).toBeUndefined();
    expect(bouton('Refuser')).toBeUndefined();
  });

  it('« Toutes » appelle l API sans statut', async () => {
    await afficher();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    await afficher();

    expect(service.candidatures).toHaveBeenCalledWith(undefined);
  });

  it('valide une candidature, confirme et recharge la liste', async () => {
    service.valider.and.returnValue(of({ ...EN_ATTENTE, statut: 'VALIDEE', traiteeLe: '2026-09-18T12:00:00Z' }));
    await afficher();

    bouton('Valider')!.click();
    await afficher();

    expect(service.valider).toHaveBeenCalledWith('c1');
    expect(texte()).toContain('Candidature de Dr Amina Belkacem validée');
    expect(service.candidatures).toHaveBeenCalledTimes(2);
  });

  it('refuse avec le motif saisi', async () => {
    service.refuser.and.returnValue(of(REFUSEE));
    await afficher();

    await saisirMotif('Numéro d’ordre introuvable.');
    expect(bouton('Refuser')!.disabled).toBeFalse();

    bouton('Refuser')!.click();
    await afficher();

    expect(service.refuser).toHaveBeenCalledWith('c1', 'Numéro d’ordre introuvable.');
    expect(texte()).toContain('Candidature de Dr Amina Belkacem refusée');
    expect(service.candidatures).toHaveBeenCalledTimes(2);
  });

  it('n envoie pas un refus dont le motif est vide', async () => {
    await afficher();

    await saisirMotif('   ');
    expect(bouton('Refuser')!.disabled).toBeTrue();
    fixture.componentInstance.refuser(EN_ATTENTE);
    fixture.detectChanges();

    expect(service.refuser).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez le motif du refus.');
  });

  it('affiche le { erreur } d un 409 (deja traitee) et recharge', async () => {
    service.valider.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Seule une candidature en attente peut etre validee.' } })),
    );
    await afficher();

    bouton('Valider')!.click();
    await afficher();

    expect(texte()).toContain('Seule une candidature en attente peut etre validee.');
    expect(service.candidatures).toHaveBeenCalledTimes(2);
  });

  it('affiche le { erreur } d un 400 (motif manquant cote API) sans recharger', async () => {
    service.refuser.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Le motif du refus est obligatoire.' } })),
    );
    await afficher();

    await saisirMotif('x');
    bouton('Refuser')!.click();
    await afficher();

    expect(texte()).toContain('Le motif du refus est obligatoire.');
    expect(service.candidatures).toHaveBeenCalledTimes(1);
  });

  it('affiche un message quand aucune candidature ne correspond au filtre', async () => {
    service.candidatures.and.returnValue(of([]));
    await afficher();

    expect(texte()).toContain('Aucune candidature pour ce filtre.');
  });

  it("indique que la page est reservee a l'administrateur sur un 403", async () => {
    service.candidatures.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain("Cette page est réservée à l'administrateur.");
  });
});
