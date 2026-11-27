import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LangueService } from '../partage/langue.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { Teleconsultation, TeleconsultationService } from '../teleconsultation/teleconsultation.service';
import { AgendaMedecinComponent } from './agenda-medecin.component';
import { MedecinService } from './medecin.service';
import { PatientResume, PatientsService } from './patients.service';

const JOUR = 24 * 3600_000;
/** Dans `n` jours (negatif : il y a), a `heure` heure locale. */
function dansJours(n: number, heure = 10): string {
  const d = new Date(Date.now() + n * JOUR);
  d.setHours(heure, 0, 0, 0);
  return d.toISOString();
}

const CONFIRME: RendezVous = { id: 'r1', patientId: 'p1', medecinId: 'm1', debut: dansJours(20), statut: 'CONFIRME', creneauId: 'c1' };
const HONORE: RendezVous = { ...CONFIRME, id: 'r2', debut: dansJours(-30), statut: 'HONORE' };
/** Rendez-vous confirme d'aujourd'hui, deja commence : il peut etre marque honore. */
const COMMENCE: RendezVous = { ...CONFIRME, id: 'r3', debut: new Date(Date.now() - 1000).toISOString(), statut: 'CONFIRME' };

const PATIENT: PatientResume = { patientId: 'p1', nomComplet: 'Yasmine Benali', telephone: '0550123456', email: null };

const PLANIFIEE: Teleconsultation = {
  id: 't1',
  rendezVousId: 'r1',
  patientId: 'p1',
  medecinId: 'm1',
  statut: 'PLANIFIEE',
  consentementPatientLe: null,
  lienSalle: 'https://meet.jit.si/tabibi-0123456789abcdef0123456789abcdef',
  creeLe: '2026-09-18T10:00:00Z',
  demarreeLe: null,
  termineeLe: null,
};

/** Agenda du medecin : proposition d'une teleconsultation et annulation d'un rendez-vous confirme. */
describe('AgendaMedecinComponent', () => {
  let fixture: ComponentFixture<AgendaMedecinComponent>;
  let medecinService: jasmine.SpyObj<MedecinService>;
  let teleconsultations: jasmine.SpyObj<TeleconsultationService>;

  beforeEach(() => {
    localStorage.removeItem('tabibi.langue'); // la langue memorisee par un autre test ne doit pas fuiter
    registerLocaleData(localeFr);
    medecinService = jasmine.createSpyObj<MedecinService>('MedecinService', ['agenda', 'honorer', 'annulerRendezVous', 'marquerAbsent']);
    medecinService.agenda.and.returnValue(of([CONFIRME, HONORE]));
    teleconsultations = jasmine.createSpyObj<TeleconsultationService>('TeleconsultationService', ['planifier']);
    const patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['patientsDuMedecin']);
    patients.patientsDuMedecin.and.returnValue(of(new Map([[PATIENT.patientId, PATIENT]])));

    TestBed.configureTestingModule({
      imports: [AgendaMedecinComponent],
      providers: [
        provideRouter([]),
        { provide: MedecinService, useValue: medecinService },
        { provide: TeleconsultationService, useValue: teleconsultations },
        { provide: PatientsService, useValue: patients },
        { provide: AuthService, useValue: { seConnecter: jasmine.createSpy('seConnecter') } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(AgendaMedecinComponent);
    // Ces essais couvrent la teleconsultation ouverte ; le cas « Bientôt » (fermee) a son propre essai.
    fixture.componentInstance.visio = true;
  });

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function boutonsProposer(): HTMLButtonElement[] {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.filter((b) => b.textContent?.includes('Proposer une téléconsultation'));
  }

  function boutonsAnnuler(): HTMLButtonElement[] {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.filter((b) => b.textContent?.trim() === 'Annuler');
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim().startsWith(libelle));
  }

  it('affiche par defaut les rendez-vous a venir avec le nom et le telephone du patient', () => {
    fixture.detectChanges();

    const lignes: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(lignes.length).toBe(1);
    expect(lignes[0].textContent).toContain('Confirmé');
    expect(lignes[0].textContent).toContain('Yasmine Benali');
    expect(lignes[0].textContent).toContain('0550123456');
    expect(lignes[0].textContent).not.toContain('p1');
    expect(boutonsProposer().length).toBe(1);
    expect(boutonsAnnuler().length).toBe(1);
    // Pas encore commence : « Marquer honoré » n'est pas propose.
    expect(bouton('Marquer honoré')).toBeUndefined();
    expect(texte()).toContain('À venir (1)');
    expect(texte()).toContain('Passés (1)');
  });

  it('l onglet « Passés » liste les rendez-vous passes, sans action', () => {
    fixture.detectChanges();

    bouton('Passés')!.click();
    fixture.detectChanges();

    const lignes: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(lignes.length).toBe(1);
    expect(lignes[0].textContent).toContain('Honoré');
    expect(lignes[0].querySelector('button')).toBeNull();
  });

  it('« Marquer honoré » n apparait qu une fois le rendez-vous commence ; seul ce bouton passe en attente', () => {
    medecinService.agenda.and.returnValue(of([COMMENCE, CONFIRME]));
    medecinService.honorer.and.returnValue(of(undefined));
    fixture.detectChanges();

    const honorer = bouton('Marquer honoré')!;
    expect(honorer).toBeDefined();
    // Le rendez-vous commence ne propose plus de teleconsultation (il est passe).
    expect(boutonsProposer().length).toBe(1);
    honorer.click();
    fixture.detectChanges();

    expect(medecinService.honorer).toHaveBeenCalledWith('r3');
    expect(texte()).toContain('marqué honoré');
    expect(medecinService.agenda).toHaveBeenCalledTimes(2);
  });

  it('previent que le rendez-vous commence sera honore d office apres 24 h (pas sur un rendez-vous a venir)', () => {
    medecinService.agenda.and.returnValue(of([COMMENCE]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.note-cloture').length).toBe(1);
    expect(texte()).toContain('24 h après son début');

    medecinService.agenda.and.returnValue(of([CONFIRME]));
    fixture = TestBed.createComponent(AgendaMedecinComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.note-cloture').length).toBe(0);
  });

  it('pas de bouton « Annuler » sur un rendez-vous passe (le serveur le refuse)', () => {
    medecinService.agenda.and.returnValue(of([COMMENCE]));
    fixture.detectChanges();

    expect(boutonsAnnuler().length).toBe(0);
  });

  it('planifie la teleconsultation puis affiche une confirmation avec la date du rendez-vous', () => {
    teleconsultations.planifier.and.returnValue(of(PLANIFIEE));
    fixture.detectChanges();

    boutonsProposer()[0].click();
    fixture.detectChanges();

    expect(teleconsultations.planifier).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('Téléconsultation proposée au patient pour le rendez-vous du');
    expect(fixture.nativeElement.querySelector('a[href="/medecin/teleconsultations"]')).not.toBeNull();
  });

  it('affiche le motif { erreur } d un 409 (deja planifiee ou rendez-vous non confirme)', () => {
    teleconsultations.planifier.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Une teleconsultation est deja planifiee sur ce rendez-vous.' } })),
    );
    fixture.detectChanges();

    boutonsProposer()[0].click();
    fixture.detectChanges();

    expect(texte()).toContain('Une teleconsultation est deja planifiee sur ce rendez-vous.');
    expect(texte()).not.toContain('Téléconsultation proposée au patient');
    expect(boutonsProposer()[0].disabled).toBeFalse();
  });

  it('« Annuler » demande confirmation dans la page (Non / Oui), annule, confirme et recharge l agenda', () => {
    medecinService.annulerRendezVous.and.returnValue(of({ ...CONFIRME, statut: 'ANNULE' }));
    fixture.detectChanges();

    boutonsAnnuler()[0].click();
    fixture.detectChanges();
    expect(texte()).toContain('Annuler ce rendez-vous ?');
    bouton('Non')!.click();
    fixture.detectChanges();
    expect(medecinService.annulerRendezVous).not.toHaveBeenCalled();
    expect(texte()).not.toContain('Annuler ce rendez-vous ?');

    boutonsAnnuler()[0].click();
    fixture.detectChanges();
    bouton('Oui')!.click();
    fixture.detectChanges();

    expect(medecinService.annulerRendezVous).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('Rendez-vous du');
    expect(texte()).toContain('annulé : le créneau est de nouveau proposé et le patient est prévenu.');
    expect(medecinService.agenda).toHaveBeenCalledTimes(2);
  });

  it('RDV pris au telephone : pas de « Rédiger une ordonnance » et le patient n est pas dit prévenu', () => {
    const TEL: RendezVous = { ...CONFIRME, source: 'TELEPHONE', nomPatient: 'Amine B.' };
    medecinService.agenda.and.returnValue(of([TEL]));
    medecinService.annulerRendezVous.and.returnValue(of({ ...TEL, statut: 'ANNULE' }));
    fixture.detectChanges();
    expect(texte()).not.toContain('Rédiger une ordonnance');

    boutonsAnnuler()[0].click();
    fixture.detectChanges();
    expect(texte()).toContain('Annuler ce rendez-vous ?');
    expect(texte()).not.toContain('Le patient sera prévenu');
    bouton('Oui')!.click();
    fixture.detectChanges();
    expect(texte()).toContain('annulé : le créneau est de nouveau proposé.');
    expect(texte()).not.toContain('prévenu');
  });

  it('RDV annulé (ANNULE ou ANNULEE) : pas de « Rédiger une ordonnance »', () => {
    medecinService.agenda.and.returnValue(of([{ ...CONFIRME, statut: 'ANNULE' }, { ...CONFIRME, id: 'r9', statut: 'ANNULEE' }]));
    fixture.detectChanges();
    expect(texte()).not.toContain('Rédiger une ordonnance');
  });

  it('statut « absent » ou source « telephone » en minuscules, ou sans patient : pas de « Rédiger une ordonnance » (comme l appli)', () => {
    medecinService.agenda.and.returnValue(of([
      { ...CONFIRME, statut: 'absent' },
      { ...CONFIRME, id: 'r8', source: 'telephone' },
      { ...CONFIRME, id: 'r7', patientId: '' },
    ]));
    fixture.detectChanges();
    expect(texte()).not.toContain('Rédiger une ordonnance');
  });

  it('un RDV en ligne garde « Rédiger une ordonnance »', () => {
    fixture.detectChanges();
    expect(texte()).toContain('Rédiger une ordonnance');
  });

  it('affiche le motif { erreur } d un 409 a l annulation (plus confirme) et recharge l agenda', () => {
    medecinService.annulerRendezVous.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Seul un rendez-vous confirme peut etre annule.' } })),
    );
    fixture.detectChanges();

    boutonsAnnuler()[0].click();
    fixture.detectChanges();
    bouton('Oui')!.click();
    fixture.detectChanges();

    expect(texte()).toContain('Seul un rendez-vous confirme peut etre annule.');
    expect(texte()).not.toContain('le patient est prévenu');
    expect(medecinService.agenda).toHaveBeenCalledTimes(2);
  });

  it('« Patient absent » n apparait que sur un rendez-vous commence, demande confirmation puis enregistre', () => {
    medecinService.agenda.and.returnValue(of([COMMENCE, CONFIRME]));
    medecinService.marquerAbsent.and.returnValue(of({ ...COMMENCE, statut: 'ABSENT' }));
    fixture.detectChanges();

    const boutonsAbsent = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .filter((b) => b.textContent?.trim() === 'Patient absent');
    expect(boutonsAbsent.length).toBe(1);

    boutonsAbsent[0].click();
    fixture.detectChanges();
    expect(texte()).toContain('Signaler le patient absent');
    expect(medecinService.marquerAbsent).not.toHaveBeenCalled();
    bouton('Oui')!.click();
    fixture.detectChanges();

    expect(medecinService.marquerAbsent).toHaveBeenCalledWith('r3');
    expect(texte()).toContain('Patient signalé absent');
    expect(medecinService.agenda).toHaveBeenCalledTimes(2);
  });

  it('libelle un rendez-vous ABSENT « Absent »', () => {
    medecinService.agenda.and.returnValue(of([{ ...HONORE, statut: 'ABSENT' }]));
    fixture.detectChanges();
    bouton('Passés')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('li .badge-statut').textContent.trim()).toBe('Absent');
  });

  it('visio fermee (lancement) : aucun bouton « Proposer une téléconsultation »', async () => {
    fixture.componentInstance.visio = false;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Proposer une téléconsultation');
  });
  describe('message apres deplacement', () => {
    const CRENEAU = { id: 'c9', medecinId: 'm1', debut: '2027-01-05T10:00:00Z', dureeMinutes: 30, disponible: false };

    async function deplacer(rdv: RendezVous): Promise<string> {
      medecinService.agenda.and.returnValue(of([rdv]));
      fixture.detectChanges();
      await fixture.whenStable();
      const c = fixture.componentInstance;
      c.aDeplacer.set(rdv.id);
      c.apresDeplacement(CRENEAU);
      return c.deplace();
    }

    it('rendez-vous pris sur la plateforme : le patient est prévenu', async () => {
      expect(await deplacer(CONFIRME)).toContain('le patient est prévenu');
    });

    it('rendez-vous pris par téléphone : ne dit pas que le patient est prévenu', async () => {
      const message = await deplacer({ ...CONFIRME, source: 'TELEPHONE', nomPatient: 'Amine B.' });
      expect(message).toContain('Rendez-vous déplacé au');
      expect(message).not.toContain('prévenu');
    });
  });

  describe('en arabe, comme dans l\'appli', () => {
    afterEach(() => localStorage.removeItem('tabibi.langue'));

    it('libelles, statut, sens RTL et sélecteur de langue', async () => {
      TestBed.inject(LangueService).definir(true);
      const arabe = fixture;
      arabe.detectChanges();
      await arabe.whenStable();
      arabe.detectChanges();

      const racine: HTMLElement = arabe.nativeElement;
      expect(racine.querySelector('main')!.getAttribute('dir')).toBe('rtl');
      expect(racine.querySelector('h1')!.textContent).toContain('المواعيد');
      expect(racine.textContent).toContain('القادمة (1)');
      expect(racine.textContent).toContain('السابقة (1)');
      expect(racine.textContent).toContain('مؤكد');
      expect(racine.textContent).toContain('Yasmine Benali');
      expect(racine.textContent).toContain('نقل');
      expect(racine.textContent).toContain('إلغاء');
      expect(racine.textContent).toContain('كتابة وصفة');
      expect(racine.textContent).not.toContain('Confirmé');
      expect(racine.textContent).not.toContain('Déplacer');
      expect(racine.querySelector('app-selecteur-langue')).not.toBeNull();
    });

    it('un patient absent du répertoire s\'affiche « مريض », jamais « Patient » en français', async () => {
      TestBed.inject(LangueService).definir(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.nom('inconnu')).toBe('مريض inconnu');
    });

    it('messages d\'action en arabe (annulation, déplacement, erreur)', async () => {
      TestBed.inject(LangueService).definir(true);
      const arabe = fixture;
      const c = arabe.componentInstance;
      arabe.detectChanges();
      await arabe.whenStable();
      c.apresDeplacement({ id: 'c9', medecinId: 'm1', debut: '2027-01-05T10:00:00Z', dureeMinutes: 30, disponible: false });
      expect(c.deplace()).toContain('تم نقل الموعد إلى');
      expect(c.deplace()).toContain('تم إعلام المريض');
      medecinService.agenda.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: {} })));
      c.charger();
      arabe.detectChanges();
      expect(arabe.nativeElement.querySelector('[role="alert"]').textContent).toContain('تعذّر تحميل المواعيد.');
    });
  });
});
