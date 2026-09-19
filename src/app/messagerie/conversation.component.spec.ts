import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LOCALE_ID, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { Moi } from '../moi/moi.service';
import { ConversationComponent } from './conversation.component';
import { Conversation, Message, MessagerieService } from './messagerie.service';

const PATIENT = '22222222-2222-2222-2222-222222222222';
const MEDECIN_ID = '33333333-3333-3333-3333-333333333333';

const CONVERSATION: Conversation = {
  id: 'c1',
  patientId: PATIENT,
  medecinId: MEDECIN_ID,
  creeLe: '2026-09-18T10:00:00Z',
  dernierMessageLe: '2026-09-18T10:05:00Z',
  nonLus: 1,
};

const DU_PATIENT: Message = {
  id: 'm1',
  conversationId: 'c1',
  auteurId: PATIENT,
  contenu: 'Bonjour docteur, dois-je poursuivre le traitement ?',
  envoyeLe: '2026-09-18T10:05:00Z',
  luLe: '2026-09-18T10:06:00Z',
};

const DU_MEDECIN: Message = {
  id: 'm2',
  conversationId: 'c1',
  auteurId: MEDECIN_ID,
  contenu: 'Oui, jusqu au prochain rendez-vous.',
  envoyeLe: '2026-09-18T10:07:00Z',
  luLe: null,
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

describe('ConversationComponent', () => {
  let fixture: ComponentFixture<ConversationComponent>;
  let service: jasmine.SpyObj<MessagerieService>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let auth: { pret: () => Promise<void>; estConnecte: () => boolean; seConnecter: jasmine.Spy };
  let profil: Moi | null;
  let estMedecin: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    profil = { sujet: PATIENT, nom: 'patient.demo', roles: ['PATIENT'] };
    estMedecin = signal(false);
    service = jasmine.createSpyObj<MessagerieService>('MessagerieService', ['mesConversations', 'messages', 'envoyer']);
    service.mesConversations.and.returnValue(of([CONVERSATION]));
    service.messages.and.returnValue(of([DU_PATIENT, DU_MEDECIN]));
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin']);
    annuaire.medecin.and.returnValue(of(MEDECIN));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    TestBed.configureTestingModule({
      imports: [ConversationComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'c1' })) } },
        { provide: MessagerieService, useValue: service },
        { provide: AnnuaireService, useValue: annuaire },
        { provide: AuthService, useValue: auth },
        { provide: RoleService, useValue: { charger: () => Promise.resolve(profil), estMedecin } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    fixture = TestBed.createComponent(ConversationComponent);
  });

  /**
   * Lance ngOnInit (etat de connexion, profil, lecture du fil) puis rafraichit la vue ; a appeler dans fakeAsync.
   * Le second tick laisse le ngModel du formulaire (affiche apres la lecture du fil) s'enregistrer, ce qui est asynchrone.
   */
  function afficher() {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function texte(): string {
    return fixture.nativeElement.textContent;
  }

  function bulles(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li'));
  }

  function zone(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea');
  }

  function boutonEnvoyer(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  function saisir(valeur: string) {
    const z = zone();
    z.value = valeur;
    z.dispatchEvent(new Event('input'));
    afficher();
  }

  it('affiche le fil avec mes messages a droite, ceux du medecin a gauche, les dates et le nom du medecin', fakeAsync(() => {
    afficher();

    expect(service.messages).toHaveBeenCalledWith('c1');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Dr Amina Belkacem');
    const items = bulles();
    expect(items.length).toBe(2);
    expect(items[0].classList).toContain('message-moi');
    expect(items[0].textContent).toContain('Bonjour docteur, dois-je poursuivre le traitement ?');
    expect(items[0].textContent).toContain('18 septembre');
    expect(items[0].textContent).toContain('· lu');
    expect(items[1].classList).toContain('message-autre');
    expect(items[1].textContent).toContain('Oui, jusqu au prochain rendez-vous.');
    expect(items[1].textContent).not.toContain('· lu');
    expect(texte()).toContain('0 / 2000');
    expect(boutonEnvoyer().disabled).toBeTrue();

    fixture.destroy();
  }));

  it('place les messages du medecin a droite et nomme le patient par un identifiant abrege quand je suis le medecin', fakeAsync(() => {
    profil = { sujet: MEDECIN_ID, nom: 'medecin.demo', roles: ['MEDECIN'] };
    estMedecin.set(true);
    afficher();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Patient 22222222');
    expect(bulles()[0].classList).toContain('message-autre');
    expect(bulles()[1].classList).toContain('message-moi');
    expect(annuaire.medecin).not.toHaveBeenCalled();

    fixture.destroy();
  }));

  it('active « Envoyer » des qu un texte est saisi, envoie le message puis recharge le fil et vide le champ', fakeAsync(() => {
    service.envoyer.and.returnValue(of({ ...DU_PATIENT, id: 'm3', contenu: 'Merci docteur.' }));
    afficher();

    saisir('  Merci docteur.  ');
    expect(texte()).toContain('18 / 2000');
    expect(boutonEnvoyer().disabled).toBeFalse();

    boutonEnvoyer().click();
    afficher();

    expect(service.envoyer).toHaveBeenCalledWith('c1', 'Merci docteur.');
    expect(service.messages).toHaveBeenCalledTimes(2);
    expect(zone().value).toBe('');
    expect(boutonEnvoyer().disabled).toBeTrue();

    fixture.destroy();
  }));

  it('n envoie pas un texte vide ni un texte de plus de 2000 caracteres', fakeAsync(() => {
    afficher();

    saisir('   ');
    expect(boutonEnvoyer().disabled).toBeTrue();
    fixture.componentInstance.envoyer();
    expect(service.envoyer).not.toHaveBeenCalled();

    saisir('a'.repeat(2001));
    expect(texte()).toContain('2001 / 2000');
    expect(boutonEnvoyer().disabled).toBeTrue();
    fixture.componentInstance.envoyer();
    expect(service.envoyer).not.toHaveBeenCalled();

    fixture.destroy();
  }));

  it('affiche le motif { erreur } d un 400 sans recharger le fil ni perdre le texte', fakeAsync(() => {
    service.envoyer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erreur: 'Le message ne peut pas depasser 2000 caracteres.' } })),
    );
    afficher();

    saisir('Bonjour');
    boutonEnvoyer().click();
    afficher();

    expect(texte()).toContain('Le message ne peut pas depasser 2000 caracteres.');
    expect(service.messages).toHaveBeenCalledTimes(1);
    expect(zone().value).toBe('Bonjour');

    fixture.destroy();
  }));

  it('relit le fil toutes les 30 secondes tant que la page est ouverte, et s arrete a la destruction', fakeAsync(() => {
    afficher();
    expect(service.messages).toHaveBeenCalledTimes(1);

    service.messages.and.returnValue(of([DU_PATIENT, DU_MEDECIN, { ...DU_MEDECIN, id: 'm3', contenu: 'Bonne journee.' }]));
    tick(30_000);
    fixture.detectChanges();
    expect(service.messages).toHaveBeenCalledTimes(2);
    expect(bulles().length).toBe(3);

    // Une erreur passagere laisse le fil tel quel et la relecture continue.
    service.messages.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    tick(30_000);
    fixture.detectChanges();
    expect(service.messages).toHaveBeenCalledTimes(3);
    expect(bulles().length).toBe(3);

    fixture.destroy();
    tick(60_000);
    expect(service.messages).toHaveBeenCalledTimes(3);
  }));

  it('indique qu une conversation ne me concerne pas sur un 403, sans champ de saisie', fakeAsync(() => {
    service.messages.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { erreur: 'Acces refuse.' } })));
    afficher();

    expect(texte()).toContain('Cette conversation ne vous concerne pas.');
    expect(zone()).toBeNull();

    fixture.destroy();
  }));

  it('redirige vers la connexion si l utilisateur n est pas connecte', fakeAsync(() => {
    auth.estConnecte = () => false;
    afficher();

    expect(auth.seConnecter).toHaveBeenCalled();
    expect(service.messages).not.toHaveBeenCalled();
    expect(texte()).toContain('Redirection vers la page de connexion');

    fixture.destroy();
  }));
});
