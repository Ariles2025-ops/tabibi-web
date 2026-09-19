import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RendezVous } from '../rendezvous/rendezvous.service';
import { EspaceSecretaireComponent } from './espace-secretaire.component';
import { Rattachement, SecretaireService } from './secretaire.service';

const CABINET_1: Rattachement = { id: 'ra1', medecinId: 'm1', secretaireId: 's1', creeLe: '2026-09-01T10:00:00Z' };
const CABINET_2: Rattachement = { id: 'ra2', medecinId: 'm2', secretaireId: 's1', creeLe: '2026-09-10T10:00:00Z' };

const MEDECINS: Record<string, Medecin> = {
  m1: { id: 'm1', nomComplet: 'Dr Amina Belkacem', specialiteSlug: 'generaliste', specialiteFr: 'Généraliste', wilayaCode: '16', wilayaFr: 'Alger', ville: 'Alger' },
  m2: { id: 'm2', nomComplet: 'Dr Karim Haddad', specialiteSlug: 'cardiologue', specialiteFr: 'Cardiologue', wilayaCode: '31', wilayaFr: 'Oran', ville: 'Oran' },
};

const CONFIRME: RendezVous = { id: 'r1', patientId: '11111111-1111-1111-1111-111111111111', medecinId: 'm1', debut: '2026-12-07T09:00:00Z', statut: 'CONFIRME', creneauId: 'c1' };
const HONORE: RendezVous = { ...CONFIRME, id: 'r2', debut: '2026-09-01T09:00:00Z', statut: 'HONORE' };

describe('EspaceSecretaireComponent', () => {
  let fixture: ComponentFixture<EspaceSecretaireComponent>;
  let service: jasmine.SpyObj<SecretaireService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { seConnecter: jasmine.Spy };

  beforeEach(() => {
    registerLocaleData(localeFr);
    service = jasmine.createSpyObj<SecretaireService>('SecretaireService', ['mesMedecins', 'agenda', 'ouvrirCreneau', 'honorer', 'annuler']);
    service.mesMedecins.and.returnValue(of([CABINET_1]));
    service.agenda.and.returnValue(of([CONFIRME, HONORE]));
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.callFake((id: string) => of(MEDECINS[id]));
    auth = { seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [EspaceSecretaireComponent],
      providers: [
        provideRouter([]),
        { provide: SecretaireService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
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
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  function selecteur(): HTMLSelectElement | null {
    return fixture.nativeElement.querySelector('select[name="medecinId"]');
  }

  function bouton(libelle: string): HTMLButtonElement | undefined {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    return boutons.find((b) => b.textContent?.trim() === libelle);
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

  it('choisit d office l unique cabinet et affiche son agenda avec les actions sur les seuls CONFIRME', async () => {
    await afficher();

    expect(selecteur()!.value).toBe('m1');
    expect(texte()).toContain('Dr Amina Belkacem');
    expect(service.agenda).toHaveBeenCalledWith('m1');
    const items = lignes();
    expect(items.length).toBe(2);
    // Tri chronologique : honore (septembre) avant confirme (decembre).
    expect(items[0].textContent).toContain('Honoré');
    expect(items[0].querySelector('button')).toBeNull();
    expect(items[1].textContent).toContain('Confirmé');
    expect(items[1].textContent).toContain('Patient 11111111');
    expect(items[1].textContent).not.toContain('11111111-1111');
    expect(bouton('Marquer honoré')).toBeDefined();
    expect(bouton('Annuler')).toBeDefined();
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
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    expect(lignes().length).toBe(2);
  });

  it('marque un rendez-vous honore, confirme et recharge l agenda', async () => {
    service.honorer.and.returnValue(of({ ...CONFIRME, statut: 'HONORE' }));
    await afficher();

    bouton('Marquer honoré')!.click();
    await afficher();

    expect(service.honorer).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('marqué honoré');
    expect(texte()).toContain('7 décembre');
    expect(service.agenda).toHaveBeenCalledTimes(2);
  });

  it('annule un rendez-vous apres confirmation ; le patient est prevenu', async () => {
    const confirmation = spyOn(window, 'confirm').and.returnValue(false);
    service.annuler.and.returnValue(of({ ...CONFIRME, statut: 'ANNULE' }));
    await afficher();

    bouton('Annuler')!.click();
    await afficher();
    expect(service.annuler).not.toHaveBeenCalled();

    confirmation.and.returnValue(true);
    bouton('Annuler')!.click();
    await afficher();

    expect(service.annuler).toHaveBeenCalledWith('r1');
    expect(texte()).toContain('annulé : le patient est prévenu.');
    expect(service.agenda).toHaveBeenCalledTimes(2);
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
});
