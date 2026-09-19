import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, Reponse } from '../dawini/dawini.service';
import { EspacePharmacieComponent } from './espace-pharmacie.component';

const CLE = 'tabibi.pharmacie.nom';

const BESOIN: Besoin = {
  id: 'b1',
  patientId: null,
  medicament: 'Amoxicilline 1 g',
  wilayaCode: '16',
  commune: 'Bab Ezzouar',
  precision: 'Boîte de 14 comprimés',
  statut: 'OUVERT',
  publieLe: '2026-09-18T10:00:00Z',
  clotureLe: null,
  nombreReponses: 2,
};

const REPONSE: Reponse = {
  id: 'rp1',
  besoinId: 'b1',
  pharmacieId: 'ph1',
  nomPharmacie: 'Pharmacie El Amel',
  disponible: true,
  prixDa: 850,
  commentaire: null,
  repondueLe: '2026-09-18T11:00:00Z',
};

describe('EspacePharmacieComponent', () => {
  let fixture: ComponentFixture<EspacePharmacieComponent>;
  let service: jasmine.SpyObj<DawiniService>;

  /** Le stockage local est un confort : les tests ne dependent pas de sa disponibilite. */
  function memoriser(nom: string | null) {
    try {
      if (nom === null) localStorage.removeItem(CLE);
      else localStorage.setItem(CLE, nom);
    } catch {
      // Stockage indisponible : le test verifie alors le comportement sans memorisation.
    }
  }

  function lireMemorise(): string | null {
    try {
      return localStorage.getItem(CLE);
    } catch {
      return null;
    }
  }

  beforeEach(() => {
    registerLocaleData(localeFr);
    memoriser(null);
    service = jasmine.createSpyObj<DawiniService>('DawiniService', ['besoinsOuverts', 'repondre']);
    service.besoinsOuverts.and.returnValue(of([BESOIN]));

    TestBed.configureTestingModule({
      imports: [EspacePharmacieComponent],
      providers: [
        { provide: DawiniService, useValue: service },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(EspacePharmacieComponent);
  });

  afterEach(() => memoriser(null));

  /** Premier rendu puis stabilisation des ngModel (asynchrones). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[name="${nom}"]`);
  }

  async function saisir(nom: string, valeur: string) {
    const c = champ(nom);
    c.value = valeur;
    c.dispatchEvent(new Event('input'));
    await afficher();
  }

  async function chercher(wilaya: string) {
    await saisir('wilayaCode', wilaya);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();
  }

  /** Formulaire de reponse de la premiere demande. */
  function formulaireReponse(): HTMLFormElement | null {
    return fixture.nativeElement.querySelector('li form');
  }

  async function cocherDisponible(oui: boolean) {
    const radios: HTMLInputElement[] = Array.from(formulaireReponse()!.querySelectorAll('input[type="radio"]'));
    const radio = radios[oui ? 0 : 1];
    radio.click();
    radio.dispatchEvent(new Event('change'));
    await afficher();
  }

  async function saisirDansReponse(selecteur: string, valeur: string) {
    const c: HTMLInputElement = formulaireReponse()!.querySelector(selecteur)!;
    c.value = valeur;
    c.dispatchEvent(new Event('input'));
    await afficher();
  }

  function repondre() {
    formulaireReponse()!.dispatchEvent(new Event('submit'));
  }

  it('exige une wilaya puis liste les demandes ouvertes avec un formulaire de reponse par demande', async () => {
    await afficher();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();
    expect(service.besoinsOuverts).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez le code de votre wilaya.');

    await chercher('16');
    expect(service.besoinsOuverts).toHaveBeenCalledWith('16');
    expect(texte()).toContain('Amoxicilline 1 g');
    expect(texte()).toContain('Wilaya 16 · Bab Ezzouar');
    expect(texte()).toContain('Boîte de 14 comprimés');
    expect(texte()).toContain('2 réponses');
    expect(formulaireReponse()).not.toBeNull();
    expect(formulaireReponse()!.querySelectorAll('input[type="radio"]').length).toBe(2);
    expect(formulaireReponse()!.querySelector('input[type="number"]')).not.toBeNull();
  });

  it('refuse une reponse sans nom de pharmacie ou sans disponibilite', async () => {
    await afficher();
    await chercher('16');

    repondre();
    await afficher();
    expect(service.repondre).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez le nom de votre pharmacie.');

    await saisirDansReponse('input:not([type="radio"]):not([type="number"])', 'Pharmacie El Amel');
    repondre();
    await afficher();
    expect(service.repondre).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez si le médicament est disponible.');
  });

  it('envoie la reponse, memorise le nom de la pharmacie, confirme et remplace le formulaire', async () => {
    service.repondre.and.returnValue(of(REPONSE));
    await afficher();
    await chercher('16');

    await saisirDansReponse('input:not([type="radio"]):not([type="number"])', '  Pharmacie El Amel ');
    await cocherDisponible(true);
    await saisirDansReponse('input[type="number"]', '850');
    repondre();
    await afficher();

    expect(service.repondre).toHaveBeenCalledWith('b1', { nomPharmacie: 'Pharmacie El Amel', disponible: true, prixDa: 850, commentaire: null });
    expect(texte()).toContain('Réponse envoyée pour « Amoxicilline 1 g »');
    expect(texte()).toContain('Vous avez répondu à cette demande.');
    expect(formulaireReponse()).toBeNull();
    expect(service.besoinsOuverts).toHaveBeenCalledTimes(2);
    if (lireMemorise() !== null) expect(lireMemorise()).toBe('Pharmacie El Amel');
  });

  it('preremplit le nom de la pharmacie memorise et envoie une indisponibilite sans prix', async () => {
    memoriser('Pharmacie du Centre');
    if (lireMemorise() === null) return; // stockage indisponible dans ce navigateur
    service.repondre.and.returnValue(of({ ...REPONSE, disponible: false, prixDa: null }));
    fixture = TestBed.createComponent(EspacePharmacieComponent);
    await afficher();
    await chercher('16');

    const nom: HTMLInputElement = formulaireReponse()!.querySelector('input:not([type="radio"]):not([type="number"])')!;
    expect(nom.value).toBe('Pharmacie du Centre');

    await cocherDisponible(false);
    repondre();
    await afficher();

    expect(service.repondre).toHaveBeenCalledWith('b1', { nomPharmacie: 'Pharmacie du Centre', disponible: false, prixDa: null, commentaire: null });
  });

  it('affiche le { erreur } d un 409 (demande cloturee ou deja repondue) et recharge la liste', async () => {
    service.repondre.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Cette pharmacie a deja repondu a ce besoin.' } })),
    );
    await afficher();
    await chercher('16');

    await saisirDansReponse('input:not([type="radio"]):not([type="number"])', 'Pharmacie El Amel');
    await cocherDisponible(true);
    repondre();
    await afficher();

    expect(texte()).toContain('Cette pharmacie a deja repondu a ce besoin.');
    expect(service.besoinsOuverts).toHaveBeenCalledTimes(2);
    expect(texte()).not.toContain('Vous avez répondu à cette demande.');
  });

  it('affiche le { erreur } d un 400 de la recherche et un etat vide sans demande', async () => {
    service.besoinsOuverts.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La wilaya est obligatoire.' } })));
    await afficher();
    await chercher('xx');
    expect(texte()).toContain('La wilaya est obligatoire.');

    service.besoinsOuverts.and.returnValue(of([]));
    await chercher('31');
    expect(texte()).toContain('Aucune demande ouverte dans cette wilaya.');
  });
});
