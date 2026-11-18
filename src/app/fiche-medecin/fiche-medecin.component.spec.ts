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
import { RoleService } from '../auth/role.service';
import { signal } from '@angular/core';
import { Conversation, MessagerieService } from '../messagerie/messagerie.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { LangueService } from '../partage/langue.service';
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
  let roles: ReturnType<typeof signal<string[]>>;
  let naviguer: jasmine.Spy;
  let annuaireSpy: jasmine.SpyObj<AnnuaireService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    const annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin', 'creneaux', 'reclamable']);
    annuaire.medecin.and.returnValue(of(MEDECIN));
    annuaire.creneaux.and.returnValue(of([]));
    annuaire.reclamable.and.returnValue(of({ reclamable: false }));
    annuaireSpy = annuaire;
    messagerie = jasmine.createSpyObj<MessagerieService>('MessagerieService', ['ouvrir']);
    avis = jasmine.createSpyObj<AvisService>('AvisService', ['synthese']);
    avis.synthese.and.returnValue(of(SYNTHESE));
    listeAttente = jasmine.createSpyObj<ListeAttenteService>('ListeAttenteService', ['inscrire', 'mes']);
    listeAttente.mes.and.returnValue(of([]));
    auth = { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: jasmine.createSpy('seConnecter') };

    roles = signal<string[]>(['PATIENT']);
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
        { provide: RoleService, useValue: { roles, charger: () => Promise.resolve(null) } },
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
    expect(texte()).toContain('Généraliste');
    expect(texte()).toContain('Alger (Alger)');
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

  it('masque le bouton et explique que la messagerie est reservee aux patients pour un medecin', async () => {
    roles.set(['PATIENT', 'MEDECIN']);
    await afficher();

    expect(boutonEcrire()).toBeUndefined();
    expect(texte()).toContain('La messagerie est réservée aux patients.');
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

  describe('reservation refusee (409)', () => {
    const CRENEAU = { id: 'cr1', debut: '2026-12-01T09:00:00Z', fin: '2026-12-01T09:30:00Z' } as never;

    it('affiche le message de l API quand le patient a deja un rendez-vous avec ce medecin', async () => {
      const message = 'Vous avez déjà un rendez-vous à venir avec ce médecin : annulez-le pour en choisir un autre.';
      TestBed.inject(RendezVousService).reserver = jasmine
        .createSpy('reserver')
        .and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { erreur: message } })));
      await afficher();

      await fixture.componentInstance.reserver(CRENEAU);
      await afficher();

      expect(texte()).toContain(message);
      expect(texte()).not.toContain("Ce créneau vient d'être pris.");
    });

    it('se rabat sur « Ce créneau vient d\'être pris. » sans message de l API', async () => {
      TestBed.inject(RendezVousService).reserver = jasmine
        .createSpy('reserver')
        .and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      await afficher();

      await fixture.componentInstance.reserver(CRENEAU);
      await afficher();

      expect(texte()).toContain("Ce créneau vient d'être pris.");
    });
  });

  it('réservation en 404 (créneau supprimé) : sélection vidée, créneaux rechargés, message affiché', async () => {
    const CRENEAU = { id: 'cr1', debut: '2026-12-01T09:00:00Z', fin: '2026-12-01T09:30:00Z' } as never;
    TestBed.inject(RendezVousService).reserver = jasmine
      .createSpy('reserver')
      .and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { erreur: 'créneau introuvable' } })));
    await afficher();
    fixture.componentInstance.selection.set(CRENEAU);
    const appelsAvant = annuaireSpy.creneaux.calls.count();

    await fixture.componentInstance.reserver(CRENEAU);
    await afficher();

    expect(fixture.componentInstance.selection()).toBeNull();
    expect(annuaireSpy.creneaux.calls.count()).toBe(appelsAvant + 1);
    expect(texte()).toContain("Ce créneau n'est plus disponible.");
  });

  it('fiche non reclamee : ni « Écrire » ni liste d attente, mais « pas encore sur Ndawik » et lien vers /praticien', async () => {
    annuaireSpy.reclamable.and.returnValue(of({ reclamable: true }));
    await afficher();

    expect(boutonEcrire()).toBeUndefined();
    expect(boutonInscrire()).toBeUndefined();
    expect(texte()).toContain("Ce praticien n'est pas encore sur Ndawik");
    const lien: HTMLAnchorElement = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find((a) => a.textContent?.includes("C'est votre fiche ?"))!;
    expect(lien.getAttribute('href')).toBe('/praticien');
  });
});

/** Fiche du praticien en arabe, comme « ملف الطبيب » dans l'appli (sans toucher a la langue memorisee du navigateur). */
describe('FicheMedecinComponent (arabe)', () => {
  let fixture: ComponentFixture<FicheMedecinComponent>;
  let annuaire: jasmine.SpyObj<AnnuaireService>;
  let listeAttente: jasmine.SpyObj<ListeAttenteService>;
  let messagerie: jasmine.SpyObj<MessagerieService>;

  beforeEach(() => {
    registerLocaleData(localeFr);
    annuaire = jasmine.createSpyObj<AnnuaireService>('AnnuaireService', ['medecin', 'creneaux', 'reclamable']);
    annuaire.medecin.and.returnValue(of({ ...MEDECIN, wilayaFr: 'Alger', langues: ['fr', 'ar'], adresse: '12 rue Didouche', horaires: '9h-17h' }));
    annuaire.creneaux.and.returnValue(of([
      { id: 'c1', medecinId: 'm1', debut: '2099-12-01T09:00:00Z', fin: '2099-12-01T09:30:00Z', dureeMinutes: 30, disponible: true } as never,
    ]));
    annuaire.reclamable.and.returnValue(of({ reclamable: false }));
    listeAttente = jasmine.createSpyObj<ListeAttenteService>('ListeAttenteService', ['inscrire', 'mes']);
    listeAttente.mes.and.returnValue(of([]));
    messagerie = jasmine.createSpyObj<MessagerieService>('MessagerieService', ['ouvrir']);
    const avis = jasmine.createSpyObj<AvisService>('AvisService', ['synthese']);
    avis.synthese.and.returnValue(of(SYNTHESE));
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
        { provide: AuthService, useValue: { pret: () => Promise.resolve(), estConnecte: () => true, seConnecter: () => undefined } },
        { provide: RoleService, useValue: { roles: signal<string[]>(['PATIENT']), charger: () => Promise.resolve(null) } },
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    TestBed.inject(LangueService).ar.set(true);
    fixture = TestBed.createComponent(FicheMedecinComponent);
  });

  afterEach(() => TestBed.inject(LangueService).ar.set(false));

  async function afficher() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const texte = () => fixture.nativeElement.textContent as string;

  it('affiche reservation, infos pratiques, liste d attente et avis en arabe, de droite a gauche, sans francais', async () => {
    await afficher();

    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
    for (const mot of ['العودة إلى البحث', 'مراسلة الطبيب', 'احجز موعدًا', 'أقرب موعد متاح', 'مكان الاستشارة', 'العيادة', 'معلومات عملية',
      'التسجيل في قائمة الانتظار', 'آراء المرضى', 'ولاية الجزائر', 'الفرنسية، العربية', 'العنوان', 'أوقات العمل', '4,5 / 5 (2 رأي)']) {
      expect(texte()).withContext(mot).toContain(mot);
    }
    for (const mot of ['Retour', 'Prendre rendez-vous', "Liste d'attente", 'Écrire', 'Avis des patients', 'Prochaine', ' avis)', 'null', 'undefined']) {
      expect(texte()).withContext(mot).not.toContain(mot);
    }
  });

  it('confirme le creneau et les erreurs de reservation en arabe', async () => {
    const reserver = TestBed.inject(RendezVousService).reserver as jasmine.Spy;
    reserver.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await afficher();
    const creneau = fixture.componentInstance.creneaux()[0];
    fixture.componentInstance.selection.set(creneau);
    await afficher();
    expect(texte()).toContain('تأكيد الموعد');
    expect(texte()).toContain('اختيار موعد آخر');

    await fixture.componentInstance.reserver(creneau);
    await afficher();
    expect(texte()).toContain('هذا الموعد لم يعد متاحًا.');
    expect(texte()).not.toContain("n'est plus disponible");
  });

  it('inscription a la liste d attente et refus de la messagerie (403) en arabe', async () => {
    listeAttente.inscrire.and.returnValue(of({ id: 'i1', patientId: 'p1', medecinId: 'm1', inscritLe: '2026-09-18T10:00:00Z' }));
    messagerie.ouvrir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await afficher();

    await fixture.componentInstance.inscrire();
    await afficher();
    expect(texte()).toContain('أنت مسجّل في قائمة انتظار هذا الممارس.');
    expect(texte()).toContain('عرض قوائم انتظاري');

    await fixture.componentInstance.ecrire();
    await afficher();
    expect(texte()).toContain('يجب أن يكون لديك موعد مع هذا الطبيب لمراسلته.');
  });
});
