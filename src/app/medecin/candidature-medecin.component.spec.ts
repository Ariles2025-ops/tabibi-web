import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Candidature, DemandeCandidature } from '../admin/admin.service';
import { AuthService } from '../auth/auth.service';
import { CandidatureMedecinComponent } from './candidature-medecin.component';
import { MedecinService } from './medecin.service';

const DEMANDE: DemandeCandidature = {
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'cardiologue',
  specialiteFr: 'Cardiologue',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
  numeroOrdre: 'ORD-123',
  telephone: '0550000000',
};

const EN_ATTENTE: Candidature = {
  id: 'c1',
  medecinId: 'm1',
  ...DEMANDE,
  statut: 'EN_ATTENTE',
  motifRefus: null,
  deposeeLe: '2026-09-18T10:00:00Z',
  traiteeLe: null,
};

const VALIDEE: Candidature = { ...EN_ATTENTE, statut: 'VALIDEE', traiteeLe: '2026-09-18T12:00:00Z' };

const REFUSEE: Candidature = { ...EN_ATTENTE, statut: 'REFUSEE', motifRefus: 'Numéro d’ordre introuvable.', traiteeLe: '2026-09-18T12:00:00Z' };

const AUCUNE = () => throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'Aucune candidature deposee.' } }));

describe('CandidatureMedecinComponent', () => {
  let fixture: ComponentFixture<CandidatureMedecinComponent>;
  let service: jasmine.SpyObj<MedecinService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<MedecinService>('MedecinService', ['maCandidature', 'deposerCandidature']);
    service.maCandidature.and.returnValue(AUCUNE());

    TestBed.configureTestingModule({
      imports: [CandidatureMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: service },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(CandidatureMedecinComponent);
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

  function formulaire(): HTMLFormElement | null {
    return fixture.nativeElement.querySelector('form');
  }

  function champ(nom: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[name="${nom}"]`);
  }

  async function saisir(valeurs: Partial<DemandeCandidature>) {
    for (const [nom, valeur] of Object.entries(valeurs)) {
      const c = champ(nom);
      c.value = valeur;
      c.dispatchEvent(new Event('input'));
    }
    await afficher();
  }

  function soumettre() {
    formulaire()!.dispatchEvent(new Event('submit'));
  }

  it('propose le formulaire quand aucune candidature n a ete deposee (404)', async () => {
    await afficher();

    expect(formulaire()).not.toBeNull();
    expect(texte()).not.toContain('Nouvelle candidature');
    for (const nom of ['nomComplet', 'specialiteSlug', 'specialiteFr', 'wilayaCode', 'wilayaFr', 'ville', 'numeroOrdre', 'telephone']) {
      expect(champ(nom)).withContext(nom).not.toBeNull();
    }
    expect(texte()).not.toContain('Aucune candidature deposee.');
  });

  it('refuse cote client un depot sans les champs obligatoires', async () => {
    await afficher();

    await saisir({ nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'cardiologue' });
    soumettre();
    await afficher();

    expect(service.deposerCandidature).not.toHaveBeenCalled();
    expect(texte()).toContain("Renseignez le nom complet, la spécialité, la wilaya et le numéro d'inscription à l'ordre.");
  });

  it('depose la candidature (champs nettoyes) puis affiche son statut en attente sans formulaire', async () => {
    service.deposerCandidature.and.returnValue(of(EN_ATTENTE));
    await afficher();

    await saisir({ ...DEMANDE, nomComplet: '  Dr Amina Belkacem ', ville: ' Alger ' });
    soumettre();
    await afficher();

    expect(service.deposerCandidature).toHaveBeenCalledWith(DEMANDE);
    expect(texte()).toContain('Candidature déposée');
    expect(texte()).toContain('En attente');
    expect(texte()).toContain("Votre candidature est en cours d'examen.");
    expect(formulaire()).toBeNull();
  });

  it('affiche une candidature validee avec le lien vers la fiche, sans formulaire', async () => {
    service.maCandidature.and.returnValue(of(VALIDEE));
    await afficher();

    expect(texte()).toContain('Validée');
    expect(texte()).toContain('Votre candidature a été validée : vous figurez dans l\'annuaire.');
    expect(fixture.nativeElement.querySelector('a[href="/medecins/m1"]')).not.toBeNull();
    expect(formulaire()).toBeNull();
  });

  it('affiche le motif d une candidature refusee et un formulaire de nouveau depot prerempli', async () => {
    service.maCandidature.and.returnValue(of(REFUSEE));
    await afficher();

    expect(texte()).toContain('Refusée');
    expect(texte()).toContain('Motif : Numéro d’ordre introuvable.');
    expect(formulaire()).not.toBeNull();
    expect(texte()).toContain('Nouvelle candidature');
    expect(champ('nomComplet').value).toBe('Dr Amina Belkacem');
    expect(champ('numeroOrdre').value).toBe('ORD-123');
    expect(champ('wilayaFr').value).toBe('Alger');
  });

  it('affiche le { erreur } d un 409 et recharge la candidature existante', async () => {
    service.deposerCandidature.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: "Une candidature est deja en attente d'examen." } })),
    );
    service.maCandidature.and.returnValues(AUCUNE(), of(EN_ATTENTE));
    await afficher();

    await saisir(DEMANDE);
    soumettre();
    await afficher();

    expect(texte()).toContain("Une candidature est deja en attente d'examen.");
    expect(texte()).toContain('En attente');
    expect(formulaire()).toBeNull();
  });

  it('affiche le { erreur } d un 400 et garde le formulaire', async () => {
    service.deposerCandidature.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'La wilaya est obligatoire.' } })),
    );
    await afficher();

    await saisir(DEMANDE);
    soumettre();
    await afficher();

    expect(texte()).toContain('La wilaya est obligatoire.');
    expect(formulaire()).not.toBeNull();
  });

  it('indique que la page est reservee aux medecins sur un 403', async () => {
    service.maCandidature.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Cette page est réservée aux médecins.');
    expect(formulaire()).toBeNull();
  });
});
