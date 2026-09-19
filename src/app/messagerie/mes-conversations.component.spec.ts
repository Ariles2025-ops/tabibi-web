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
import { Moi } from '../moi/moi.service';
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
};

const ANCIENNE: Conversation = {
  id: 'c2',
  patientId: PATIENT,
  medecinId: 'm2',
  creeLe: '2026-09-10T10:00:00Z',
  dernierMessageLe: '2026-09-10T10:00:00Z',
  nonLus: 0,
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
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [MesConversationsComponent],
      providers: [
        provideRouter([]),
        { provide: MessagerieService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
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

  it('designe l interlocuteur par « Patient » et un identifiant abrege quand je suis le medecin', async () => {
    profil = { sujet: MEDECIN_ID, nom: 'medecin.demo', roles: ['MEDECIN'] };
    estMedecin.set(true);
    service.mesConversations.and.returnValue(of([RECENTE]));
    await afficher();

    expect(texte()).toContain('Patient 22222222');
    expect(texte()).not.toContain('Dr Amina Belkacem');
    expect(annuaire.medecin).not.toHaveBeenCalled();
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
    expect(texte()).toContain('Redirection vers la page de connexion');
  });

  it('indique que la page est reservee aux patients et aux medecins sur un 403', async () => {
    service.mesConversations.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    await afficher();

    expect(texte()).toContain('Cette page est réservée aux patients et aux médecins.');
  });
});
