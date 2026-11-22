import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOCALE_ID, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { PatientsService } from '../medecin/patients.service';
import { Moi } from '../moi/moi.service';
import { LangueService } from '../partage/langue.service';
import { MesConversationsComponent } from './mes-conversations.component';
import { Conversation, MessagerieService } from './messagerie.service';

const PATIENT = '22222222-2222-2222-2222-222222222222';
const MEDECIN_ID = '33333333-3333-3333-3333-333333333333';

const RECENTE: Conversation = {
  id: 'c1',
  patientId: PATIENT,
  medecinId: MEDECIN_ID,
  creeLe: '2026-09-18T10:00:00Z',
  dernierMessageLe: '2026-09-18T10:05:00Z',
  nonLus: 2,
  fermee: false,
};

const ANCIENNE: Conversation = {
  id: 'c2',
  patientId: PATIENT,
  medecinId: 'm2',
  creeLe: '2026-09-10T10:00:00Z',
  dernierMessageLe: '2026-09-10T10:00:00Z',
  nonLus: 0,
  fermee: false,
};

const MEDECIN: Medecin = {
  id: MEDECIN_ID,
  nomComplet: 'Dr Amina Belkacem',
  specialiteSlug: 'generaliste',
  specialiteFr: 'Généraliste',
  wilayaCode: '16',
  wilayaFr: 'Alger',
  ville: 'Alger',
};

describe('MesConversationsComponent', () => {
  let fixture: ComponentFixture<MesConversationsComponent>;
  let service: jasmine.SpyObj<MessagerieService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let patients: jasmine.SpyObj<PatientsService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let profil: Moi | null;
  let estMedecin: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    profil = { sujet: PATIENT, nom: 'patient.demo', roles: ['PATIENT'] };
    estMedecin = signal(false);
    service = jasmine.createSpyObj<MessagerieService>('MessagerieService', ['mesConversations']);
    service.mesConversations.and.returnValue(of([ANCIENNE, RECENTE]));
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.callFake((id) => of({ ...MEDECIN, id, nomComplet: id === MEDECIN_ID ? MEDECIN.nomComplet : 'Dr Karim Haddad' }));
    patients = jasmine.createSpyObj<PatientsService>('PatientsService', ['patientsDuMedecin']);
    patients.patientsDuMedecin.and.returnValue(of(new Map()));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesConversationsComponent],
      providers: [
        provideRouter([]),
        { provide: MessagerieService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: PatientsService, useValue: patients },
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: { charger: () => Promise.resolve(profil), estMedecin } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(MesConversationsComponent);
  });

  /** Lance ngOnInit (attente de l'etat de connexion et du profil) puis rafraichit la vue. */
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

  it('liste mes conversations, la plus recente activite d abord, avec le nom du medecin et les non lus (patient)', async () => {
    await afficher();

    const items = lignes();
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Dr Amina Belkacem');
    expect(items[0].textContent).toContain('18 septembre');
    expect(items[0].textContent).toContain('2 non lus');
    expect(items[0].classList).toContain('conversation-non-lue');
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('/messagerie/c1');
    expect(items[1].textContent).toContain('Dr Karim Haddad');
    expect(items[1].textContent).not.toContain('non lus');
    expect(items[1].classList).not.toContain('conversation-non-lue');
    expect(annuaire.medecin).toHaveBeenCalledTimes(2);
  });

  it('accorde « non lu » au singulier pour un seul message non lu', async () => {
    service.mesConversations.and.returnValue(of([{ ...RECENTE, nonLus: 1 }]));
    await afficher();

    expect(texte()).toContain('1 non lu');
    expect(texte()).not.toContain('1 non lus');
  });

  it('designe l interlocuteur par « Patient » et un identifiant abrege quand je suis le medecin', async () => {
    profil = { sujet: MEDECIN_ID, nom: 'medecin.demo', roles: ['MEDECIN'] };
    estMedecin.set(true);
    service.mesConversations.and.returnValue(of([RECENTE]));
    await afficher();

    expect(texte()).toContain('Patient 22222222');
    expect(texte()).not.toContain('Dr Amina Belkacem');
    expect(annuaire.medecin).not.toHaveBeenCalled();
  });

  it('affiche le nom du patient (liste des patients du medecin) quand je suis le medecin', async () => {
    profil = { sujet: MEDECIN_ID, nom: 'medecin.demo', roles: ['MEDECIN'] };
    estMedecin.set(true);
    service.mesConversations.and.returnValue(of([RECENTE]));
    patients.patientsDuMedecin.and.returnValue(
      of(new Map([[PATIENT, { patientId: PATIENT, nomComplet: 'Lina Mansouri', telephone: null, email: null }]])),
    );
    await afficher();

    expect(texte()).toContain('Lina Mansouri');
    expect(texte()).not.toContain('Patient 22222222');
  });

  it('affiche un message quand il n y a aucune conversation', async () => {
    service.mesConversations.and.returnValue(of([]));
    await afficher();

    expect(lignes().length).toBe(0);
    expect(texte()).toContain('Aucune conversation pour le moment.');
    expect(texte()).toContain('Trouver un praticien');
  });

  it('redirige vers la connexion si l utilisateur n est pas connecte', async () => {
    auth.estConnecte = () => false;
    await afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.mesConversations).not.toHaveBeenCalled();
  });

  it('indique que la page est reservee aux patients et aux medecins sur un 403', async () => {
    service.mesConversations.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Cette page est réservée aux patients et aux médecins.');
  });

  it('affiche la page en arabe (de droite a gauche) avec les memes mots que l appli', async () => {
    TestBed.inject(LangueService).ar.set(true);
    try {
      await afficher();

      expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
      expect(texte()).toContain('الرسائل');
      expect(texte()).toContain('2 غير مقروءة');
      expect(texte()).toContain('آخر رسالة في');
      expect(texte()).toContain('18/09/2026');
      expect(texte()).not.toContain('non lus');

      service.mesConversations.and.returnValue(of([]));
      fixture = TestBed.createComponent(MesConversationsComponent);
      await afficher();
      expect(texte()).toContain('لا توجد محادثات حاليًا.');
      expect(texte()).toContain('ابحث عن طبيب');
    } finally {
      TestBed.inject(LangueService).ar.set(false);
    }
  });

  it('dit « Aucun message » quand la date du dernier message manque, au lieu d une phrase vide', async () => {
    service.mesConversations.and.returnValue(of([{ ...RECENTE, dernierMessageLe: '', creeLe: '' }]));
    await afficher();

    expect(texte()).toContain('Aucun message');
    expect(texte()).not.toContain('Dernier message le');
  });

  it('dit « Ouverte le … » (comme l appli) quand il n y a pas de dernier message mais une date d ouverture', async () => {
    service.mesConversations.and.returnValue(of([{ ...RECENTE, dernierMessageLe: '', creeLe: '2026-09-18T10:00:00Z' }]));
    await afficher();

    expect(texte()).toContain('Ouverte le');
    expect(texte()).not.toContain('Aucun message');
  });
  it('classe une conversation sans date de dernier message d après sa date d ouverture, et celles sans date en dernier (comme l appli)', async () => {
    const sansMessage = { ...ANCIENNE, id: 'c3', medecinId: 'm3', dernierMessageLe: '', creeLe: '2026-09-15T10:00:00Z' };
    const sansDate = { ...ANCIENNE, id: 'c4', medecinId: 'm4', dernierMessageLe: '', creeLe: '' };
    service.mesConversations.and.returnValue(of([sansDate, ANCIENNE, sansMessage, RECENTE]));
    await afficher();

    const ids = Array.from(fixture.nativeElement.querySelectorAll('a[href^="/messagerie/"]')).map((a) => (a as HTMLAnchorElement).getAttribute('href'));
    expect(ids).toEqual(['/messagerie/c1', '/messagerie/c3', '/messagerie/c2', '/messagerie/c4']);
  });
});
