import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RendezVous, RendezVousService } from '../rendezvous/rendezvous.service';
import { MesTeleconsultationsComponent } from './mes-teleconsultations.component';
import { Teleconsultation, TeleconsultationService } from './teleconsultation.service';

const CONSENTEMENT =
  "En rejoignant cette téléconsultation, vous acceptez qu'elle se déroule en vidéo via un service tiers (Jitsi Meet). " +
  "Aucun enregistrement n'est réalisé par Tabibi.";

const SANS_CONSENTEMENT: Teleconsultation = {
  id: 't1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  statut: 'PLANIFIEE',
  consentementPatientLe: null,
  lienSalle: null,
  creeLe: '2026-09-18T10:00:00Z',
  demarreeLe: null,
  termineeLe: null,
};

const CONSENTIE: Teleconsultation = {
  ...SANS_CONSENTEMENT,
  consentementPatientLe: '2026-09-18T10:05:00Z',
  lienSalle: 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef',
};

const MEDECIN: Medecin = {
  id: 'm1',
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

const RENDEZ_VOUS: RendezVous = {
  id: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  debut: '2026-12-07T09:00:00Z',
  statut: 'CONFIRME',
  creneauId: 'c1',
};

describe('MesTeleconsultationsComponent', () => {
  let fixture: ComponentFixture<MesTeleconsultationsComponent>;
  let service: jasmine.SpyObj<TeleconsultationService>;
  let rendezVous: jasmine.SpyObj<RendezVousService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<TeleconsultationService>('TeleconsultationService', ['mes', 'consentir']);
    service.mes.and.returnValue(of([SANS_CONSENTEMENT]));
    rendezVous = jasmine.createSpyObj<RendezVousService>('RendezVousService', ['mes']);
    rendezVous.mes.and.returnValue(of([RENDEZ_VOUS]));
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of(MEDECIN));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesTeleconsultationsComponent],
      providers: [
        provideRouter([]),
        { provide: TeleconsultationService, useValue: service },
        { provide: RendezVousService, useValue: rendezVous },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesTeleconsultationsComponent);
  });

  /** Lance ngOnInit (attente de l'etat de connexion) puis rafraichit la vue. */
  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function lienSalle(): HTMLAnchorElement | null {
    return fixture.nativeElement.querySelector('a[target="_blank"]');
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.includes(libelle));
  }

  it('affiche l encart de consentement, sans lien de salle, tant que le patient n a pas consenti', async () => {
    await afficher();

    expect(texte()).toContain(CONSENTEMENT);
    expect(bouton('Je donne mon consentement')).toBeDefined();
    expect(lienSalle()).toBeNull();
    expect(texte()).not.toContain('Rejoindre la téléconsultation');
    expect(texte()).toContain('Planifiée');
    expect(texte()).toContain('Dr Amina Belkacem');
    expect(texte()).toContain('Rendez-vous du');
    expect(texte()).toContain('7 décembre');
  });

  it('affiche le lien « Rejoindre la téléconsultation » (nouvel onglet, noopener) apres le consentement', async () => {
    service.consentir.and.returnValue(of(CONSENTIE));
    await afficher();

    bouton('Je donne mon consentement')!.click();
    fixture.detectChanges();

    expect(service.consentir).toHaveBeenCalledWith('t1');
    expect(texte()).not.toContain(CONSENTEMENT);
    const lien = lienSalle()!;
    expect(lien).not.toBeNull();
    expect(lien.textContent).toContain('Rejoindre la téléconsultation');
    expect(lien.getAttribute('href')).toBe(CONSENTIE.lienSalle);
    expect(lien.getAttribute('rel')).toBe('noopener');
    expect(texte()).toContain('consentement donné le');
  });

  it('affiche directement le lien quand le consentement est deja donne, mais pas une fois terminee', async () => {
    service.mes.and.returnValue(of([{ ...CONSENTIE, id: 't2', statut: 'TERMINEE' }, CONSENTIE]));
    await afficher();

    const liens: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a[target="_blank"]'));
    expect(liens.length).toBe(1);
    expect(texte()).not.toContain(CONSENTEMENT);
    expect(texte()).toContain('Terminée');
  });

  it('affiche le motif { erreur } d un 409 au consentement et recharge la liste', async () => {
    service.consentir.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Cette teleconsultation est annulee.' } })),
    );
    await afficher();

    bouton('Je donne mon consentement')!.click();
    fixture.detectChanges();

    expect(texte()).toContain('Cette teleconsultation est annulee.');
    expect(service.mes).toHaveBeenCalledTimes(2);
  });

  it('affiche un message quand il n y a aucune teleconsultation', async () => {
    service.mes.and.returnValue(of([]));
    await afficher();

    expect(texte()).toContain('Aucune téléconsultation pour le moment.');
    expect(rendezVous.mes).not.toHaveBeenCalled();
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mes).not.toHaveBeenCalled();
    expect(texte()).toContain('Redirection vers la page de connexion');
  });

  it('indique qu une page est reservee aux patients sur un 403', async () => {
    service.mes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Cette page est réservée aux patients.');
  });
});
