import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { PatientsService } from '../medecin/patients.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { EspaceSecretaireComponent } from './espace-secretaire.component';
import { Rattachement, SecretaireService } from './secretaire.service';

const CABINET_1: Rattachement = { id: 'ra1', medecinId: 'm1', secretaireId: 's1', creeLe: '2026-09-01T10:00:00Z' };
const CABINET_2: Rattachement = { id: 'ra2', medecinId: 'm2', secretaireId: 's1', creeLe: '2026-09-10T10:00:00Z' };

const MEDECINS: Record<string, Medecin> = {
  m1: { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
  m2: { id: 'm2', nomComplet: 'Dr Karim Haddad', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue', wilayaCode: '31', wilayaFr: 'Oran', ville: 'Oran' },
};

const PATIENT_ID = '11111111-1111-1111-1111-111111111111';
/** Rendez-vous confirme d'aujourd'hui, deja commence (il peut etre marque honore). */
const CONFIRME: RendezVous = { id: 'r1', patientId: PATIENT_ID, medecinId: 'm1', debut: new Date(Date.now() - 1000).toISOString(), statut: 'CONFIRME', creneauId: 'c1' };
/** Rendez-vous confirme dans dix jours : pas encore honorable. */
const FUTUR: RendezVous = { ...CONFIRME, id: 'r3', debut: new Date(Date.now() + 10 * 24 * 3600_000).toISOString() };
const HONORE: RendezVous = { ...CONFIRME, id: 'r2', debut: new Date(Date.now() - 60 * 24 * 3600_000).toISOString(), statut: 'HONORE' };

const DEMAIN = new Date(Date.now() + 24 * 3600_000);
DEMAIN.setHours(10, 0, 0, 0);
const LIBRE = { id: 'c9', medecinId: 'm1', debut: DEMAIN.toISOString(), dureeMinutes: 30, disponible: true };
const RESERVE = { ...LIBRE, id: 'c8', debut: new Date(DEMAIN.getTime() + 30 * 60_000).toISOString(), disponible: false };

describe('EspaceSecretaireComponent', () => {
  let fixture: ComponentFixture<EspaceSecretaireComponent>;
  let service: jasmine.SpyObj<SecretaireService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<SecretaireService>('SecretaireService', [
      'mesMedecins',
      'agenda',
      'ouvrirCreneau',
      'honorer',
      'annuler',
      'marquerAbsent',
      'creneaux',
      'supprimerCreneau',
    ]);
    service.mesMedecins.and.returnValue(of([CABINET_1]));
    service.agenda.and.returnValue(of([CONFIRME, HONORE]));
    service.creneaux.and.returnValue(of([]));
    const patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['patientsDuCabinet']);
    patients.patientsDuCabinet.and.returnValue(
      of(new Map([[PATIENT_ID, { patientId: PATIENT_ID, nomComplet: 'Lina Mansouri', telephone: '0770112233', email: null }]])),
    );
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.callFake((id: string) => of(MEDECINS[id]));
    auth = { seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [EspaceSecretaireComponent],
      providers: [
        provideRouter([]),
        { provide: SecretaireService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: PatientsService, useValue: patients },
        { provide: AuthService, useValue: auth },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(EspaceSecretaireComponent);
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

  function lignes(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li.rendez-vous'));
  }

  function selecteur(): HTMLSelectElement | null {
    return fixture.nativeElement.querySelector('select[name="medecinId"]');
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim().startsWith(libelle));
  }

  async function saisir(nom: string, valeur: string) {
    const champ: HTMLInputElement = fixture.nativeElement.querySelector(`input[name="${nom}"]`);
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    await afficher();
  }

  /** Date locale dans un an, au format du champ datetime-local, et son equivalent ISO 8601 UTC. */
  function dansUnAn(): { local: string; iso: string } {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    d.setHours(9, 30, 0, 0);
    const deux = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T09:30`;
    return { local, iso: d.toISOString() };
  }

  it('choisit d office l unique cabinet et affiche les rendez-vous a venir avec le nom du patient', async () => {
    await afficher();

    expect(selecteur()!.value).toBe('m1');
    expect(texte()).toContain('Dr Amina Belkacem');
    expect(service.agenda).toHaveBeenCalledWith('m1');
    const items = lignes();
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Confirmé');
    expect(items[0].textContent).toContain('Lina Mansouri');
    expect(items[0].textContent).toContain('0770112233');
    expect(items[0].textContent).not.toContain('11111111');
    expect(bouton('Marquer honoré')).toBeDefined();
    expect(bouton('Annuler')).toBeDefined();

    bouton('Passés')!.click();
    await afficher();
    expect(lignes().length).toBe(1);
    expect(lignes()[0].textContent).toContain('Honoré');
    expect(lignes()[0].querySelector('button')).toBeNull();
  });

  it('ne propose pas « Marquer honoré » avant le debut du rendez-vous', async () => {
    service.agenda.and.returnValue(of([FUTUR]));
    await afficher();

    expect(lignes().length).toBe(1);
    expect(bouton('Marquer honoré')).toBeUndefined();
    expect(bouton('Patient absent')).toBeUndefined();
    expect(bouton('Annuler')).toBeDefined();
  });

  it('signale un patient absent apres confirmation dans la page, puis recharge l agenda', async () => {
    service.marquerAbsent.and.returnValue(of({ ...CONFIRME, statut: 'ABSENT' }));
    await afficher();

    bouton('Patient absent')!.click();
    await afficher();
    expect(texte()).toContain('Signaler le patient absent');
    bouton('Non')!.click();
    await afficher();
    expect(service.marquerAbsent).not.toHaveBeenCalled();

    bouton('Patient absent')!.click();
    await afficher();
    bouton('Oui')!.click();
    await afficher();

    expect(service.marquerAbsent).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('Patient signalé absent');
    expect(service.agenda).toHaveBeenCalledTimes(2);
  });

  it('propose le choix du medecin quand il y a plusieurs cabinets, puis charge son agenda', async () => {
    service.mesMedecins.and.returnValue(of([CABINET_2, CABINET_1]));
    await afficher();

    expect(service.agenda).not.toHaveBeenCalled();
    const options = Array.from(selecteur()!.options).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Choisir un médecin', 'Dr Amina Belkacem', 'Dr Karim Haddad']);
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    selecteur()!.value = 'm2';
    selecteur()!.dispatchEvent(new Event('change'));
    await afficher();

    expect(service.agenda).toHaveBeenCalledWith('m2');
    expect(service.creneaux).toHaveBeenCalledWith('m2');
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    expect(lignes().length).toBe(1);
  });

  it('marque un rendez-vous honore, confirme et recharge l agenda', async () => {
    service.honorer.and.returnValue(of({ ...CONFIRME, statut: 'HONORE' }));
    await afficher();

    bouton('Marquer honoré')!.click();
    await afficher();

    expect(service.honorer).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('marqué honoré');
    expect(service.agenda).toHaveBeenCalledTimes(2);
  });

  it('annule un rendez-vous apres confirmation dans la page ; le patient est prevenu', async () => {
    service.annuler.and.returnValue(of({ ...CONFIRME, statut: 'ANNULE' }));
    await afficher();

    bouton('Annuler')!.click();
    await afficher();
    expect(texte()).toContain('Annuler ce rendez-vous ?');
    bouton('Non')!.click();
    await afficher();
    expect(service.annuler).not.toHaveBeenCalled();

    bouton('Annuler')!.click();
    await afficher();
    bouton('Oui')!.click();
    await afficher();

    expect(service.annuler).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('annulé : le patient est prévenu.');
    expect(service.agenda).toHaveBeenCalledTimes(2);
  });

  it('rendez-vous pris par telephone : ne dit pas que le patient est prevenu', async () => {
    const TEL: RendezVous = { ...CONFIRME, source: 'TELEPHONE', nomPatient: 'Karim Ziani' };
    service.agenda.and.returnValue(of([TEL]));
    service.annuler.and.returnValue(of({ ...TEL, statut: 'ANNULE' }));
    await afficher();

    bouton('Annuler')!.click();
    await afficher();
    expect(texte()).toContain('Pensez à prévenir le patient par téléphone.');
    expect(texte()).not.toContain('Le patient sera prévenu');
    bouton('Oui')!.click();
    await afficher();

    expect(service.annuler).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('annulé : le créneau est de nouveau proposé.');
    expect(texte()).not.toContain('le patient est prévenu.');
  });

  it('affiche le motif { erreur } d un 409 (plus confirme) et recharge l agenda', async () => {
    service.honorer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: 'Seul un rendez-vous confirme peut etre honore.' } })),
    );
    await afficher();

    bouton('Marquer honoré')!.click();
    await afficher();

    expect(texte()).toContain('Seul un rendez-vous confirme peut etre honore.');
    expect(service.agenda).toHaveBeenCalledTimes(2);
  });

  it('ouvre un creneau : heure locale convertie en ISO 8601 UTC, duree en minutes, puis confirmation', async () => {
    service.ouvrirCreneau.and.returnValue(of({ id: 'c2', medecinId: 'm1', debut: '2027-01-01T08:30:00Z', dureeMinutes: 20, disponible: true }));
    const { local, iso } = dansUnAn();
    await afficher();

    await saisir('debut', local);
    await saisir('dureeMinutes', '20');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();

    expect(service.ouvrirCreneau).toHaveBeenCalledWith('m1', iso, 20);
    expect(texte()).toContain('Créneau ouvert le');
    expect(texte()).toContain('(20 min)');
  });

  it('refuse cote client une duree hors de 5..120 minutes et affiche le { erreur } d un 400', async () => {
    const { local } = dansUnAn();
    await afficher();

    await saisir('debut', local);
    await saisir('dureeMinutes', '180');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();
    expect(service.ouvrirCreneau).not.toHaveBeenCalled();
    expect(texte()).toContain('Indiquez une durée entre 5 et 120 minutes.');

    service.ouvrirCreneau.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Le creneau doit commencer dans le futur.' } })),
    );
    await saisir('dureeMinutes', '30');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await afficher();
    expect(service.ouvrirCreneau).toHaveBeenCalledTimes(1);
    expect(texte()).toContain('Le creneau doit commencer dans le futur.');
  });

  it('explique quoi faire sans rattachement, et le 403 sur un agenda non rattache', async () => {
    service.mesMedecins.and.returnValue(of([]));
    await afficher();
    expect(texte()).toContain("Aucun médecin ne vous a encore rattachée à son cabinet.");
    expect(selecteur()).toBeNull();

    service.mesMedecins.and.returnValue(of([CABINET_1]));
    service.agenda.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Non rattachee.' } })));
    fixture = TestBed.createComponent(EspaceSecretaireComponent);
    await afficher();
    expect(texte()).toContain('Ce cabinet ne vous est pas rattaché.');
    expect(lignes().length).toBe(0);
  });

  it('indique que la page est reservee aux secretaires sur un 403 et renvoie vers la connexion sur un 401', async () => {
    service.mesMedecins.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();
    expect(texte()).toContain('Cette page est réservée aux secrétaires.');

    service.mesMedecins.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    fixture = TestBed.createComponent(EspaceSecretaireComponent);
    await afficher();
    expect(auth.seConnecter).toHaveBeenCalled();
  });

  it('liste les creneaux a venir du medecin et supprime un creneau libre apres confirmation', async () => {
    service.creneaux.and.returnValue(of([RESERVE, LIBRE]));
    service.supprimerCreneau.and.returnValue(of(undefined));
    await afficher();

    const creneaux: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li.creneau'));
    expect(creneaux.length).toBe(2);
    expect(creneaux[0].textContent).toContain('Libre');
    expect(creneaux[1].textContent).toContain('Réservé');
    expect(creneaux[1].querySelector('button')).toBeNull();

    (creneaux[0].querySelector('button') as HTMLButtonElement).click();
    await afficher();
    expect(texte()).toContain('Supprimer ce créneau ?');
    bouton('Oui')!.click();
    await afficher();

    expect(service.supprimerCreneau).toHaveBeenCalledWith('m1', 'c9');
    expect(service.creneaux).toHaveBeenCalledTimes(2);
  });

  it('propose « RDV pris au telephone » sur un creneau libre seulement et ouvre le formulaire', async () => {
    service.creneaux.and.returnValue(of([RESERVE, LIBRE]));
    await afficher();

    const creneaux: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li.creneau'));
    expect(creneaux[1].textContent).not.toContain('RDV pris au téléphone');
    const bouton = creneaux[0].querySelector('.rdv-telephone-bouton') as HTMLButtonElement;
    expect(bouton.textContent).toContain('RDV pris au téléphone');
    bouton.click();
    await afficher();
    expect(fixture.nativeElement.querySelector('app-rdv-telephone form')).not.toBeNull();
    expect(texte()).toContain('Nom du patient');
  });
});
