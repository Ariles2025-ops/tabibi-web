import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { AvisService, SyntheseAvis } from '../avis/avis.service';
import { InscriptionAttente, ListeAttenteService } from '../liste-attente/liste-attente.service';
import { Conversation, MessagerieService } from '../messagerie/messagerie.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { FicheMedecinComponent } from './fiche-medecin.component';

const MEDECIN: Medecin = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

const CONVERSATION: Conversation = {
  id: 'c1',
  patientId: 'p1',
  medecinId: 'm1',
  creeLe: '2026-09-18T10:00:00Z',
  dernierMessageLe: '2026-09-18T10:00:00Z',
  nonLus: 0,
};

const INSCRIPTION: InscriptionAttente = { id: 'i1', patientId: 'p1', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' };

const SYNTHESE: SyntheseAvis = {
  moyenne: 4.5,
  nombre: 2,
  avis: [
    { id: 'a1', note: 5, commentaire: 'Très bon accueil.', deposeLe: '2026-09-18T10:00:00Z' },
    { id: 'a2', note: 4, commentaire: null, deposeLe: '2026-09-10T10:00:00Z' },
  ],
};

/** Fiche du praticien : « Écrire au médecin », synthese des avis et liste d'attente (les creneaux et la reservation datent de la v0.3.0). */
describe('FicheMedecinComponent (messagerie, avis et liste d attente)', () => {
  let fixture: ComponentFixture<FicheMedecinComponent>;
  let messagerie: jasmine.SpyObj<MessagerieService>;
  let avis: jasmine.SpyObj<AvisService>;
  let listeAttente: jasmine.SpyObj<ListeAttenteService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let naviguer: jasmine.Spy;

  beforeEach(() => {
    registerLocaleData(localeFr);
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin', 'creneaux']);
    annuaire.medecin.and.returnValue(of(MEDECIN));
    annuaire.creneaux.and.returnValue(of([]));
    messagerie = jasmine.createSpyObj<MessagerieService>('MessagerieService', ['ouvrir']);
    avis = jasmine.createSpyObj<AvisService>('AvisService', ['synthese']);
    avis.synthese.and.returnValue(of(SYNTHESE));
    listeAttente = jasmine.createSpyObj<ListeAttenteService>('ListeAttenteService', ['inscrire']);
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [FicheMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'm1' })) } },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: RendezVousService, useValue: jasmine.createSpyObj<RendezVousService>('RendezVousService', ['reserver']) },
        { provide: MessagerieService, useValue: messagerie },
        { provide: AvisService, useValue: avis },
        { provide: ListeAttenteService, useValue: listeAttente },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    naviguer = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(FicheMedecinComponent);
  });

  /** Premier rendu puis stabilisation (le clic attend l'etat de connexion). */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function boutonEcrire(): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes('Écrire au médecin'));
  }

  function boutonInscrire(): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes("M'inscrire sur la liste d'attente"));
  }

  it('affiche la fiche avec le bouton « Écrire au médecin », qui ouvre la conversation puis mene au fil', async () => {
    messagerie.ouvrir.and.returnValue(of(CONVERSATION));
    await afficher();

    expect(texte()).toContain('Dr Amina Belkacem');
    expect(texte()).toContain('Généraliste · Alger (Alger)');
    expect(boutonEcrire()).toBeDefined();

    boutonEcrire()!.click();
    await afficher();

    expect(messagerie.ouvrir).toHaveBeenCalledWith('m1');
    expect(naviguer).toHaveBeenCalledWith(['/messagerie', 'c1']);
    expect(auth.seConnecter).not.toHaveBeenCalled();
  });

  it('explique qu un rendez-vous avec le medecin est necessaire sur un 403', async () => {
    messagerie.ouvrir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Aucun rendez-vous commun.' } })));
    await afficher();

    boutonEcrire()!.click();
    await afficher();

    expect(texte()).toContain('Vous devez avoir un rendez-vous avec ce médecin pour lui écrire.');
    expect(naviguer).not.toHaveBeenCalled();
    expect(boutonEcrire()!.disabled).toBeFalse();
  });

  it('envoie un visiteur non connecte vers la connexion sans ouvrir de conversation', async () => {
    auth.estConnecte = () => false;
    await afficher();

    boutonEcrire()!.click();
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(messagerie.ouvrir).not.toHaveBeenCalled();
  });

  it('affiche la synthese publique des avis du praticien', async () => {
    await afficher();

    expect(avis.synthese).toHaveBeenCalledWith('m1');
    expect(texte()).toContain('Avis des patients');
    expect(texte()).toContain('4,5 / 5 (2 avis)');
    expect(texte()).toContain('Très bon accueil.');
  });

  it('propose l inscription sur la liste d attente quand aucun creneau n est disponible, puis confirme', async () => {
    listeAttente.inscrire.and.returnValue(of(INSCRIPTION));
    await afficher();

    expect(texte()).toContain('Aucun créneau disponible pour le moment.');
    expect(texte()).toContain("Vous serez notifié dès qu'un créneau se libère.");
    expect(boutonInscrire()).toBeDefined();

    boutonInscrire()!.click();
    await afficher();

    expect(listeAttente.inscrire).toHaveBeenCalledWith('m1');
    expect(texte()).toContain("Vous êtes inscrit sur la liste d'attente de ce praticien.");
    expect(fixture.nativeElement.querySelector('a[href="/liste-attente"]')).not.toBeNull();
    expect(boutonInscrire()).toBeUndefined();
  });

  it('indique « Vous êtes déjà inscrit sur cette liste. » sur un 409', async () => {
    listeAttente.inscrire.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Vous etes deja inscrit sur la liste d attente de ce medecin.' } })),
    );
    await afficher();

    boutonInscrire()!.click();
    await afficher();

    expect(texte()).toContain('Vous êtes déjà inscrit sur cette liste.');
    expect(fixture.nativeElement.querySelector('a[href="/liste-attente"]')).not.toBeNull();
    expect(boutonInscrire()).toBeUndefined();
  });

  it('envoie un visiteur non connecte vers la connexion sans l inscrire, et explique le 403 a un compte non patient', async () => {
    auth.estConnecte = () => false;
    await afficher();

    boutonInscrire()!.click();
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
    expect(listeAttente.inscrire).not.toHaveBeenCalled();

    auth.estConnecte = () => true;
    listeAttente.inscrire.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    boutonInscrire()!.click();
    await afficher();
    expect(texte()).toContain("Seul un compte patient peut s'inscrire sur une liste d'attente.");
    expect(boutonInscrire()!.disabled).toBeFalse();
  });
});
