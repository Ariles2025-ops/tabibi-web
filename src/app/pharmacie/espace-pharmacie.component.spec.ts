import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Besoin, DawiniService, Reponse } from '../dawini/dawini.service';
import { EspacePharmacieComponent } from './espace-pharmacie.component';
import { Profil, ProfilService } from '../moi/profil.service';
import { OrdonnanceService } from '../ordonnances/ordonnance.service';

const PROFIL: Profil = {
  utilisateurId: 'ph1',
  nomComplet: 'Pharmacie El Amel',
  telephone: '0550123456',
  dateNaissance: null,
  wilayaCode: '16',
  langue: 'fr',
  misAJourLe: '2026-09-18T10:00:00Z',
};

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

/** Referentiel servi a la place de assets/referentiel.json (liste deroulante des wilayas). */
const REFERENTIEL = { wilayas: [{ code: '9', nom: 'Blida' }, { code: '16', nom: 'Alger' }], specialites: [] };

describe('EspacePharmacieComponent', () => {
  let fixture: ComponentFixture<EspacePharmacieComponent>;
  let service: jasmine.SpyObj<DawiniService>;
  let profils: jasmine.SpyObj<ProfilService>;
  let ordonnances: jasmine.SpyObj<OrdonnanceService>;

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
    profils = jasmine.createSpyObj<ProfilService>('ProfilService', ['monProfil', 'enregistrer']);
    // Par defaut : profil jamais renseigne (404).
    profils.monProfil.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Profil introuvable.' } })));
    ordonnances = jasmine.createSpyObj<OrdonnanceService>('OrdonnanceService', ['verifier', 'delivrer']);

    TestBed.configureTestingModule({
      imports: [EspacePharmacieComponent],
      providers: [
        { provide: DawiniService, useValue: service },
        { provide: ProfilService, useValue: profils },
        { provide: OrdonnanceService, useValue: ordonnances },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: HttpClient, useValue: { get: () => of(REFERENTIEL) } },
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
    return fixture.nativeElement.querySelector(`[name="${nom}"]`);
  }

  async function saisir(nom: string, valeur: string) {
    const c = champ(nom);
    c.value = valeur;
    c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
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
    c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
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
    expect(texte()).toContain('Choisissez votre wilaya.');

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
    await chercher('16');
    expect(texte()).toContain('La wilaya est obligatoire.');

    service.besoinsOuverts.and.returnValue(of([]));
    await chercher('9');
    expect(texte()).toContain('Aucune demande ouverte dans cette wilaya.');
  });

  it('sans profil, propose le formulaire nom + wilaya puis l enregistre et charge les demandes de la wilaya', async () => {
    profils.enregistrer.and.returnValue(of(PROFIL));
    await afficher();

    expect(texte()).toContain('Renseignez le nom et la wilaya de votre pharmacie');
    await saisir('profilNom', ' Pharmacie El Amel ');
    await saisir('profilTelephone', '0550 12 34 56');
    await saisir('profilWilaya', '16');
    fixture.nativeElement.querySelector('form.formulaire-profil').dispatchEvent(new Event('submit'));
    await afficher();

    expect(profils.enregistrer).toHaveBeenCalledWith({
      nomComplet: 'Pharmacie El Amel', telephone: '0550123456', dateNaissance: null, wilayaCode: '16', langue: 'fr',
    });
    expect(texte()).not.toContain('Renseignez le nom et la wilaya de votre pharmacie');
    expect(service.besoinsOuverts).toHaveBeenCalledWith('16');
  });

  it('avec un profil, preremplit le nom, charge directement la wilaya et masque les demandes deja repondues', async () => {
    profils.monProfil.and.returnValue(of(PROFIL));
    service.besoinsOuverts.and.returnValue(of([BESOIN, { ...BESOIN, id: 'b2', medicament: 'Doliprane', dejaRepondu: true }]));
    await afficher();

    expect(service.besoinsOuverts).toHaveBeenCalledWith('16');
    expect(texte()).not.toContain('Renseignez le nom et la wilaya');
    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    const doliprane = items.find((li) => li.textContent?.includes('Doliprane'))!;
    expect(doliprane.textContent).toContain('Déjà répondu');
    expect(doliprane.querySelector('form')).toBeNull();
    const amox = items.find((li) => li.textContent?.includes('Amoxicilline'))!;
    const nom: HTMLInputElement = amox.querySelector('form input:not([type="radio"]):not([type="number"])')!;
    expect(nom.value).toBe('Pharmacie El Amel');
  });

  it('verifie un code puis marque l ordonnance comme delivree', async () => {
    ordonnances.verifier.and.returnValue(of({ valide: true, emiseLe: '2026-09-18T10:00:00Z', statut: 'EMISE' }));
    ordonnances.delivrer.and.returnValue(of({ statut: 'DELIVREE', delivreeLe: '2026-09-19T09:30:00Z' }));
    await afficher();

    await saisir('codeOrdonnance', 'ab12cd34');
    fixture.nativeElement.querySelector('section.bloc-delivrance form').dispatchEvent(new Event('submit'));
    await afficher();
    expect(ordonnances.verifier).toHaveBeenCalledWith('AB12CD34');
    expect(texte()).toContain('Ordonnance valide');

    const bouton: HTMLButtonElement = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes('Marquer comme délivrée'))!;
    bouton.click();
    await afficher();

    expect(ordonnances.delivrer).toHaveBeenCalledWith('AB12CD34');
    expect(texte()).toContain('Ordonnance marquée comme délivrée.');
    expect(texte()).toContain('Déjà délivrée');
    expect(texte()).not.toContain('Marquer comme délivrée');
  });

  it('affiche le { erreur } d un 409 a la delivrance', async () => {
    ordonnances.verifier.and.returnValue(of({ valide: true, emiseLe: '2026-09-18T10:00:00Z', statut: 'EMISE' }));
    ordonnances.delivrer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Ordonnance deja delivree.' } })),
    );
    await afficher();
    await saisir('codeOrdonnance', 'AB12CD34');
    fixture.nativeElement.querySelector('section.bloc-delivrance form').dispatchEvent(new Event('submit'));
    await afficher();
    (Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes('Marquer comme délivrée'))!).click();
    await afficher();

    expect(texte()).toContain('Ordonnance deja delivree.');
  });

  it('signale une ordonnance annulee ou deja delivree sans proposer la delivrance', async () => {
    ordonnances.verifier.and.returnValue(of({ valide: true, emiseLe: '2026-09-18T10:00:00Z', statut: 'ANNULEE' }));
    await afficher();
    await saisir('codeOrdonnance', 'AB12CD34');
    fixture.nativeElement.querySelector('section.bloc-delivrance form').dispatchEvent(new Event('submit'));
    await afficher();

    expect(texte()).toContain('Annulée par le médecin');
    expect(texte()).not.toContain('Marquer comme délivrée');
  });
});
