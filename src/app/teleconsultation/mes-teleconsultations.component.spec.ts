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
import { LangueService } from '../partage/langue.service';
import { MesTeleconsultationsComponent } from './mes-teleconsultations.component';
import { Teleconsultation, TeleconsultationService } from './teleconsultation.service';

const CONSENTEMENT =
  "En rejoignant cette téléconsultation, vous acceptez qu'elle se déroule en vidéo via un service tiers (Jitsi Meet). " +
  "Aucun enregistrement n'est réalisé par Ndawik.";

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

/** Rendez-vous qui commence dans 5 minutes : la salle est ouverte (15 min avant a 2 h apres). */
function rendezVousImminent(): RendezVous {
  return { ...RENDEZ_VOUS, debut: new Date(Date.now() + 5 * 60 * 1000).toISOString() };
}

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
    expect(texte()).toContain('7 décembre 2026');
  });

  it('affiche le lien « Rejoindre la téléconsultation » (nouvel onglet, noopener) apres le consentement', async () => {
    service.consentir.and.returnValue(of(CONSENTIE));
    rendezVous.mes.and.returnValue(of([rendezVousImminent()]));
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
    rendezVous.mes.and.returnValue(of([rendezVousImminent()]));
    await afficher();

    const liens: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a[target="_blank"]'));
    expect(liens.length).toBe(1);
    expect(texte()).not.toContain(CONSENTEMENT);
    expect(texte()).toContain('Terminée');
  });

  it('explique l etat comme l appli : terminee, annulee, ou lien de salle pas encore disponible', async () => {
    service.mes.and.returnValue(
      of([
        { ...CONSENTIE, id: 't2', statut: 'TERMINEE' },
        { ...CONSENTIE, id: 't3', statut: 'ANNULEE' },
        { ...CONSENTIE, id: 't4', lienSalle: null },
      ]),
    );
    await afficher();

    expect(texte()).toContain('Cette téléconsultation est terminée.');
    expect(texte()).toContain('Cette téléconsultation a été annulée.');
    expect(texte()).toContain('Le lien de la salle sera disponible prochainement.');
  });

  it('n ajoute pas de texte d etat quand le consentement est attendu ou la salle accessible', async () => {
    service.mes.and.returnValue(of([SANS_CONSENTEMENT, CONSENTIE]));
    rendezVous.mes.and.returnValue(of([rendezVousImminent()]));
    await afficher();

    expect(fixture.nativeElement.querySelector('.texte-etat')).toBeNull();
  });

  it('desactive « Rejoindre » hors de la fenetre (15 min avant a 2 h apres) avec une indication', async () => {
    service.mes.and.returnValue(of([CONSENTIE]));
    await afficher();

    expect(lienSalle()).toBeNull();
    expect(bouton('Rejoindre la téléconsultation')?.disabled).toBeTrue();
    expect(texte()).toContain('Disponible 15 min avant le rendez-vous');

    rendezVous.mes.and.returnValue(of([{ ...RENDEZ_VOUS, debut: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }]));
    fixture.componentInstance.charger();
    fixture.detectChanges();
    expect(lienSalle()).toBeNull();
    expect(texte()).toContain('Le créneau de cette téléconsultation est passé');
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
  });

  it('indique qu une page est reservee aux patients sur un 403', async () => {
    service.mes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Cette page est réservée aux patients.');
  });

  describe('en arabe (comme l\'appli)', () => {
    beforeEach(() => TestBed.inject(LangueService).ar.set(true));
    afterEach(() => TestBed.inject(LangueService).ar.set(false));

    it('affiche titre, statut, consentement et bouton en arabe, de droite a gauche', async () => {
      await afficher();

      const main: HTMLElement = fixture.nativeElement.querySelector('main');
      expect(main.getAttribute('dir')).toBe('rtl');
      expect(texte()).toContain('استشاراتي عن بُعد');
      expect(texte()).toContain('مبرمجة');
      expect(texte()).toContain('لا يقوم نداويك بأي تسجيل.');
      expect(texte()).toContain('07/12/2026');
      expect(bouton('أوافق')).toBeDefined();
      expect(texte()).not.toContain('Je donne mon consentement');
      expect(texte()).not.toContain('Planifiée');
    });

    it('explique en arabe qu\'une teleconsultation terminee ou annulee n\'a plus d\'action', async () => {
      service.mes.and.returnValue(of([{ ...CONSENTIE, statut: 'TERMINEE' }]));
      await afficher();
      expect(texte()).toContain('انتهت هذه الاستشارة عن بُعد.');
      expect(texte()).toContain('منتهية');

      service.mes.and.returnValue(of([{ ...CONSENTIE, statut: 'ANNULEE' }]));
      fixture.componentInstance.charger();
      fixture.detectChanges();
      expect(texte()).toContain('تم إلغاء هذه الاستشارة عن بُعد.');
    });

    it('affiche la liste vide et les erreurs en arabe', async () => {
      service.mes.and.returnValue(of([]));
      await afficher();
      expect(texte()).toContain('لا توجد استشارات عن بُعد حاليًا.');

      service.mes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      fixture.componentInstance.charger();
      fixture.detectChanges();
      expect(texte()).toContain('تعذّر تحميل استشاراتك عن بُعد.');
    });
  });
});
